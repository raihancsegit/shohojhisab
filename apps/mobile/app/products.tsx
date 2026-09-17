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
import VoiceInputField from '../src/components/VoiceInputField';

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const products = vault.products || [];

  const [search, setSearch] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProd, setEditingProd] = useState<ProductItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('50');
  const [unit, setUnit] = useState('পিস');
  const [barcode, setBarcode] = useState('');

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
      setUnit(prodToEdit.unit || 'পিস');
      setBarcode(prodToEdit.barcode || '');
    } else {
      setEditingProd(null);
      setName('');
      setPrice('');
      setCostPrice('');
      setStock('50');
      setUnit('পিস');
      setBarcode('');
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
            unit,
            barcode: barcode.trim() || p.barcode
          };
        }
        return p;
      });
      saveLocalVaultSnapshot(tenant.id, { products: updated });
      refreshVault();
      speakNativeText(`${name} আপডেট হয়েছে`);
    } else {
      const newProd: ProductItem = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        category: tenant.industryId,
        subCategory: selectedSubCat === 'all' ? 'all' : selectedSubCat,
        price: pPrice,
        costPrice: cPrice,
        stock: pStock,
        unit,
        icon: '📦',
        barcode: barcode.trim() || Date.now().toString().slice(-8)
      };

      saveLocalVaultSnapshot(tenant.id, {
        products: [newProd, ...products]
      });
      refreshVault();
      speakNativeText(`নতুন পণ্য ${name} যুক্ত হয়েছে`);
    }

    setShowAddModal(false);
  };

  const handleDeleteProduct = (prod: ProductItem) => {
    Alert.alert('পণ্য মুছবেন?', `"${prod.name}" পণ্যটি ক্যাটালগ থেকে সম্পূর্ণ মুছে ফেলতে চান?`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ, মুছুন',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('medium');
          const updated = products.filter(p => p.id !== prod.id);
          saveLocalVaultSnapshot(tenant.id, { products: updated });
          refreshVault();
          speakNativeText(`${prod.name} মুছে ফেলা হয়েছে`);
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 🔍 Search & Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: primaryColor }]} onPress={() => openAddModal()}>
            <Text style={styles.addBtnText}>+ নতুন পণ্য</Text>
          </TouchableOpacity>
        </View>

        {/* Subcategories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {subcategories.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.catPill,
                selectedSubCat === c.id && { backgroundColor: primaryColor, borderColor: primaryColor }
              ]}
              onPress={() => { triggerHaptic('light'); setSelectedSubCat(c.id); }}
            >
              <Text style={[styles.catPillText, selectedSubCat === c.id && styles.catPillTextActive]}>
                {c.icon} {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 📦 Product List */}
      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: 150 }]}>
        {filtered.map(item => (
          <View
            key={item.id}
            style={[
              styles.card,
              { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
            ]}
          >
            <Text style={styles.prodIcon}>{item.icon || '📦'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.prodName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
              <Text style={styles.prodPrice}>
                বিক্রয়: {formatPrice(item.price)} • কেনা: {formatPrice(item.costPrice || item.price * 0.85)}
              </Text>
              <Text style={styles.prodStock}>স্টক: {item.stock} {item.unit}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                onPress={() => openAddModal(item)}
              >
                <Text style={[styles.editBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>✏️ এডিট</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.delBtn}
                onPress={() => handleDeleteProduct(item)}
              >
                <Text style={styles.delBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ➕ Add/Edit Modal with In-Field Voice */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                {editingProd ? '✏️ পণ্যের তথ্য এডিট' : '➕ নতুন পণ্য যোগ করুন'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <VoiceInputField
                label="পণ্যের নাম *"
                value={name}
                onChangeText={setName}
                placeholder="যেমন: পোলাও চাল ৫ কেজি"
                required
                promptText="পণ্যের নাম মুখে বলুন"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="বিক্রয় মূল্য (৳) *"
                    value={price}
                    onChangeText={setPrice}
                    placeholder="৳ ৬০০"
                    isNumeric
                    keyboardType="numeric"
                    required
                    promptText="বিক্রয় মূল্য কত টাকা বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="ক্রয় মূল্য (৳)"
                    value={costPrice}
                    onChangeText={setCostPrice}
                    placeholder="৳ ৫২০"
                    isNumeric
                    keyboardType="numeric"
                    promptText="কেনা দাম কত টাকা বলুন"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="প্রারম্ভিক স্টক *"
                    value={stock}
                    onChangeText={setStock}
                    placeholder="৫০"
                    isNumeric
                    keyboardType="numeric"
                    promptText="স্টক কত পিস বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="একক (Unit) *"
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="পিস / কেজি / লিটার"
                    promptText="একক বা ইউনিট বলুন"
                  />
                </View>
              </View>

              <VoiceInputField
                label="বারকোড বা প্রোডাক্ট কোড"
                value={barcode}
                onChangeText={setBarcode}
                placeholder="বারকোড স্ক্যান বা কোড লিখুন"
                promptText="বারকোড নম্বর বলুন"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleSaveProduct}>
                <Text style={styles.saveBtnText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: 1, gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5, borderWidth: 1, borderColor: '#cbd5e1' },
  addBtn: { paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  catScroll: { gap: 6 },
  catPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1' },
  catPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  catPillTextActive: { color: '#ffffff', fontWeight: '800' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, gap: 10, elevation: 1 },
  prodIcon: { fontSize: 24 },
  prodName: { fontSize: 13.5, fontWeight: '800' },
  prodPrice: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  prodStock: { fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 1 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  editBtnText: { fontSize: 11, fontWeight: '700' },
  delBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  delBtnText: { fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' }
});
