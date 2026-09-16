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
import { useAuth } from '../../src/context/AuthContext';
import {
  getLocalVaultData,
  saveLocalVaultSnapshot,
  INDUSTRY_CATALOGS,
  ProductItem
} from '../../src/lib/offlineDataVault';

export default function StockScreen() {
  const { tenant, theme, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

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
    <View style={styles.container}>
      {/* 📊 Top Stock Valuation Summary */}
      <View style={[styles.topSummaryCard, { backgroundColor: theme.primary }]}>
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

      {/* 🔍 Search & Add Bar */}
      <View style={styles.actionRow}>
        <TextInput
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 স্টক বা পণ্য খুঁজুন..."
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            triggerHaptic('light');
            setShowAddProductModal(true);
          }}
        >
          <Text style={styles.addBtnText}>+ পণ্য</Text>
        </TouchableOpacity>
      </View>

      {/* 🏷️ Subcategory Filter */}
      <View style={styles.catScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {subcategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catPill, selectedSubCat === cat.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => {
                triggerHaptic('light');
                setSelectedSubCat(cat.id);
              }}
            >
              <Text style={[styles.catPillText, selectedSubCat === cat.id && { color: '#ffffff', fontWeight: '800' }]}>
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
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const isLow = item.stock < 10;
          return (
            <View style={styles.stockCard}>
              <Text style={styles.prodIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{item.name}</Text>
                <Text style={styles.prodPrice}>বিক্রি: {formatPrice(item.price)} • কেনা: {formatPrice(item.costPrice)}</Text>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.stockBadge, isLow ? styles.stockLow : styles.stockOk]}>
                  <Text style={[styles.stockBadgeText, isLow ? styles.stockLowText : styles.stockOkText]}>
                    স্টক: {item.stock} {item.unit}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.restockBtn, { backgroundColor: theme.primary }]}
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

      {/* ➕ Restock Modal */}
      <Modal visible={showRestockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন স্টক যোগ করুন</Text>
              <TouchableOpacity onPress={() => setShowRestockModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailName}>{selectedProduct?.name}</Text>
              <Text style={styles.detailSub}>বর্তমান স্টক: {selectedProduct?.stock} {selectedProduct?.unit}</Text>
            </View>

            <Text style={styles.inputLabel}>নতুন চালানের সংখ্যা ({selectedProduct?.unit}):</Text>
            <TextInput
              style={styles.formInputLarge}
              keyboardType="numeric"
              value={addStockQty}
              onChangeText={setAddStockQty}
              placeholder="যেমন: ২০"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleRestock}>
              <Text style={styles.confirmBtnText}>✓ স্টক আপডেট ও নিশ্চিত করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 📦 Add New Product Modal */}
      <Modal visible={showAddProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন পণ্য তৈরি করুন</Text>
              <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>পণ্যের নাম *:</Text>
              <TextInput style={styles.formInput} value={newName} onChangeText={setNewName} placeholder="যেমন: রূপচাঁদা সরিষার তেল ১ লিটার" />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>বিক্রয় মূল্য (টাকা) *:</Text>
                  <TextInput style={styles.formInput} keyboardType="numeric" value={newPrice} onChangeText={setNewPrice} placeholder="যেমন: ২০০" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>কেনা মূল্য (টাকা):</Text>
                  <TextInput style={styles.formInput} keyboardType="numeric" value={newCostPrice} onChangeText={setNewCostPrice} placeholder="যেমন: ১৭৫" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>শুরুর স্টক:</Text>
                  <TextInput style={styles.formInput} keyboardType="numeric" value={newStock} onChangeText={setNewStock} placeholder="যেমন: ৫০" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>একক (Unit):</Text>
                  <TextInput style={styles.formInput} value={newUnit} onChangeText={setNewUnit} placeholder="কেজি / লিটার / পিস" />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleAddProduct}>
              <Text style={styles.confirmBtnText}>+ পণ্য ইনভেন্টরিতে সংরক্ষণ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topSummaryCard: { padding: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summarySub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '600' },
  summaryTotal: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 2 },
  summaryQty: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 2 },
  actionRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchBar: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, height: 42, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a' },
  addBtn: { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  catScrollWrap: { backgroundColor: '#ffffff', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  catScroll: { paddingHorizontal: 12, gap: 6 },
  catPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  catPillText: { fontSize: 11.5, color: '#475569', fontWeight: '600' },
  listContainer: { padding: 12, paddingBottom: 90 },
  stockCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1, gap: 10 },
  prodIcon: { fontSize: 24 },
  prodName: { fontSize: 13.5, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  prodPrice: { fontSize: 11.5, color: '#64748b' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockOk: { backgroundColor: '#dcfce7' },
  stockLow: { backgroundColor: '#fee2e2' },
  stockBadgeText: { fontSize: 10.5, fontWeight: '800' },
  stockOkText: { color: '#15803d' },
  stockLowText: { color: '#dc2626' },
  restockBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  restockBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '82%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  closeBtn: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  detailBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  detailName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  detailSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 },
  formInputLarge: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '900' }
});
