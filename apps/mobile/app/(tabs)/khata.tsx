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
import VoiceInputField from '../../src/components/VoiceInputField';

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
  const [showEditCustModal, setShowEditCustModal] = useState(false);
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
  const [newDue, setNewDue] = useState('0');
  const [creditLimit, setCreditLimit] = useState('5000');

  // Edit Customer Form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('');

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

  // Voice Khata Action Handler (Voice memo parser)
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

  // Handle Add Customer Submit
  const handleAddCustomer = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('ভুল', 'কাস্টমারের নাম ও মোবাইল নম্বর লিখুন');
      return;
    }

    triggerHaptic('success');
    const initDue = parseFloat(newDue) || 0;
    const newCust: CustomerItem = {
      id: 'cust-' + Date.now(),
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim() || 'সাধারণ ক্রেতা',
      due: initDue,
      totalDue: initDue,
      creditLimit: parseFloat(creditLimit) || 5000,
      lastPurchaseDate: new Date().toISOString().split('T')[0]
    };

    saveLocalVaultSnapshot(tenant.id, {
      customers: [newCust, ...vault.customers]
    });

    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewDue('0');
    setCreditLimit('5000');
    setShowAddCustModal(false);
    refreshVault();
    playNativeChime('cash');
    const msg = `নতুন কাস্টমার ${newCust.name} সফলভাবে যুক্ত হয়েছে`;
    speakAnnouncement(msg);
  };

  // Open Edit Customer Modal
  const openEditCustomer = (cust: CustomerItem) => {
    setSelectedCustomer(cust);
    setEditName(cust.name);
    setEditPhone(cust.phone || '');
    setEditAddress(cust.address || '');
    setEditCreditLimit(String(cust.creditLimit || '5000'));
    setShowEditCustModal(true);
    triggerHaptic('light');
  };

  // Handle Edit Customer Submit
  const handleEditCustomer = () => {
    if (!selectedCustomer || !editName.trim()) return;
    triggerHaptic('success');

    const updated = vault.customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim(),
          creditLimit: parseFloat(editCreditLimit) || c.creditLimit
        };
      }
      return c;
    });

    saveLocalVaultSnapshot(tenant.id, { customers: updated });
    setShowEditCustModal(false);
    refreshVault();
    speakAnnouncement(`${editName} এর তথ্য আপডেট করা হয়েছে`);
  };

  // Handle Delete Customer Confirmation
  const handleDeleteCustomer = (cust: CustomerItem) => {
    Alert.alert(
      'কাস্টমার খাতা মুছবেন?',
      `"${cust.name}"-এর খাতা সম্পূর্ণ মুছে ফেলা হবে। আপনি কি নিশ্চিত?`,
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'হ্যাঁ, মুছুন',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            const updated = vault.customers.filter(c => c.id !== cust.id);
            saveLocalVaultSnapshot(tenant.id, { customers: updated });
            refreshVault();
            speakAnnouncement(`${cust.name} এর খাতা মুছে ফেলা হয়েছে`);
          }
        }
      ]
    );
  };

  // Handle Collect Payment Submit
  const handleCollectPayment = () => {
    if (!selectedCustomer) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('ভুল', 'সঠিক জমার পরিমাণ লিখুন');
      return;
    }

    triggerHaptic('success');
    const updated = recordCustomerPayment(tenant.id, selectedCustomer.id, amt);
    refreshVault();
    setShowPayModal(false);
    setPaymentAmount('');
    setPaymentNote('');
    playNativeChime('cash');
    const rem = updated ? (updated.due ?? updated.totalDue ?? 0) : 0;
    const msg = `${selectedCustomer.name} এর ৳${amt} টাকা জমা নেওয়া হয়েছে। বর্তমান বাকি ৳${rem}`;
    speakAnnouncement(msg);
    Alert.alert('জমা সফল ✅', msg);
  };

  // Handle Add Due Submit
  const handleAddDue = () => {
    if (!selectedCustomer) return;
    const amt = parseFloat(dueAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('ভুল', 'সঠিক বাকির পরিমাণ লিখুন');
      return;
    }

    triggerHaptic('success');
    const curDue = selectedCustomer.due ?? selectedCustomer.totalDue ?? 0;
    const newDueVal = curDue + amt;

    const updated = vault.customers.map(c => {
      if (c.id === selectedCustomer.id) {
        return {
          ...c,
          due: newDueVal,
          totalDue: newDueVal,
          lastPurchaseDate: new Date().toISOString().split('T')[0]
        };
      }
      return c;
    });

    saveLocalVaultSnapshot(tenant.id, { customers: updated });
    refreshVault();
    setShowAddDueModal(false);
    setDueAmount('');
    setDueItemNote('');
    playNativeChime('beep');
    const msg = `${selectedCustomer.name} এর বাকিতে ৳${amt} টাকা যোগ করা হয়েছে। মোট বাকি ৳${newDueVal}`;
    speakAnnouncement(msg);
    Alert.alert('বাকি যোগ সফল ✅', msg);
  };

  // WhatsApp Reminder Generator
  const sendWhatsAppReminder = (cust: CustomerItem) => {
    triggerHaptic('medium');
    const dueVal = cust.due ?? cust.totalDue ?? 0;
    const msg = `আসসালামু আলাইকুম ${cust.name} ভাই,\n` +
      `আপনার কাছে ${tenant.shopName || 'আমাদের দোকান'} এর মোট বকেয়া ৳${dueVal} টাকা পাওনা রয়েছে।\n` +
      `সুবিধাজনক সময়ে পরিশোধের অনুরোধ জানাচ্ছি।\n\n` +
      `বিকাশ/নগদ পাঠাতে: ${tenant.phone || ''}\n` +
      `ধন্যবাদান্তে,\n${tenant.shopName || ''}\n${tenant.ownerName || ''} (${tenant.phone || ''})`;

    const phoneClean = (cust.phone || '').replace(/\D/g, '');
    const fullPhone = phoneClean.startsWith('88') ? phoneClean : `88${phoneClean}`;
    const url = `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`);
      }
    }).catch(() => {
      Alert.alert('হোয়াটসঅ্যাপ পাওয়া যায়নি', 'অনুগ্রহ করে হোয়াটসঅ্যাপ ইন্সটল করুন।');
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Top Market Due Banner */}
      <View style={[styles.topBanner, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.bannerSub}>দোকানের মোট বাকি পাওনা</Text>
            <Text style={styles.bannerTotal}>{formatPrice(totalMarketDue)}</Text>
            <Text style={styles.bannerCount}>মোট বাকিদার: {totalDueCustomers} জন</Text>
          </View>
          <TouchableOpacity
            style={styles.newCustBtn}
            onPress={() => {
              triggerHaptic('light');
              setShowAddCustModal(true);
            }}
          >
            <Text style={styles.newCustBtnText}>+ নতুন কাস্টমার</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🎙️ Voice Search & Filter Section */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.voiceRow}>
          <TextInput
            style={[styles.voiceInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="🎙️ ভয়েস খাতা (যেমন: কালাম ভাই ৫০০ টাকা জমা)..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleVoiceKhataSubmit}
          />
          <TouchableOpacity
            style={[styles.voiceSubmitBtn, { backgroundColor: primaryColor }]}
            onPress={handleVoiceKhataSubmit}
          >
            <Text style={styles.voiceSubmitBtnText}>এন্ট্রি ▶</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="🔍 কাস্টমারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
          placeholderTextColor="#94a3b8"
        />

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'all' && { backgroundColor: primaryColor }]}
            onPress={() => { triggerHaptic('light'); setFilterMode('all'); }}
          >
            <Text style={[styles.filterPillText, filterMode === 'all' && styles.filterPillTextActive]}>
              সব কাস্টমার ({vault.customers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'due' && { backgroundColor: '#dc2626' }]}
            onPress={() => { triggerHaptic('light'); setFilterMode('due'); }}
          >
            <Text style={[styles.filterPillText, filterMode === 'due' && styles.filterPillTextActive]}>
              বাকি আছে ({totalDueCustomers})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'paid' && { backgroundColor: '#16a34a' }]}
            onPress={() => { triggerHaptic('light'); setFilterMode('paid'); }}
          >
            <Text style={[styles.filterPillText, filterMode === 'paid' && styles.filterPillTextActive]}>
              পরিশোধিত ({vault.customers.length - totalDueCustomers})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 👥 Customer List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📒</Text>
            <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>কোনো কাস্টমার পাওয়া যায়নি</Text>
          </View>
        }
        renderItem={({ item }) => {
          const dueVal = item.due ?? item.totalDue ?? 0;
          const hasDue = dueVal > 0;
          return (
            <View
              style={[
                styles.custCard,
                { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
              ]}
            >
              <View style={styles.custHeaderRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.custName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{item.name}</Text>
                    <View style={[styles.dueBadge, { backgroundColor: hasDue ? '#fee2e2' : '#dcfce7' }]}>
                      <Text style={[styles.dueBadgeText, { color: hasDue ? '#dc2626' : '#16a34a' }]}>
                        {hasDue ? 'বাকি' : 'পরিশোধিত'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.custPhone}>📱 {item.phone || 'ফোন নেই'} {item.address ? `• 📍 ${item.address}` : ''}</Text>
                  {item.lastPurchaseDate && (
                    <Text style={styles.custDate}>সর্বশেষ লেনদেন: {item.lastPurchaseDate}</Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.dueAmount, { color: hasDue ? '#dc2626' : '#16a34a' }]}>
                    {formatPrice(dueVal)}
                  </Text>
                  <Text style={styles.dueLabel}>{hasDue ? 'বর্তমান বাকি' : 'কোনো বাকি নেই'}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCustomer(item);
                    setShowPayModal(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>+ জমা নিন</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#f97316' }]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedCustomer(item);
                    setShowAddDueModal(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>+ বাকি দিন</Text>
                </TouchableOpacity>

                {hasDue && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#25d366' }]}
                    onPress={() => sendWhatsAppReminder(item)}
                  >
                    <Text style={styles.actionBtnText}>💬 তাগাদা</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => openEditCustomer(item)}
                >
                  <Text style={[styles.actionBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>✏️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowLedgerModal(true);
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>📜</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* 💰 Collect Payment Modal with In-Field Voice */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              💰 বাকি জমা গ্রহণ: {selectedCustomer?.name}
            </Text>
            <Text style={styles.modalSub}>
              বর্তমান বাকি: {formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}
            </Text>

            <VoiceInputField
              label="জমার পরিমাণ (৳) *"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="যেমন: ৫০০"
              isNumeric
              keyboardType="numeric"
              required
              promptText="কত টাকা জমা নিলেন মুখে বলুন"
            />

            <VoiceInputField
              label="নোট বা বিবরণ"
              value={paymentNote}
              onChangeText={setPaymentNote}
              placeholder="যেমন: কিস্তি / ক্যাশ জমা"
              promptText="মন্তব্য মুখে বলুন"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10b981' }]} onPress={handleCollectPayment}>
                <Text style={styles.saveBtnText}>জমা সম্পন্ন করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ➕ Add Due Modal with In-Field Voice */}
      <Modal visible={showAddDueModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              ➕ নতুন বাকি যোগ: {selectedCustomer?.name}
            </Text>
            <Text style={styles.modalSub}>
              বর্তমান বাকি: {formatPrice(selectedCustomer?.due ?? selectedCustomer?.totalDue ?? 0)}
            </Text>

            <VoiceInputField
              label="বাকির পরিমাণ (৳) *"
              value={dueAmount}
              onChangeText={setDueAmount}
              placeholder="যেমন: ১০০০"
              isNumeric
              keyboardType="numeric"
              required
              promptText="কত টাকা বাকি দিলেন মুখে বলুন"
            />

            <VoiceInputField
              label="পণ্যের নাম বা বিবরণ"
              value={dueItemNote}
              onChangeText={setDueItemNote}
              placeholder="যেমন: চিনি ২ কেজি, তেল ১ লিটার"
              promptText="পণ্যের নাম মুখে বলুন"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddDueModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#f97316' }]} onPress={handleAddDue}>
                <Text style={styles.saveBtnText}>বাকি যোগ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 👤 Add New Customer Modal with In-Field Voice across all fields */}
      <Modal visible={showAddCustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              👤 নতুন কাস্টমার খাতা
            </Text>
            <Text style={styles.modalSub}>কাস্টমারের তথ্য দিন অথবা মুখে বলুন</Text>

            <VoiceInputField
              label="কাস্টমারের নাম *"
              value={newName}
              onChangeText={setNewName}
              placeholder="যেমন: কালাম ভাই (মাস্টার)"
              required
              promptText="কাস্টমারের নাম মুখে বলুন"
            />

            <VoiceInputField
              label="মোবাইল নম্বর *"
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="01700000000"
              keyboardType="phone-pad"
              isNumeric
              required
              promptText="কাস্টমারের মোবাইল নম্বর বলুন"
            />

            <VoiceInputField
              label="ঠিকানা / গ্রাম / এলাকা"
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="যেমন: পূর্ব বাজার, জামে মসজিদ সংলগ্ন"
              promptText="কাস্টমারের ঠিকানা বলুন"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <VoiceInputField
                  label="প্রারম্ভিক বকেয়া (৳)"
                  value={newDue}
                  onChangeText={setNewDue}
                  placeholder="0"
                  isNumeric
                  keyboardType="numeric"
                  promptText="প্রারম্ভিক বাকি কত টাকা বলুন"
                />
              </View>
              <View style={{ flex: 1 }}>
                <VoiceInputField
                  label="ক্রেডিট লিমিট (৳)"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  placeholder="5000"
                  isNumeric
                  keyboardType="numeric"
                  promptText="বাকির সীমা কত টাকা বলুন"
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

      {/* ✏️ Edit Customer Modal */}
      <Modal visible={showEditCustModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                ✏️ কাস্টমার তথ্য এডিট
              </Text>
              {selectedCustomer && (
                <TouchableOpacity onPress={() => { setShowEditCustModal(false); handleDeleteCustomer(selectedCustomer); }}>
                  <Text style={{ color: '#dc2626', fontWeight: '800', fontSize: 12 }}>🗑️ খাতা মুছুন</Text>
                </TouchableOpacity>
              )}
            </View>

            <VoiceInputField
              label="কাস্টমারের নাম *"
              value={editName}
              onChangeText={setEditName}
              placeholder="কাস্টমারের নাম"
              required
              promptText="কাস্টমারের নতুন নাম মুখে বলুন"
            />

            <VoiceInputField
              label="মোবাইল নম্বর"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="মোবাইল নম্বর"
              keyboardType="phone-pad"
              isNumeric
              promptText="মোবাইল নম্বর মুখে বলুন"
            />

            <VoiceInputField
              label="ঠিকানা"
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="ঠিকানা"
              promptText="ঠিকানা মুখে বলুন"
            />

            <VoiceInputField
              label="বাকির সীমা (Credit Limit) ৳"
              value={editCreditLimit}
              onChangeText={setEditCreditLimit}
              isNumeric
              keyboardType="numeric"
              promptText="ক্রেডিট লিমিট কত টাকা বলুন"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditCustModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleEditCustomer}>
                <Text style={styles.saveBtnText}>আপডেট সংরক্ষণ</Text>
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
