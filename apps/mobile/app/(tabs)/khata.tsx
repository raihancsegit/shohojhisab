import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import {
  getLocalVaultData,
  recordCustomerPayment,
  saveLocalVaultSnapshot,
  CustomerItem
} from '../../src/lib/offlineDataVault';

export default function KhataScreen() {
  const { tenant, theme, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);

  // New Customer Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDue, setNewDue] = useState('');

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const totalMarketDue = vault.customers.reduce((sum, c) => sum + (c.totalDue || 0), 0);

  const filteredCustomers = useMemo(() => {
    return vault.customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [vault.customers, searchQuery]);

  // Collect Payment
  const handleCollectPayment = () => {
    const amount = Number(paymentAmount);
    if (!selectedCustomer || isNaN(amount) || amount <= 0) {
      Alert.alert('ভুল', 'দয়া করে সঠিক জমার পরিমাণ লিখুন');
      return;
    }

    triggerHaptic('success');
    const updated = recordCustomerPayment(tenant.id, selectedCustomer.id, amount);
    setShowPayModal(false);
    setPaymentAmount('');
    refreshVault();

    // Voice Soundbox Announcement
    speakAnnouncement(`${tenant.shopName}: ${selectedCustomer.name} এর নিকট হতে ${amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ${updated ? updated.totalDue : 0} টাকা`);
  };

  // Add New Customer
  const handleAddCustomer = () => {
    if (!newName.trim()) {
      Alert.alert('ভুল', 'কাস্টমারের নাম লিখুন');
      return;
    }

    triggerHaptic('success');
    const newCust: CustomerItem = {
      id: 'cust-' + Date.now(),
      name: newName.trim(),
      phone: newPhone.trim() || '০১৭XXXXXXXX',
      address: newAddress.trim() || 'লোকাল',
      totalDue: Number(newDue) || 0,
      lastPurchaseDate: new Date().toISOString().slice(0, 10)
    };

    saveLocalVaultSnapshot(tenant.id, {
      customers: [newCust, ...vault.customers]
    });

    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewDue('');
    setShowAddCustModal(false);
    refreshVault();
    speakAnnouncement(`নতুন কাস্টমার ${newCust.name} যুক্ত হয়েছে`);
  };

  return (
    <View style={styles.container}>
      {/* 📊 Top Due Summary Card */}
      <View style={[styles.topSummaryCard, { backgroundColor: theme.primary }]}>
        <Text style={styles.summarySub}>বাজারে মোট বাকি রয়েছে</Text>
        <Text style={styles.summaryTotal}>{formatPrice(totalMarketDue)}</Text>
        <Text style={styles.summaryCount}>মোট খাতা: {vault.customers.length} জন কাস্টমার</Text>
      </View>

      {/* 🔍 Search & Add Bar */}
      <View style={styles.actionRow}>
        <TextInput
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 কাস্টমারের নাম বা মোবাইল খুঁজুন..."
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={[styles.addCustBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            triggerHaptic('light');
            setShowAddCustModal(true);
          }}
        >
          <Text style={styles.addCustBtnText}>+ নতুন</Text>
        </TouchableOpacity>
      </View>

      {/* 👥 Customer List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.customerCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.custName}>{item.name}</Text>
              <Text style={styles.custPhone}>📱 {item.phone} {item.address ? `• ${item.address}` : ''}</Text>
              {item.lastPurchaseDate && (
                <Text style={styles.custDate}>সর্বশেষ লেনদেন: {item.lastPurchaseDate}</Text>
              )}
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[styles.custDue, item.totalDue > 0 ? { color: '#dc2626' } : { color: '#16a34a' }]}>
                {formatPrice(item.totalDue)}
              </Text>
              {item.totalDue > 0 ? (
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCustomer(item);
                    setShowPayModal(true);
                  }}
                >
                  <Text style={styles.payBtnText}>টাকা জমা</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.clearedBadge}>
                  <Text style={styles.clearedText}>পরিশোধিত ✓</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />

      {/* 💵 Collect Payment Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>টাকা জমা নিন</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.payDetailsBox}>
              <Text style={styles.payCustName}>{selectedCustomer?.name}</Text>
              <Text style={styles.payCustDue}>বর্তমান মোট বাকি: {formatPrice(selectedCustomer?.totalDue || 0)}</Text>
            </View>

            <Text style={styles.inputLabel}>জমার পরিমাণ (টাকা):</Text>
            <TextInput
              style={styles.payInput}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="যেমন: ৫০০"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleCollectPayment}>
              <Text style={styles.confirmBtnText}>✓ জমা নিশ্চিত ও সাউন্ডবক্স ঘোষণা</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ➕ Add New Customer Modal */}
      <Modal visible={showAddCustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>নতুন কাস্টমার যোগ করুন</Text>
              <TouchableOpacity onPress={() => setShowAddCustModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>কাস্টমারের নাম *:</Text>
              <TextInput style={styles.formInput} value={newName} onChangeText={setNewName} placeholder="যেমন: রফিক সাহেব" />

              <Text style={styles.inputLabel}>মোবাইল নাম্বার:</Text>
              <TextInput style={styles.formInput} keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} placeholder="01XXXXXXXXX" />

              <Text style={styles.inputLabel}>ঠিকানা / এলাকা:</Text>
              <TextInput style={styles.formInput} value={newAddress} onChangeText={setNewAddress} placeholder="যেমন: বাজার রোড" />

              <Text style={styles.inputLabel}>পূর্বের বাকি (যদি থাকে):</Text>
              <TextInput style={styles.formInput} keyboardType="numeric" value={newDue} onChangeText={setNewDue} placeholder="০" />
            </ScrollView>

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleAddCustomer}>
              <Text style={styles.confirmBtnText}>+ খাতা সংরক্ষণ করুন</Text>
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
  summarySub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  summaryTotal: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginVertical: 2 },
  summaryCount: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600' },
  actionRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchBar: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, height: 42, fontSize: 13, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a' },
  addCustBtn: { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addCustBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  listContainer: { paddingHorizontal: 12, paddingBottom: 90 },
  customerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  custName: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  custPhone: { fontSize: 11.5, color: '#64748b' },
  custDate: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  custDue: { fontSize: 15, fontWeight: '900' },
  payBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  payBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  clearedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  clearedText: { color: '#15803d', fontSize: 10.5, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  closeBtn: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  payDetailsBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  payCustName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  payCustDue: { fontSize: 12.5, color: '#dc2626', fontWeight: '700', marginTop: 2 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 4 },
  payInput: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  formInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 13, color: '#0f172a', marginBottom: 10 },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '900' }
});
