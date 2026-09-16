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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import {
  getLocalVaultData,
  recordCustomerPayment,
  saveLocalVaultSnapshot,
  CustomerItem
} from '../../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../../src/lib/offlineAudioEngine';

export default function KhataScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [searchQuery, setSearchQuery] = useState('');
  const [voiceText, setVoiceText] = useState('');
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

  const totalMarketDue = vault.customers.reduce((sum, c) => sum + (c.due || c.totalDue || 0), 0);

  const filteredCustomers = useMemo(() => {
    return vault.customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [vault.customers, searchQuery]);

  // Voice Khata Action Handler
  const handleVoiceKhataSubmit = () => {
    const text = voiceText.trim();
    if (!text) return;

    triggerHaptic('medium');
    playNativeChime('beep');

    const numMatch = text.match(/(\d+)/);
    const amount = numMatch ? parseInt(numMatch[1], 10) : 0;
    const isPayment = text.includes('জমা') || text.includes('পরিশোধ');

    // Find customer in vault
    const matchedCust = vault.customers.find(c => text.includes(c.name) || c.name.includes(text.split(' ')[0]));

    if (matchedCust && amount > 0) {
      if (isPayment) {
        const updated = recordCustomerPayment(tenant.id, matchedCust.id, amount);
        refreshVault();
        setVoiceText('');
        const remaining = updated ? (updated.due ?? updated.totalDue ?? 0) : 0;
        const msg = `${matchedCust.name} এর ৳${amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ৳${remaining}`;
        speakNativeText(msg);
        Alert.alert('ভয়েস জমা সফল', msg);
      } else {
        // Add Due
        const currentDue = matchedCust.due ?? matchedCust.totalDue ?? 0;
        const updatedCusts = vault.customers.map(c => {
          if (c.id === matchedCust.id) {
            return { ...c, due: currentDue + amount, totalDue: currentDue + amount };
          }
          return c;
        });
        saveLocalVaultSnapshot(tenant.id, { customers: updatedCusts });
        refreshVault();
        setVoiceText('');
        const msg = `${matchedCust.name} এর বাকিতে ৳${amount} টাকা যোগ হয়েছে। মোট বাকি ৳${currentDue + amount}`;
        speakNativeText(msg);
        Alert.alert('ভয়েস বাকি যোগ', msg);
      }
    } else {
      setSearchQuery(text);
      setVoiceText('');
      speakNativeText(`${text} খোঁজা হচ্ছে`);
    }
  };

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
    const remaining = updated ? (updated.due ?? updated.totalDue ?? 0) : 0;
    speakAnnouncement(`${tenant.shopName}: ${selectedCustomer.name} এর নিকট হতে ${amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ${remaining} টাকা`);
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
      due: Number(newDue) || 0,
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
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Top Due Summary Card */}
      <View style={[styles.topSummaryCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <Text style={styles.summarySub}>বাজারে মোট বাকি রয়েছে</Text>
        <Text style={styles.summaryAmount}>{formatPrice(totalMarketDue)}</Text>
        <View style={styles.summaryMetaRow}>
          <Text style={styles.summaryMetaText}>মোট খাতা: {vault.customers.length} জন</Text>
          <Text style={styles.summaryMetaDot}>•</Text>
          <Text style={styles.summaryMetaText}>বকেয়া গ্রাহক: {vault.customers.filter(c => (c.due || c.totalDue || 0) > 0).length} জন</Text>
        </View>
      </View>

      {/* 🎙️ Voice Khata Action & Search Header */}
      <View style={[styles.actionSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.voiceRow}>
          <TextInput
            style={[styles.voiceInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="🎙️ মুখে বলুন (যেমন: রহিমের ৫০০ টাকা বাকি / জমা)..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleVoiceKhataSubmit}
          />
          <TouchableOpacity style={[styles.voiceBtn, { backgroundColor: primaryColor }]} onPress={handleVoiceKhataSubmit}>
            <Text style={styles.voiceBtnText}>যোগ ▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: isDark ? '#334155' : '#cbd5e1',
                color: isDark ? '#f8fafc' : '#0f172a'
              }
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="🔍 কাস্টমারের নাম বা ফোন নাম্বার খুঁজুন..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.addCustBtn, { backgroundColor: primaryColor }]}
            onPress={() => {
              triggerHaptic('light');
              setShowAddCustModal(true);
            }}
          >
            <Text style={styles.addCustBtnText}>+ নতুন খাতা</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📋 Customers List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const due = item.due ?? item.totalDue ?? 0;
          return (
            <View style={[
              styles.customerCard,
              {
                backgroundColor: isDark ? '#131b2e' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0'
              }
            ]}>
              <View style={styles.cardLeft}>
                <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                  <Text style={[styles.avatarText, { color: primaryColor }]}>{item.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.custName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
                  <Text style={styles.custPhone}>📱 {item.phone}</Text>
                  {item.address ? <Text style={styles.custAddress}>📍 {item.address}</Text> : null}
                </View>
              </View>

              <View style={styles.cardRight}>
                <View style={styles.dueBox}>
                  <Text style={styles.dueLabel}>বাকি টাকা</Text>
                  <Text style={[styles.dueAmount, { color: due > 0 ? '#dc2626' : '#16a34a' }]}>
                    {formatPrice(due)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: primaryColor }]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCustomer(item);
                    setShowPayModal(true);
                  }}
                >
                  <Text style={styles.payBtnText}>জমা নিন</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* 💵 Payment Collection Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>বাকি টাকা জমা নিন</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.custSummaryBox}>
              <Text style={styles.custSummaryName}>{selectedCustomer?.name}</Text>
              <Text style={styles.custSummaryPhone}>📱 {selectedCustomer?.phone}</Text>
              <Text style={styles.custSummaryDue}>
                বর্তমান মোট বাকি: <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}</Text>
              </Text>
            </View>

            <Text style={styles.inputLabel}>জমার পরিমাণ (টাকা) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: ৫০০"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              autoFocus
            />

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: primaryColor }]} onPress={handleCollectPayment}>
              <Text style={styles.confirmBtnText}>✓ জমা নিশ্চিত ও সাউন্ডবক্স ঘোষণা</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ➕ Add Customer Modal */}
      <Modal visible={showAddCustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>নতুন কাস্টমারের খাতা খুলুন</Text>
              <TouchableOpacity onPress={() => setShowAddCustModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>কাস্টমারের নাম *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: মোঃ রহিম মিয়া"
              placeholderTextColor="#94a3b8"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.inputLabel}>মোবাইল নাম্বার</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="০১৭XXXXXXXX"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={styles.inputLabel}>ঠিকানা / এলাকা</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="গ্রাম বা বাজারের নাম"
              placeholderTextColor="#94a3b8"
              value={newAddress}
              onChangeText={setNewAddress}
            />

            <Text style={styles.inputLabel}>পূর্বের বাকি (যদি থাকে)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="৳ ০"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={newDue}
              onChangeText={setNewDue}
            />

            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: primaryColor }]} onPress={handleAddCustomer}>
              <Text style={styles.confirmBtnText}>খাতা সংরক্ষণ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSummaryCard: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  summarySub: { fontSize: 11.5, color: '#e0e7ff', fontWeight: '600' },
  summaryAmount: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginVertical: 3 },
  summaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryMetaText: { fontSize: 11.5, color: '#e0e7ff', fontWeight: '600' },
  summaryMetaDot: { color: '#cbd5e1', fontSize: 10 },
  actionSection: { padding: 10, borderBottomWidth: 1 },
  voiceRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12 },
  voiceBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5, borderWidth: 1 },
  addCustBtn: { paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' },
  addCustBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12.5 },
  listContainer: { padding: 12, gap: 10 },
  customerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, elevation: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  custName: { fontSize: 13.5, fontWeight: '800' },
  custPhone: { fontSize: 11, color: '#64748b', marginTop: 1 },
  custAddress: { fontSize: 10.5, color: '#94a3b8', marginTop: 1 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  dueBox: { alignItems: 'flex-end' },
  dueLabel: { fontSize: 9.5, color: '#64748b', fontWeight: '600' },
  dueAmount: { fontSize: 14, fontWeight: '900' },
  payBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  payBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  closeBtn: { fontSize: 16, color: '#64748b', fontWeight: '800' },
  custSummaryBox: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, marginBottom: 14 },
  custSummaryName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  custSummaryPhone: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  custSummaryDue: { fontSize: 12, color: '#334155', marginTop: 4, fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, fontWeight: '600', marginBottom: 12 },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  confirmBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '900' }
});
