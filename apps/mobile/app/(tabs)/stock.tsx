import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../../src/lib/offlineAudioEngine';

export default function StockScreen() {
  const { tenant, theme, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData(tenant.id);
  const products = vault.products || [];

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stock, setStock] = useState('50');
  const [unit, setUnit] = useState(theme.unit || 'পিস');
  const [restockQty, setRestockQty] = useState('');

  const filtered = products.filter(p =>
    (p.banglaName || p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalStockCount = products.reduce((acc: number, p: any) => acc + Number(p.stock || 0), 0);
  const lowStockCount = products.filter(p => Number(p.stock || 0) <= 5).length;

  const handleAddProduct = () => {
    if (!name.trim() || !sellingPrice) {
      Alert.alert('সতর্কতা', 'পণ্যের নাম ও বিক্রয় মূল্য দিন!');
      return;
    }

    const newProd = {
      id: `p-off-${Date.now()}`,
      name: name.trim(),
      banglaName: name.trim(),
      sellingPrice: Number(sellingPrice) || 0,
      purchasePrice: Number(purchasePrice) || 0,
      stock: Number(stock) || 0,
      unit
    };

    saveLocalVaultSnapshot(tenant.id, {
      products: [newProd, ...products]
    });

    playNativeChime('success');
    speakAnnouncement(`নতুন পণ্য ${newProd.banglaName} স্টকে যুক্ত হয়েছে`);
    setShowAddModal(false);
    setName('');
    setSellingPrice('');
    setPurchasePrice('');
  };

  const handleRestock = () => {
    const qty = Number(restockQty);
    if (!showRestockModal || isNaN(qty) || qty <= 0) return;

    const updated = products.map(p => {
      if (p.id === showRestockModal.id) {
        return { ...p, stock: Number(p.stock || 0) + qty };
      }
      return p;
    });

    saveLocalVaultSnapshot(tenant.id, { products: updated });
    playNativeChime('success');
    speakAnnouncement(`${showRestockModal.banglaName || showRestockModal.name} এ ${qty} ${showRestockModal.unit || 'পিস'} মাল তোলা হয়েছে`);
    Alert.alert('সফল!', `✓ +${qty} নতুন মাল স্টকে যোগ হয়েছে!`);
    setShowRestockModal(null);
    setRestockQty('');
  };

  return (
    <View style={styles.container}>
      {/* 📦 Stock Metric Header */}
      <View style={[styles.headerCard, { backgroundColor: theme.primaryColor }]}>
        <View>
          <Text style={styles.headerLabel}>মোট পণ্য ও স্টক সংখ্যা</Text>
          <Text style={styles.headerValue}>{totalStockCount} {theme.unit} ({products.length} প্রকার)</Text>
          {lowStockCount > 0 && (
            <Text style={styles.lowStockWarning}>⚠️ {lowStockCount}টি পণ্যের স্টক কম!</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ নতুন মাল</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 পণ্যের নাম দিয়ে স্টক খুঁজুন..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      {/* 📦 Products Table List */}
      <ScrollView style={styles.list}>
        {filtered.map(p => (
          <View key={p.id} style={styles.itemCard}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{p.banglaName || p.name}</Text>
              <Text style={styles.itemPrice}>বিক্রি: ৳{p.sellingPrice} | কেনা: ৳{p.purchasePrice || 0}</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.itemStock, { color: Number(p.stock || 0) <= 5 ? '#dc2626' : '#059669' }]}>
                {p.stock} {p.unit || 'পিস'}
              </Text>
              <TouchableOpacity
                style={styles.restockBtn}
                onPress={() => {
                  setShowRestockModal(p);
                  setRestockQty('');
                }}
              >
                <Text style={styles.restockBtnText}>+ মাল তুলুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ➕ Add Product Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>নতুন পণ্য স্টকে যুক্ত করুন</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="পণ্যের বাংলা নাম (যেমন: নাপা এক্সট্রা)..."
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="বিক্রয় মূল্য (৳)..."
              keyboardType="numeric"
              value={sellingPrice}
              onChangeText={setSellingPrice}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="ক্রয় মূল্য (৳)..."
              keyboardType="numeric"
              value={purchasePrice}
              onChangeText={setPurchasePrice}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="প্রাথমিক স্টক সংখ্যা..."
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="একক (কেজি, পাতা, পিস, লিটার)..."
              value={unit}
              onChangeText={setUnit}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddProduct}>
                <Text style={styles.modalSaveText}>যুক্ত করুন ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📦 Restock Modal */}
      <Modal visible={!!showRestockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>নতুন মাল তোলা ({showRestockModal?.banglaName || showRestockModal?.name})</Text>
            <Text style={styles.currentStockText}>বর্তমান স্টক: {showRestockModal?.stock} {showRestockModal?.unit || 'পিস'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="কতটুকু মাল যোগ করবেন..."
              keyboardType="numeric"
              value={restockQty}
              onChangeText={setRestockQty}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRestockModal(null)}>
                <Text style={styles.modalCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleRestock}>
                <Text style={styles.modalSaveText}>যোগ করুন +</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 14,
    paddingBottom: 90
  },
  headerCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700'
  },
  headerValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2
  },
  lowStockWarning: {
    color: '#fef08a',
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 4
  },
  addBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12
  },
  list: {
    flex: 1
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemLeft: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  itemPrice: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2
  },
  itemRight: {
    alignItems: 'flex-end'
  },
  itemStock: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6
  },
  restockBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8
  },
  restockBtnText: {
    color: '#1d4ed8',
    fontSize: 11.5,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14
  },
  currentStockText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 10
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    marginBottom: 10
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  modalCancel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalCancelText: {
    color: '#64748b',
    fontWeight: '700'
  },
  modalSave: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
