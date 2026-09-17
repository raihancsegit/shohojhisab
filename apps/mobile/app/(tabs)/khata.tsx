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
  Alert,
  Linking
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

type KhataFilter = 'all' | 'due' | 'paid';

export default function KhataScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, speakAnnouncement, triggerHaptic, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<KhataFilter>('all');
  const [voiceText, setVoiceText] = useState('');
  
  // Selected Customer for actions
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  
  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAddDueModal, setShowAddDueModal] = useState(false);
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Collect Payment Form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Add Due Form state
  const [dueAmount, setDueAmount] = useState('');
  const [dueItemNote, setDueItemNote] = useState('');

  // New Customer Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDue, setNewDue] = useState('');
  const [creditLimit, setCreditLimit] = useState('5000');

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const totalMarketDue = vault.customers.reduce((sum, c) => sum + (c.due || c.totalDue || 0), 0);
  const totalDueCustomers = vault.customers.filter(c => (c.due || c.totalDue || 0) > 0).length;

  const filteredCustomers = useMemo(() => {
    return vault.customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
      const dueVal = c.due || c.totalDue || 0;
      if (filterMode === 'due') return matchesSearch && dueVal > 0;
      if (filterMode === 'paid') return matchesSearch && dueVal <= 0;
      return matchesSearch;
    });
  }, [vault.customers, searchQuery, filterMode]);

  // Voice Khata Action Handler
  const handleVoiceKhataSubmit = () => {
    const text = voiceText.trim();
    if (!text) return;

    triggerHaptic('medium');
    playNativeChime('beep');

    const numMatch = text.match(/(\d+)/);
    const amount = numMatch ? parseInt(numMatch[1], 10) : 0;
    const isPayment = text.includes('জমা') || text.includes('পরিশোধ');

    const matchedCust = vault.customers.find(c => text.includes(c.name) || c.name.includes(text.split(' ')[0]));

    if (matchedCust && amount > 0) {
      if (isPayment) {
        const updated = recordCustomerPayment(tenant.id, matchedCust.id, amount);
        refreshVault();
        setVoiceText('');
        const remaining = updated ? (updated.due ?? updated.totalDue ?? 0) : 0;
        const msg = `${matchedCust.name} এর ৳${amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ৳${remaining}`;
        speakNativeText(msg);
        Alert.alert('ভয়েস জমা সফল ✅', msg);
      } else {
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
        Alert.alert('ভয়েস বাকি যোগ ✅', msg);
      }
    } else {
      setSearchQuery(text);
      setVoiceText('');
      speakNativeText(`${text} খোঁজা হচ্ছে`);
    }
  };

  // Collect Payment Action
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
    setPaymentNote('');
    refreshVault();

    const remaining = updated ? (updated.due ?? updated.totalDue ?? 0) : 0;
    speakAnnouncement(`${tenant.shopName}: ${selectedCustomer.name} এর নিকট হতে ${amount} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ${remaining} টাকা`);
    playNativeChime('cash');
    Alert.alert('জমা সফল ✅', `${selectedCustomer.name} এর ৳${amount} টাকা জমা নেওয়া হয়েছে। অবশিষ্ট বাকি: ৳${remaining}`);
  };

  // Add Due Action
  const handleAddDue = () => {
    const amount = Number(dueAmount);
    if (!selectedCustomer || isNaN(amount) || amount <= 0) {
      Alert.alert('ভুল', 'দয়া করে সঠিক বাকির পরিমাণ লিখুন');
      return;
    }

    triggerHaptic('success');
    const currentDue = selectedCustomer.due ?? selectedCustomer.totalDue ?? 0;
    const newTotal = currentDue + amount;

    const updatedCusts = vault.customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          due: newTotal,
          totalDue: newTotal,
          lastPurchaseDate: new Date().toISOString().slice(0, 10)
        };
      }
      return c;
    });

    saveLocalVaultSnapshot(tenant.id, { customers: updatedCusts });
    refreshVault();
    setShowAddDueModal(false);
    setDueAmount('');
    setDueItemNote('');

    speakAnnouncement(`${selectedCustomer.name} এর বাকিতে ${amount} টাকা যোগ করা হয়েছে। সর্বমোট বাকি ${newTotal} টাকা`);
    playNativeChime('success');
    Alert.alert('বাকি যোগ সফল ✅', `${selectedCustomer.name} এর বাকিতে ৳${amount} যোগ হয়েছে। মোট বকেয়া: ৳${newTotal}`);
  };

  // Add New Customer Action
  const handleAddCustomer = () => {
    if (!newName.trim()) {
      Alert.alert('ভুল', 'কাস্টমারের নাম লিখুন');
      return;
    }

    triggerHaptic('success');
    const dueNum = Number(newDue) || 0;
    const newCust: CustomerItem = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim() || '01700000000',
      address: newAddress.trim() || 'বাজার এলাকা',
      due: dueNum,
      totalDue: dueNum,
      lastPurchaseDate: new Date().toISOString().slice(0, 10)
    };

    saveLocalVaultSnapshot(tenant.id, {
      customers: [newCust, ...vault.customers]
    });

    refreshVault();
    setShowAddCustModal(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewDue('');
    setCreditLimit('5000');

    speakAnnouncement(`${newCust.name} এর হিসাব খাতা খোলা হয়েছে`);
    playNativeChime('cash');
    Alert.alert('সফল ✅', `${newCust.name} এর খাতা সফলভাবে যোগ করা হয়েছে!`);
  };

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (c: CustomerItem) => {
    triggerHaptic('light');
    const dueVal = c.due ?? c.totalDue ?? 0;
    const text = `আসসালামু আলাইকুম ${c.name} ভাই,\n*${tenant.shopName}* থেকে বিনীতভাবে জানাচ্ছি যে আপনার পূর্বের বকেয়া হিসাব বাবদ *৳${dueVal}* অবশিষ্ট রয়েছে।\nসুবিধাজনক সময়ে পরিশোধ করে বাধিত করবেন।\n\nধন্যবাদ!\n_${tenant.shopName}_ • 📞 ${tenant.phone}`;
    Linking.openURL(`https://wa.me/88${c.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Top Market Due Banner */}
      <View style={[styles.topBanner, { backgroundColor: isDark ? '#1e1b4b' : primaryColor }]}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.bannerSub}>মোট বাকি হিসাব (মার্কেট পাওনা)</Text>
            <Text style={styles.bannerTotal}>{formatPrice(totalMarketDue)}</Text>
            <Text style={styles.bannerCount}>👥 {totalDueCustomers} জন গ্রাহকের কাছে বাকি আছে</Text>
          </View>
          <TouchableOpacity
            style={styles.newCustBtn}
            onPress={() => {
              triggerHaptic('medium');
              setShowAddCustModal(true);
            }}
          >
            <Text style={styles.newCustBtnText}>+ নতুন কাস্টমার</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🎙️ Voice & Search Action Bar */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.voiceRow}>
          <TextInput
            style={[styles.voiceInput, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            placeholder="🎙️ ভয়েস খাতা (যেমন: রহিমের বাকিতে ৫০০ টাকা লেখো)..."
            placeholderTextColor="#94a3b8"
            value={voiceText}
            onChangeText={setVoiceText}
            onSubmitEditing={handleVoiceKhataSubmit}
          />
          <TouchableOpacity style={[styles.voiceSubmitBtn, { backgroundColor: primaryColor }]} onPress={handleVoiceKhataSubmit}>
            <Text style={styles.voiceSubmitBtnText}>বলুন ▶</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
          placeholder="🔍 কাস্টমারের নাম বা ফোন দিয়ে সার্চ করুন..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'all' && { backgroundColor: primaryColor }]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterPillText, filterMode === 'all' && styles.filterPillTextActive]}>
              👥 সকল কাস্টমার ({vault.customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'due' && { backgroundColor: '#dc2626' }]}
            onPress={() => setFilterMode('due')}
          >
            <Text style={[styles.filterPillText, filterMode === 'due' && styles.filterPillTextActive]}>
              🔴 বকেয়া আছে ({totalDueCustomers})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'paid' && { backgroundColor: '#16a34a' }]}
            onPress={() => setFilterMode('paid')}
          >
            <Text style={[styles.filterPillText, filterMode === 'paid' && styles.filterPillTextActive]}>
              🟢 পরিশোধিত ({vault.customers.length - totalDueCustomers})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📋 Customer Ledger Cards List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              কোনো কাস্টমার পাওয়া যায়নি।
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const dueVal = item.due ?? item.totalDue ?? 0;
          const isDueActive = dueVal > 0;

          return (
            <View style={[styles.custCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              {/* Header Info */}
              <View style={styles.custHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.custName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
                    <View style={[styles.dueBadge, { backgroundColor: isDueActive ? '#fee2e2' : '#dcfce7' }]}>
                      <Text style={[styles.dueBadgeText, { color: isDueActive ? '#dc2626' : '#15803d' }]}>
                        {isDueActive ? 'বকেয়া' : 'পরিশোধ'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.custPhone}>📱 {item.phone} • 📍 {item.address || 'বাজার'}</Text>
                  {item.lastPurchaseDate && (
                    <Text style={styles.custDate}>সর্বশেষ লেনদেন: {item.lastPurchaseDate}</Text>
                  )}
                </View>

                {/* Total Due Value */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.dueAmount, { color: isDueActive ? '#dc2626' : '#16a34a' }]}>
                    {formatPrice(dueVal)}
                  </Text>
                  <Text style={styles.dueLabel}>{isDueActive ? 'বাকি পাওনা' : 'হিসাব ক্লিয়ার'}</Text>
                </View>
              </View>

              {/* Action Buttons Bar */}
              <View style={styles.btnRow}>
                {/* 1-Tap Collect Payment */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => {
                    triggerHaptic('medium');
                    setSelectedCustomer(item);
                    setPaymentAmount(String(dueVal > 0 ? dueVal : ''));
                    setShowPayModal(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>💵 + জমা নিন</Text>
                </TouchableOpacity>

                {/* 1-Tap Add Due */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => {
                    triggerHaptic('medium');
                    setSelectedCustomer(item);
                    setShowAddDueModal(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>➕ বাকি দিন</Text>
                </TouchableOpacity>

                {/* WhatsApp Reminder */}
                {isDueActive && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                    onPress={() => handleSendWhatsAppReminder(item)}
                  >
                    <Text style={styles.actionBtnText}>📢 তাগাদা</Text>
                  </TouchableOpacity>
                )}

                {/* Detailed Ledger History */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCustomer(item);
                    setShowLedgerModal(true);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: isDark ? '#f8fafc' : '#475569' }]}>📜 লেজার</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* 💵 1-Tap Payment Collection Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              💵 নগদ জমা গ্রহণ: {selectedCustomer?.name}
            </Text>
            <Text style={styles.modalSub}>
              বর্তমান মোট বকেয়া: {formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}
            </Text>

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

            <Text style={[styles.inputLabel, { marginTop: 8 }]}>মন্তব্য / ভাউচার নোট (ঐচ্ছিক)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: নগদ পরিশোধ / বিকাশ"
              placeholderTextColor="#94a3b8"
              value={paymentNote}
              onChangeText={setPaymentNote}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10b981' }]} onPress={handleCollectPayment}>
                <Text style={styles.saveBtnText}>✅ জমা নিশ্চিত করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ➕ 1-Tap Add Due Modal */}
      <Modal visible={showAddDueModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              ➕ নতুন বাকি যোগ করুন: {selectedCustomer?.name}
            </Text>
            <Text style={styles.modalSub}>
              পূর্বে বকেয়া আছে: {formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}
            </Text>

            <Text style={styles.inputLabel}>বাকির পরিমাণ (টাকা) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: ৩০০"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={dueAmount}
              onChangeText={setDueAmount}
              autoFocus
            />

            <Text style={[styles.inputLabel, { marginTop: 8 }]}>মালের বিবরণ / পণ্যের নাম</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: ২ কেজি চাল ও চিনি"
              placeholderTextColor="#94a3b8"
              value={dueItemNote}
              onChangeText={setDueItemNote}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddDueModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444' }]} onPress={handleAddDue}>
                <Text style={styles.saveBtnText}>➕ বাকি যোগ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 👤 Add New Customer Modal */}
      <Modal visible={showAddCustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              👤 নতুন কাস্টমার খাতা খুলুন
            </Text>

            <Text style={styles.inputLabel}>কাস্টমারের নাম *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: মোঃ রহিম উদ্দিন"
              placeholderTextColor="#94a3b8"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>মোবাইল নম্বর *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="01700000000"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={[styles.inputLabel, { marginTop: 6 }]}>ঠিকানা / গ্রাম / এলাকা</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: পূর্ব বাজার"
              placeholderTextColor="#94a3b8"
              value={newAddress}
              onChangeText={setNewAddress}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { marginTop: 6 }]}>প্রারম্ভিক বকেয়া (৳)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newDue}
                  onChangeText={setNewDue}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { marginTop: 6 }]}>ক্রেডিট লিমিট (৳)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                  placeholder="5000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddCustModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleAddCustomer}>
                <Text style={styles.saveBtnText}>খাতা সংরক্ষণ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 📜 Customer Ledger History Modal */}
      <Modal visible={showLedgerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff', maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              📜 লেজার হিস্ট্রি: {selectedCustomer?.name}
            </Text>
            <Text style={styles.modalSub}>
              ফোন: {selectedCustomer?.phone} • মোট বকেয়া: {formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
              <View style={[styles.historyRow, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
                <View>
                  <Text style={[styles.historyTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>প্রারম্ভিক বকেয়া খাতা</Text>
                  <Text style={styles.historyDate}>{selectedCustomer?.lastPurchaseDate || 'বর্তমান'}</Text>
                </View>
                <Text style={[styles.historyAmount, { color: '#ef4444' }]}>
                  {formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLedgerModal(false)}>
              <Text style={styles.cancelBtnText}>বন্ধ করুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBanner: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, elevation: 2 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerSub: { fontSize: 11.5, color: '#e0e7ff', fontWeight: '600' },
  bannerTotal: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  bannerCount: { fontSize: 11, color: '#e0e7ff', marginTop: 2, fontWeight: '600' },
  newCustBtn: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, elevation: 2 },
  newCustBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 12.5 },
  searchSection: { padding: 12, borderBottomWidth: 1, gap: 8 },
  voiceRow: { flexDirection: 'row', gap: 6 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  voiceSubmitBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceSubmitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5, borderWidth: 1, borderColor: '#cbd5e1' },
  filterRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e2e8f0' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterPillTextActive: { color: '#ffffff', fontWeight: '800' },
  listContent: { padding: 12, gap: 10 },
  custCard: { borderRadius: 16, padding: 14, borderWidth: 1, elevation: 1, gap: 10 },
  custHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  custName: { fontSize: 14.5, fontWeight: '900' },
  dueBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  dueBadgeText: { fontSize: 10, fontWeight: '800' },
  custPhone: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  custDate: { fontSize: 10.5, color: '#94a3b8', marginTop: 2 },
  dueAmount: { fontSize: 16, fontWeight: '900' },
  dueLabel: { fontSize: 10.5, color: '#64748b', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 20, padding: 18, elevation: 5 },
  modalTitle: { fontSize: 15.5, fontWeight: '900', marginBottom: 2 },
  modalSub: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 10, alignItems: 'center' },
  historyTitle: { fontSize: 12.5, fontWeight: '700' },
  historyDate: { fontSize: 10.5, color: '#64748b', marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '900' }
});
