import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import {
  getLocalVaultData,
  saveLocalVaultSnapshot,
  INDUSTRY_CATALOGS,
  ProductItem
} from '../../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../../src/lib/offlineAudioEngine';

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // Restock Form
  const [addStockQty, setAddStockQty] = useState('');

  // Add Product Form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newUnit, setNewUnit] = useState('কেজি');

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const catalog = INDUSTRY_CATALOGS[tenant.industryId] || INDUSTRY_CATALOGS['cat-grocery'];
  const subcategories = catalog.subcategories;

  const totalStockItems = vault.products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockValuation = vault.products.reduce((acc, p) => acc + (p.stock * p.price), 0);

  const filteredProducts = useMemo(() => {
    return vault.products.filter(p => {
      const matchesSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedSubCat === 'all' || p.subCategory === selectedSubCat;
      return matchesSearch && matchesCat;
    });
  }, [vault.products, searchQuery, selectedSubCat]);

  // Voice Stock Action
  const handleVoiceStockSubmit = () => {
    const text = voiceText.trim();
    if (!text) return;

    triggerHaptic('medium');
    playNativeChime('beep');

    const numMatch = text.match(/(\d+)/);
    const qty = numMatch ? parseInt(numMatch[1], 10) : 10;
    const match = vault.products.find(p => text.includes(p.name) || p.name.includes(text.split(' ')[0]));

    if (match) {
      const updated = vault.products.map(p => {
        if (p.id === match.id) {
          return { ...p, stock: p.stock + qty };
        }
        return p;
      });
      saveLocalVaultSnapshot(tenant.id, { products: updated });
      refreshVault();
      setVoiceText('');
      const msg = `${match.name} এ ${qty} ${match.unit} স্টক যোগ করা হয়েছে`;
      speakNativeText(msg);
      Alert.alert('ভয়েস স্টক আপডেট', msg);
    } else {
      setSearchQuery(text);
      setVoiceText('');
      speakNativeText(`${text} সার্চ করা হয়েছে`);
    }
  };

  // Handle Restock
  const handleRestock = () => {
    const qty = Number(addStockQty);
    if (!selectedProduct || isNaN(qty) || qty <= 0) {
      Alert.alert('ভুল', 'সঠিক স্টকের সংখ্যা দিন');
      return;
    }

    triggerHaptic('success');
    const updated = vault.products.map(p => {
      if (p.id === selectedProduct.id) {
        return { ...p, stock: p.stock + qty };
      }
      return p;
    });

    saveLocalVaultSnapshot(tenant.id, { products: updated });
    setShowRestockModal(false);
    setAddStockQty('');
    refreshVault();
    speakAnnouncement(`${selectedProduct.name} এ ${qty} ${selectedProduct.unit} নতুন স্টক যোগ হয়েছে`);
  };

  // Handle Add Product
  const handleAddProduct = () => {
    if (!newName.trim() || !newPrice.trim()) {
      Alert.alert('ভুল', 'পণ্যের নাম ও বিক্রয় মূল্য লিখুন');
      return;
    }

    triggerHaptic('success');
    const newProd: ProductItem = {
      id: 'prod-' + Date.now(),
      name: newName.trim(),
      category: tenant.industryId,
      subCategory: 'all',
      price: Number(newPrice) || 0,
      costPrice: Number(newCostPrice) || Number(newPrice) * 0.85,
      stock: Number(newStock) || 0,
      unit: newUnit,
      icon: '📦',
      barcode: Date.now().toString().slice(-8)
    };

    saveLocalVaultSnapshot(tenant.id, {
      products: [newProd, ...vault.products]
    });

    setNewName('');
    setNewPrice('');
    setNewCostPrice('');
    setNewStock('');
    setShowAddProductModal(false);
    refreshVault();
    speakAnnouncement(`নতুন পণ্য ${newProd.name} যুক্ত হয়েছে`);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Top Stock Valuation Summary */}
      <View style={[styles.topSummaryCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summarySub}>দোকানের মোট পণ্যের মূল্য</Text>
            <Text style={styles.summaryTotal}>{formatPrice(totalStockValuation)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summarySub}>মোট কোয়ান্টিটি</Text>
            <Text style={styles.summaryQty}>{totalStockItems} একক</Text>
          </View>
        </View>
      </View>

      {/* 🎙️ Voice Stock & Search Bar */}
      <View style={[styles.actionSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.voiceRow}>
          <TextInput
            style={[styles.voiceInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="🎙️ ভয়েস স্টক (যেমন: নাপা ৫০ পাতা স্টক যোগ)..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleVoiceStockSubmit}
          />
          <TouchableOpacity style={[styles.voiceBtn, { backgroundColor: primaryColor }]} onPress={handleVoiceStockSubmit}>
            <Text style={styles.voiceBtnText}>যোগ ▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchBar, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="🔍 পণ্য বা ক্যাটাগরি খুঁজুন..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: primaryColor }]}
            onPress={() => {
              triggerHaptic('light');
              setShowAddProductModal(true);
            }}
          >
            <Text style={styles.addBtnText}>+ নতুন পণ্য</Text>
          </TouchableOpacity>
        </View>
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

      {/* 📦 Product Stock List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isLow = item.stock < 10;
          return (
            <View style={[styles.stockCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.prodIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prodName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
                <Text style={styles.prodPrice}>বিক্রি: {formatPrice(item.price)} • কেনা: {formatPrice(item.costPrice)}</Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.stockBadge, isLow ? styles.stockLow : styles.stockOk]}>
                  <Text style={[styles.stockBadgeText, isLow ? styles.stockLowText : styles.stockOkText]}>
                    স্টক: {item.stock} {item.unit}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.restockBtn, { backgroundColor: primaryColor }]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedProduct(item);
                    setShowRestockModal(true);
                  }}
                >
                  <Text style={styles.restockBtnText}>+ স্টক যোগ</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* 📥 Restock Modal */}
      <Modal visible={showRestockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              স্টক বৃদ্ধি করুন: {selectedProduct?.name}
            </Text>
            <Text style={styles.modalSub}>বর্তমানে আছে: {selectedProduct?.stock} {selectedProduct?.unit}</Text>

            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যোগ করার পরিমাণ (যেমন: ২০)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={addStockQty}
              onChangeText={setAddStockQty}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRestockModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleRestock}>
                <Text style={styles.saveBtnText}>স্টক আপডেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ➕ Add Product Modal */}
      <Modal visible={showAddProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>নতুন পণ্য যোগ করুন</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <Text style={styles.inputLabel}>পণ্যের নাম *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                placeholder="যেমন: মসুর ডাল"
                placeholderTextColor="#94a3b8"
                value={newName}
                onChangeText={setNewName}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>বিক্রয় মূল্য *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="৳ ১৫০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>ক্রয় মূল্য (কেনা দাম)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="৳ ১৩০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={newCostPrice}
                    onChangeText={setNewCostPrice}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>প্রারম্ভিক স্টক</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="যেমন: ৫০"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={newStock}
                    onChangeText={setNewStock}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>একক (Unit)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                    placeholder="কেজি / লিটার / পিস"
                    placeholderTextColor="#94a3b8"
                    value={newUnit}
                    onChangeText={setNewUnit}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddProductModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleAddProduct}>
                <Text style={styles.saveBtnText}>পণ্য সংরক্ষণ</Text>
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
  topSummaryCard: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summarySub: { fontSize: 11.5, color: '#e0e7ff', fontWeight: '600' },
  summaryTotal: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  summaryQty: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  actionSection: { padding: 10, borderBottomWidth: 1 },
  voiceRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12 },
  voiceBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBar: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5 },
  addBtn: { paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12.5 },
  catScrollWrap: { paddingVertical: 8 },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catPillText: { fontSize: 11.5, fontWeight: '600' },
  listContainer: { padding: 12, gap: 8 },
  stockCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, gap: 10, elevation: 1 },
  prodIcon: { fontSize: 24 },
  prodName: { fontSize: 13.5, fontWeight: '800' },
  prodPrice: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockOk: { backgroundColor: '#dcfce7' },
  stockOkText: { color: '#15803d', fontSize: 10.5, fontWeight: '700' },
  stockLow: { backgroundColor: '#fee2e2' },
  stockLowText: { color: '#dc2626', fontSize: 10.5, fontWeight: '800' },
  restockBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  restockBtnText: { color: '#ffffff', fontSize: 10.5, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' }
});
