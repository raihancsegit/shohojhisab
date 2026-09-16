import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../../src/lib/offlineAudioEngine';

export default function KhataScreen() {
  const { tenant, theme, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData(tenant.id);
  const customers = vault.customers || [];

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDue, setInitialDue] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  const totalDue = customers.reduce((acc: number, c: any) => acc + Number(c.totalDue || 0), 0);

  const handleAddCustomer = () => {
    if (!name.trim()) {
      Alert.alert('সতর্কতা', 'কাস্টমারের নাম লিখুন!');
      return;
    }

    const newCust = {
      id: `cust-off-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      totalDue: Number(initialDue) || 0
    };

    saveLocalVaultSnapshot(tenant.id, {
      customers: [newCust, ...customers]
    });

    playNativeChime('success');
    speakAnnouncement(`${newCust.name} এর নতুন খাতা তৈরি হয়েছে`);
    setShowAddModal(false);
    setName('');
    setPhone('');
    setInitialDue('');
  };

  const handleCollectPayment = () => {
    const amt = Number(payAmount);
    if (!showPayModal || isNaN(amt) || amt <= 0) return;

    const updated = customers.map(c => {
      if (c.id === showPayModal.id) {
        const remaining = Math.max(0, Number(c.totalDue || 0) - amt);
        return { ...c, totalDue: remaining };
      }
      return c;
    });

    saveLocalVaultSnapshot(tenant.id, { customers: updated });
    playNativeChime('cash');
    speakAnnouncement(`${showPayModal.name} এর ৳${amt} টাকা জমা গ্রহণ করা হয়েছে`);
    Alert.alert('সফল!', `✓ ৳${amt} টাকা জমা হয়েছে!`);
    setShowPayModal(null);
    setPayAmount('');
  };

  return (
    <View style={styles.container}>
      {/* 📊 Due Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.primaryColor }]}>
        <View>
          <Text style={styles.summaryLabel}>বাজারে মোট বাকি বকেয়া</Text>
          <Text style={styles.summaryValue}>৳{totalDue.toLocaleString('en-US')}</Text>
        </View>
        <TouchableOpacity
          style={styles.addCustBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addCustBtnText}>+ নতুন খাতা</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 কাস্টমারের নাম বা ফোন খুঁজুন..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      {/* 📖 Customer List */}
      <ScrollView style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>কোনো বাকি কাস্টমার পাওয়া যায়নি</Text>
          </View>
        ) : (
          filtered.map(c => (
            <View key={c.id} style={styles.custCard}>
              <View>
                <Text style={styles.custName}>{c.name}</Text>
                <Text style={styles.custPhone}>{c.phone || 'ফোন নম্বর নেই'}</Text>
              </View>
              <View style={styles.rightAction}>
                <Text style={styles.custDue}>৳{c.totalDue || 0}</Text>
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={() => {
                    setShowPayModal(c);
                    setPayAmount('');
                  }}
                >
                  <Text style={styles.payBtnText}>জমা নিন 💵</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ➕ Add Customer Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>নতুন বাকির খাতা তৈরি</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="কাস্টমারের নাম..."
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="মোবাইল নম্বর (ঐচ্ছিক)..."
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="বর্তমান পূর্বের বাকি টাকা (৳)..."
              keyboardType="numeric"
              value={initialDue}
              onChangeText={setInitialDue}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddCustomer}>
                <Text style={styles.modalSaveText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 💵 Payment Collect Modal */}
      <Modal visible={!!showPayModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>জমা গ্রহণ ({showPayModal?.name})</Text>
            <Text style={styles.currentDueText}>বর্তমান বকেয়া: ৳{showPayModal?.totalDue || 0}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="জমার পরিমাণ (৳)..."
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPayModal(null)}>
                <Text style={styles.modalCancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleCollectPayment}>
                <Text style={styles.modalSaveText}>জমা নিন ✓</Text>
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
  summaryCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700'
  },
  summaryValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  addCustBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12
  },
  addCustBtnText: {
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
  custCard: {
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
  custName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a'
  },
  custPhone: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2
  },
  rightAction: {
    alignItems: 'flex-end'
  },
  custDue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#dc2626',
    marginBottom: 6
  },
  payBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  payBtnText: {
    color: '#065f46',
    fontSize: 11.5,
    fontWeight: '800'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8'
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
  currentDueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
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
    marginBottom: 12
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
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
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '800'
  }
});
