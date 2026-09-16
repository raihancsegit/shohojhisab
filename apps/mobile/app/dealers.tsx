import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot, VaultDealer } from '../src/lib/offlineDataVault';

export default function DealersScreen() {
  const { tenant, theme, triggerHaptic, formatPrice, speakAnnouncement } = useAuth();
  const router = useRouter();
  const vault = getLocalVaultData();
  const [dealers, setDealers] = useState<VaultDealer[]>(vault.dealers || []);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<VaultDealer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const filteredDealers = dealers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.company.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  );

  const totalPayable = dealers.reduce((sum, d) => sum + Number(d.totalDue || d.due || 0), 0);

  const handleAddDealer = () => {
    if (!name.trim()) return;
    triggerHaptic('success');
    const newDealer: VaultDealer = {
      id: `dealer-${Date.now()}`,
      name: name.trim(),
      company: company.trim() || 'সাধারণ সাপ্লায়ার',
      phone: phone.trim() || '01700000000',
      totalDue: parseFloat(dueAmount) || 0,
      due: parseFloat(dueAmount) || 0,
      lastOrderDate: new Date().toISOString().split('T')[0],
      lastPurchaseDate: new Date().toISOString().split('T')[0]
    };
    const updated = [newDealer, ...dealers];
    setDealers(updated);
    vault.dealers = updated;
    saveLocalVaultSnapshot(tenant.id, vault);
    setName('');
    setCompany('');
    setPhone('');
    setDueAmount('');
    setShowAddModal(false);
    speakAnnouncement(`নতুন ডিলার ${newDealer.name} যুক্ত হয়েছে`);
  };

  const handlePayDealer = () => {
    if (!selectedDealer || !payAmount) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) return;
    triggerHaptic('success');
    const updated = dealers.map(d => {
      if (d.id === selectedDealer.id) {
        const curDue = Number(d.totalDue || d.due || 0);
        const newDue = Math.max(0, curDue - amount);
        return { ...d, totalDue: newDue, due: newDue };
      }
      return d;
    });
    setDealers(updated);
    vault.dealers = updated;
    saveLocalVaultSnapshot(tenant.id, vault);
    setPayAmount('');
    setShowPayModal(false);
    speakAnnouncement(`ডিলার ${selectedDealer.name} কে ${amount} টাকা পরিশোধ করা হয়েছে`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '🛍️ ডিলার ও ক্রয় খাতা',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Summary KPI Cards */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={styles.kpiLabel}>মোট ডিলার পাওনা (বাকি)</Text>
          <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{formatPrice(totalPayable)}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#e0e7ff' }]}>
          <Text style={styles.kpiLabel}>মোট ডিলার সংখ্যা</Text>
          <Text style={[styles.kpiValue, { color: '#4338ca' }]}>{dealers.length} জন</Text>
        </View>
      </View>

      {/* Search & Add Bar */}
      <View style={styles.actionRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 ডিলার বা কোম্পানির নাম খুঁজুন..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primaryColor || '#4f46e5' }]}
          onPress={() => {
            triggerHaptic('light');
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addBtnText}>+ নতুন ডিলার</Text>
        </TouchableOpacity>
      </View>

      {/* Dealers List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredDealers.map(dealer => (
          <View key={dealer.id} style={styles.dealerCard}>
            <View style={styles.cardHeader}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarEmoji}>🏢</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealerName}>{dealer.name}</Text>
                <Text style={styles.dealerCompany}>{dealer.company} • 📱 {dealer.phone}</Text>
              </View>
              <View style={styles.dueBox}>
                <Text style={styles.dueLabel}>বাকি পাওনা</Text>
                <Text style={styles.dueValue}>{formatPrice(dealer.totalDue || dealer.due || 0)}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => {
                  setSelectedDealer(dealer);
                  setShowPayModal(true);
                }}
              >
                <Text style={styles.payBtnText}>💸 বাকি পরিশোধ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.purchaseBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/stock');
                }}
              >
                <Text style={styles.purchaseBtnText}>📦 নতুন মাল তুলুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Dealer Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>নতুন ডিলার / সাপ্লায়ার যুক্ত করুন</Text>
            <TextInput
              style={styles.input}
              placeholder="ডিলার বা ব্যক্তির নাম *"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="কোম্পানির নাম (যেমন: স্কয়ার, ইউনিলিভার)"
              value={company}
              onChangeText={setCompany}
            />
            <TextInput
              style={styles.input}
              placeholder="মোবাইল নম্বর"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="পূর্বের বাকি টাকা (যদি থাকে)"
              value={dueAmount}
              onChangeText={setDueAmount}
              keyboardType="numeric"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddDealer}>
                <Text style={styles.submitBtnText}>সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pay Dealer Modal */}
      <Modal visible={showPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💸 ডিলার পেমেন্ট পরিশোধ</Text>
            <Text style={styles.modalSub}>{selectedDealer?.name} ({selectedDealer?.company})</Text>
            <Text style={styles.modalDue}>বর্তমান বাকি: {formatPrice(selectedDealer?.due || 0)}</Text>
            <TextInput
              style={styles.input}
              placeholder="পরিশোধের পরিমাণ (৳) *"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handlePayDealer}>
                <Text style={styles.submitBtnText}>পেমেন্ট সম্পন্ন করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  kpiContainer: { flexDirection: 'row', gap: 10, padding: 12 },
  kpiCard: { flex: 1, padding: 14, borderRadius: 14 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 13 },
  addBtn: { paddingHorizontal: 14, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  dealerCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 20 },
  dealerName: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  dealerCompany: { fontSize: 11.5, color: '#64748b' },
  dueBox: { alignItems: 'flex-end' },
  dueLabel: { fontSize: 10, color: '#dc2626', fontWeight: '700' },
  dueValue: { fontSize: 14, fontWeight: '900', color: '#dc2626' },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  payBtn: { flex: 1, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  payBtnText: { color: '#16a34a', fontWeight: '800', fontSize: 12 },
  purchaseBtn: { flex: 1, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  purchaseBtnText: { color: '#2563eb', fontWeight: '800', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#ffffff', width: '100%', maxWidth: 380, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#4f46e5', fontWeight: '700' },
  modalDue: { fontSize: 12, color: '#dc2626', fontWeight: '800', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontWeight: '800' },
});
