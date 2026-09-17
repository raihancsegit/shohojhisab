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
import VoiceInputField from '../../src/components/VoiceInputField';

type StockFilter = 'all' | 'low' | 'out';

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  
  // Modals
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // Restock Form
  const [addStockQty, setAddStockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');

  // Add Product Form
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newStock, setNewStock] = useState('50');
  const [newUnit, setNewUnit] = useState('পিস');
  const [newBarcode, setNewBarcode] = useState('');

  // Edit Product Form
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editUnit, setEditUnit] = useState('');

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const catalog = INDUSTRY_CATALOGS[tenant.industryId] || INDUSTRY_CATALOGS['cat-grocery'];
  const subcategories = catalog.subcategories;

  const totalStockItems = vault.products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockValuation = vault.products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const lowStockCount = vault.products.filter(p => (p.stock || 0) <= 5).length;

  const filteredProducts = useMemo(() => {
    return vault.products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
      const matchesCat = selectedSubCat === 'all' || p.subCategory === selectedSubCat;
      const curStock = p.stock || 0;
      
      let matchesFilter = true;
      if (stockFilter === 'low') matchesFilter = curStock > 0 && curStock <= 10;
      if (stockFilter === 'out') matchesFilter = curStock <= 0;

      return matchesSearch && matchesCat && matchesFilter;
    });
  }, [vault.products, searchQuery, selectedSubCat, stockFilter]);

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
      Alert.alert('ভয়েস স্টক আপডেট ✅', msg);
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
        return {
          ...p,
          stock: p.stock + qty,
          costPrice: restockCost ? Number(restockCost) : p.costPrice
        };
      }
      return p;
    });

    saveLocalVaultSnapshot(tenant.id, { products: updated });
    setShowRestockModal(false);
    setAddStockQty('');
    setRestockCost('');
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
      costPrice: Number(newCostPrice) || Math.round(Number(newPrice) * 0.85),
      stock: Number(newStock) || 0,
      unit: newUnit || 'পিস',
      icon: '📦',
      barcode: newBarcode.trim() || Date.now().toString().slice(-8)
    };

    saveLocalVaultSnapshot(tenant.id, {
      products: [newProd, ...vault.products]
    });

    setNewName('');
    setNewPrice('');
    setNewCostPrice('');
    setNewStock('50');
    setNewUnit('পিস');
    setNewBarcode('');
    setShowAddProductModal(false);
    refreshVault();
    speakAnnouncement(`নতুন পণ্য ${newProd.name} যুক্ত হয়েছে`);
  };

  // Open Edit Product Modal
  const openEditProduct = (prod: ProductItem) => {
    setSelectedProduct(prod);
    setEditName(prod.name);
    setEditPrice(String(prod.price));
    setEditCostPrice(String(prod.costPrice || ''));
    setEditStock(String(prod.stock));
    setEditUnit(prod.unit || 'পিস');
    setShowEditProductModal(true);
    triggerHaptic('light');
  };

  // Handle Edit Product
  const handleEditProduct = () => {
    if (!selectedProduct || !editName.trim()) return;
    triggerHaptic('success');

    const updated = vault.products.map(p => {
      if (p.id === selectedProduct.id) {
        return {
          ...p,
          name: editName.trim(),
          price: Number(editPrice) || p.price,
          costPrice: Number(editCostPrice) || p.costPrice,
          stock: Number(editStock) || p.stock,
          unit: editUnit.trim() || p.unit
        };
      }
      return p;
    });

    saveLocalVaultSnapshot(tenant.id, { products: updated });
    setShowEditProductModal(false);
    refreshVault();
    speakAnnouncement(`${editName} এর তথ্য আপডেট করা হয়েছে`);
  };

  // Handle Delete Product
  const handleDeleteProduct = (prod: ProductItem) => {
    Alert.alert(
      'পণ্য মুছে ফেলবেন?',
      `"${prod.name}" পণ্যটি স্টক থেকে সম্পূর্ণ মুছে ফেলা হবে। আপনি কি নিশ্চিত?`,
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'হ্যাঁ, মুছুন',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            const updated = vault.products.filter(p => p.id !== prod.id);
            saveLocalVaultSnapshot(tenant.id, { products: updated });
            refreshVault();
            speakAnnouncement(`${prod.name} মুছে ফেলা হয়েছে`);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Top Stock Valuation Summary */}
      <View style={[styles.topSummaryCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summarySub}>দোকানের মোট পণ্যের মূল্য</Text>
            <Text style={styles.summaryTotal}>{formatPrice(totalStockValuation)}</Text>
            <Text style={styles.summaryCount}>মোট {vault.products.length} প্রকার পণ্য</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summarySub}>মোট কোয়ান্টিটি</Text>
            <Text style={styles.summaryQty}>{totalStockItems} একক</Text>
            {lowStockCount > 0 && (
              <View style={styles.lowAlertBadge}>
                <Text style={styles.lowAlertText}>⚠️ {lowStockCount} টি স্টক কম</Text>
              </View>
            )}
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
            placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
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

        {/* 🏷️ Filter Pills (All / Low Stock / Out of Stock) */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, stockFilter === 'all' && { backgroundColor: primaryColor }]}
            onPress={() => { triggerHaptic('light'); setStockFilter('all'); }}
          >
            <Text style={[styles.filterPillText, stockFilter === 'all' && styles.filterPillTextActive]}>
              সব পণ্য ({vault.products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, stockFilter === 'low' && { backgroundColor: '#ea580c' }]}
            onPress={() => { triggerHaptic('light'); setStockFilter('low'); }}
          >
            <Text style={[styles.filterPillText, stockFilter === 'low' && styles.filterPillTextActive]}>
              ⚠️ কম স্টক ({lowStockCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, stockFilter === 'out' && { backgroundColor: '#dc2626' }]}
            onPress={() => { triggerHaptic('light'); setStockFilter('out'); }}
          >
            <Text style={[styles.filterPillText, stockFilter === 'out' && styles.filterPillTextActive]}>
              ❌ স্টক শেষ
            </Text>
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
          const isLow = item.stock <= 5;
          const isZero = item.stock <= 0;
          return (
            <View style={[styles.stockCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={styles.prodIcon}>{item.icon || '📦'}</Text>
              
              <View style={{ flex: 1 }}>
                <Text style={[styles.prodName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
                <Text style={styles.prodPrice}>
                  বিক্রি: {formatPrice(item.price)} • কেনা: {formatPrice(item.costPrice || item.price * 0.85)}
                </Text>
                {item.barcode ? (
                  <Text style={styles.barcodeText}>ক্লিক / বারকোড: {item.barcode}</Text>
                ) : null}
              </View>

              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[styles.stockBadge, isZero ? styles.stockZero : isLow ? styles.stockLow : styles.stockOk]}>
                  <Text style={[styles.stockBadgeText, isZero ? styles.stockZeroText : isLow ? styles.stockLowText : styles.stockOkText]}>
                    স্টক: {item.stock} {item.unit}
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                    onPress={() => openEditProduct(item)}
                  >
                    <Text style={[styles.editBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>✏️ এডিট</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.restockBtn, { backgroundColor: primaryColor }]}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedProduct(item);
                      setAddStockQty('');
                      setRestockCost(String(item.costPrice || ''));
                      setShowRestockModal(true);
                    }}
                  >
                    <Text style={styles.restockBtnText}>+ স্টক</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* 📥 Restock (মাল তুলুন) Modal with In-Field Voice */}
      <Modal visible={showRestockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              📥 নতুন স্টক যোগ: {selectedProduct?.name}
            </Text>
            <Text style={styles.modalSub}>
              বর্তমানে দোকানে আছে: {selectedProduct?.stock} {selectedProduct?.unit}
            </Text>

            <VoiceInputField
              label="নতুন যোগ করার পরিমাণ *"
              value={addStockQty}
              onChangeText={setAddStockQty}
              placeholder="যেমন: ৫০"
              isNumeric
              keyboardType="numeric"
              required
              promptText="কত পিস বা কেজি স্টক যোগ করবেন মুখে বলুন"
            />

            <VoiceInputField
              label="ক্রয়মূল্য প্রতি একক (৳)"
              value={restockCost}
              onChangeText={setRestockCost}
              placeholder={String(selectedProduct?.costPrice || '৳ ১৩০')}
              isNumeric
              keyboardType="numeric"
              promptText="নতুন কেনা দাম কত টাকা মুখে বলুন"
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

      {/* ➕ Add Product Modal with in-field voice buttons */}
      <Modal visible={showAddProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>➕ নতুন পণ্য যোগ করুন</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <VoiceInputField
                label="পণ্যের নাম *"
                value={newName}
                onChangeText={setNewName}
                placeholder="যেমন: মসুর ডাল (চিকন)"
                required
                promptText="পণ্যের নাম মুখে বলুন"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="বিক্রয় মূল্য (৳) *"
                    value={newPrice}
                    onChangeText={setNewPrice}
                    placeholder="৳ ১৫০"
                    isNumeric
                    keyboardType="numeric"
                    required
                    promptText="বিক্রয় মূল্য কত টাকা বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="ক্রয় মূল্য / কেনা দাম (৳)"
                    value={newCostPrice}
                    onChangeText={setNewCostPrice}
                    placeholder="৳ ১৩০"
                    isNumeric
                    keyboardType="numeric"
                    promptText="ক্রয় মূল্য কত টাকা বলুন"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="প্রারম্ভিক স্টক *"
                    value={newStock}
                    onChangeText={setNewStock}
                    placeholder="৫০"
                    isNumeric
                    keyboardType="numeric"
                    promptText="স্টক কত পিস বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="একক (Unit) *"
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholder="কেজি / লিটার / পিস"
                    promptText="একক বা ইউনিট বলুন"
                  />
                </View>
              </View>

              <VoiceInputField
                label="বারকোড বা প্রোডাক্ট কোড"
                value={newBarcode}
                onChangeText={setNewBarcode}
                placeholder="স্ক্যান করুন বা কোড লিখুন"
                promptText="বারকোড মুখে বলুন"
              />
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

      {/* ✏️ Edit Product Modal */}
      <Modal visible={showEditProductModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>✏️ পণ্যের তথ্য এডিট</Text>
              {selectedProduct && (
                <TouchableOpacity onPress={() => { setShowEditProductModal(false); handleDeleteProduct(selectedProduct); }}>
                  <Text style={{ color: '#dc2626', fontWeight: '800', fontSize: 12 }}>🗑️ ডিলিট</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <VoiceInputField
                label="পণ্যের নাম *"
                value={editName}
                onChangeText={setEditName}
                placeholder="পণ্যের নাম"
                required
                promptText="পণ্যের নতুন নাম মুখে বলুন"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="বিক্রয় মূল্য (৳) *"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    isNumeric
                    keyboardType="numeric"
                    required
                    promptText="বিক্রয় মূল্য বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="ক্রয় মূল্য (৳)"
                    value={editCostPrice}
                    onChangeText={setEditCostPrice}
                    isNumeric
                    keyboardType="numeric"
                    promptText="ক্রয় মূল্য বলুন"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="বর্তমান স্টক *"
                    value={editStock}
                    onChangeText={setEditStock}
                    isNumeric
                    keyboardType="numeric"
                    promptText="স্টকের পরিমাণ বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="একক (Unit) *"
                    value={editUnit}
                    onChangeText={setEditUnit}
                    promptText="একক বলুন"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditProductModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleEditProduct}>
                <Text style={styles.saveBtnText}>আপডেট সংরক্ষণ</Text>
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
  summaryCount: { fontSize: 11, color: '#e0e7ff', marginTop: 2, fontWeight: '600' },
  summaryQty: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  lowAlertBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  lowAlertText: { color: '#dc2626', fontSize: 10, fontWeight: '800' },
  actionSection: { padding: 10, borderBottomWidth: 1 },
  voiceRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12 },
  voiceBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBar: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5 },
  addBtn: { paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12.5 },
  filterRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#e2e8f0' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff', fontWeight: '800' },
  catScrollWrap: { paddingVertical: 8 },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catPillText: { fontSize: 11.5, fontWeight: '600' },
  listContainer: { padding: 12, gap: 8 },
  stockCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, gap: 10, elevation: 1 },
  prodIcon: { fontSize: 24 },
  prodName: { fontSize: 13.5, fontWeight: '800' },
  prodPrice: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  barcodeText: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockBadgeText: { fontSize: 10.5, fontWeight: '700' },
  stockOk: { backgroundColor: '#dcfce7' },
  stockOkText: { color: '#15803d', fontSize: 10.5, fontWeight: '700' },
  stockLow: { backgroundColor: '#ffedd5' },
  stockLowText: { color: '#c2410c', fontSize: 10.5, fontWeight: '800' },
  stockZero: { backgroundColor: '#fee2e2' },
  stockZeroText: { color: '#dc2626', fontSize: 10.5, fontWeight: '800' },
  editBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  editBtnText: { fontSize: 10.5, fontWeight: '700' },
  restockBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  restockBtnText: { color: '#ffffff', fontSize: 10.5, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' }
});
