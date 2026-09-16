import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot, ProductItem, INDUSTRY_CATALOGS } from '../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, formatPrice, refreshVault } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const vault = getLocalVaultData(tenant.id, tenant.industryId);
  const products = vault.products || [];

  const [search, setSearch] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProd, setEditingProd] = useState<ProductItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('কেজি');

  const catalog = INDUSTRY_CATALOGS[tenant.industryId] || INDUSTRY_CATALOGS['cat-grocery'];
  const subcategories = catalog.subcategories;

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode || '').includes(q);
      const matchesCat = selectedSubCat === 'all' || p.subCategory === selectedSubCat;
      return matchesSearch && matchesCat;
    });
  }, [products, search, selectedSubCat]);

  const openAddModal = (prodToEdit?: ProductItem) => {
    triggerHaptic('light');
    if (prodToEdit) {
      setEditingProd(prodToEdit);
      setName(prodToEdit.name);
      setPrice(String(prodToEdit.price));
      setCostPrice(String(prodToEdit.costPrice || ''));
      setStock(String(prodToEdit.stock));
      setUnit(prodToEdit.unit || 'কেজি');
    } else {
      setEditingProd(null);
      setName('');
      setPrice('');
      setCostPrice('');
      setStock('');
      setUnit('কেজি');
    }
    setShowAddModal(true);
  };

  const handleSaveProduct = () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('ভুল', 'পণ্যের নাম ও বিক্রয় মূল্য লিখুন');
      return;
    }

    triggerHaptic('success');
    const pPrice = Number(price) || 0;
    const cPrice = Number(costPrice) || Math.round(pPrice * 0.85);
    const pStock = Number(stock) || 0;

    if (editingProd) {
      const updated = products.map(p => {
        if (p.id === editingProd.id) {
          return {
            ...p,
            name: name.trim(),
            price: pPrice,
            costPrice: cPrice,
            stock: pStock,
            unit
          };
        }
        return p;
      });
      saveLocalVaultSnapshot(tenant.id, { products: updated });
      speakNativeText(`${name} আপডেট হয়েছে`);
    } else {
      const newProd: ProductItem = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        category: tenant.industryId,
        subCategory: 'all',
        price: pPrice,
        costPrice: cPrice,
        stock: pStock,
        unit,
        icon: '📦',
        barcode: Date.now().toString().slice(-8)
      };
      saveLocalVaultSnapshot(tenant.id, { products: [newProd, ...products] });
      speakNativeText(`নতুন পণ্য ${name} যোগ হয়েছে`);
    }

    refreshVault();
    playNativeChime('cash');
    setShowAddModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Top Product Summary Banner */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>দোকানের মোট পণ্য ক্যাটালগ</Text>
            <Text style={styles.headerValue}>{products.length} প্রকার পণ্য</Text>
          </View>
          <TouchableOpacity style={styles.addTopBtn} onPress={() => openAddModal()}>
            <Text style={styles.addTopBtnText}>+ নতুন পণ্য</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔍 Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.search, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          placeholder="🔍 পণ্য বা বারকোড দিয়ে খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* 🏷️ Subcategory Filter */}
      <View style={[styles.catScrollWrap, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {subcategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catPill,
                { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? '#334155' : '#e2e8f0' },
                selectedSubCat === cat.id && { backgroundColor: primaryColor, borderColor: primaryColor }
              ]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedSubCat(cat.id);
              }}
            >
              <Text style={[styles.catPillText, { color: isDark ? '#cbd5e1' : '#475569' }, selectedSubCat === cat.id && { color: '#ffffff', fontWeight: '800' }]}>
                {cat.icon} {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 📦 Product List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map(p => {
          const isLow = p.stock < (p.lowStockThreshold || 10);
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.card,
                { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
              ]}
              onPress={() => openAddModal(p)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIcon}>{p.icon || '📦'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{p.name}</Text>
                <View style={styles.stockRow}>
                  <View style={[styles.stockBadge, isLow ? styles.stockLow : styles.stockOk]}>
                    <Text style={[styles.stockBadgeText, isLow ? styles.stockLowText : styles.stockOkText]}>
                      স্টক: {p.stock} {p.unit || 'পিস'}
                    </Text>
                  </View>
                  <Text style={styles.barcodeText}>🏷️ {p.barcode || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.right}>
                <Text style={[styles.price, { color: primaryColor }]}>{formatPrice(p.price)}</Text>
                <Text style={styles.cost}>কেনা: {formatPrice(p.costPrice || 0)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ➕ Add / Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                {editingProd ? 'পণ্য সংশোধন করুন' : 'নতুন পণ্য যোগ করুন'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.inputLabel}>পণ্যের নাম *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                placeholder="যেমন: চিনি"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>বিক্রয় মূল্য *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="৳ ১৩৫"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>ক্রয় মূল্য (কেনা দাম)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="৳ ১২০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={costPrice}
                    onChangeText={setCostPrice}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>বর্তমান স্টক</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="যেমন: ৩০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={stock}
                    onChangeText={setStock}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>একক (Unit)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="কেজি / লিটার / পিস"
                    placeholderTextColor="#94a3b8"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: primaryColor }]}
              onPress={handleSaveProduct}
            >
              <Text style={styles.saveBtnText}>
                {editingProd ? '✓ তথ্য আপডেট করুন' : '✓ পণ্য সংরক্ষণ করুন'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { color: '#e0e7ff', fontSize: 11.5, fontWeight: '600' },
  headerValue: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 2 },
  addTopBtn: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addTopBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 12.5 },
  searchSection: { padding: 10, borderBottomWidth: 1 },
  search: { borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 13, fontWeight: '600' },
  catScrollWrap: { paddingVertical: 8 },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catPillText: { fontSize: 11.5, fontWeight: '600' },
  list: { flex: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 1 },
  cardIcon: { fontSize: 26 },
  name: { fontSize: 13.5, fontWeight: '800' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  stockBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockOk: { backgroundColor: '#dcfce7' },
  stockOkText: { color: '#15803d', fontSize: 10, fontWeight: '700' },
  stockLow: { backgroundColor: '#fee2e2' },
  stockLowText: { color: '#dc2626', fontSize: 10, fontWeight: '800' },
  barcodeText: { fontSize: 10.5, color: '#94a3b8' },
  right: { alignItems: 'flex-end' },
  price: { fontSize: 14.5, fontWeight: '900' },
  cost: { fontSize: 11, color: '#64748b', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 18 },
  modalCard: { borderRadius: 20, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  closeBtn: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, fontWeight: '600' },
  saveBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }
});
