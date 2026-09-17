import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot, ProductItem } from '../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';
import VoiceInputField from '../src/components/VoiceInputField';

export interface InstallmentPlan {
  id: string;
  customerName: string;
  phone: string;
  customerAddress?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  productName: string;
  productId?: string;
  totalAmount: number;
  downPayment: number;
  paidAmount: number;
  perInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  dueDate: string;
  status: 'active' | 'completed' | 'overdue';
  notes?: string;
  createdAt: string;
}

const INITIAL_INSTALLMENTS: InstallmentPlan[] = [
  {
    id: 'inst-1',
    customerName: 'মো: রফিকুল ইসলাম',
    phone: '01711223344',
    customerAddress: 'পূর্ব বাজার, জামে মসজিদ লেন',
    guarantorName: 'আলমগীর হোসেন',
    guarantorPhone: '01711000000',
    productName: 'ওয়ালটন ফ্রিজ (৩০০ লিটার)',
    totalAmount: 38000,
    downPayment: 10000,
    paidAmount: 18000,
    perInstallment: 4000,
    totalInstallments: 10,
    paidInstallments: 4,
    dueDate: '2026-09-20',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'inst-2',
    customerName: 'আব্দুল করিম',
    phone: '01819988776',
    customerAddress: 'দক্ষিণ পাড়া',
    guarantorName: 'রশিদ মিয়া',
    guarantorPhone: '01819000000',
    productName: 'ভিশন এলইডি টিভি ৪৩ ইঞ্চি',
    totalAmount: 26000,
    downPayment: 6000,
    paidAmount: 12000,
    perInstallment: 3500,
    totalInstallments: 8,
    paidInstallments: 3,
    dueDate: '2026-09-15',
    status: 'overdue',
    createdAt: new Date().toISOString()
  },
  {
    id: 'inst-3',
    customerName: 'শাহীন আলম',
    phone: '01912345678',
    customerAddress: 'স্টেশন রোড',
    productName: 'গ্যাস স্টোভ ও সিলিন্ডার সেট',
    totalAmount: 9500,
    downPayment: 2000,
    paidAmount: 9500,
    perInstallment: 2000,
    totalInstallments: 5,
    paidInstallments: 5,
    dueDate: '2026-08-30',
    status: 'completed',
    createdAt: new Date().toISOString()
  }
];

export default function InstallmentsScreen() {
  const { tenant, theme, themeMode, triggerHaptic, formatPrice, speakAnnouncement, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#4338ca';

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  // Load installments from offline vault or seed initial
  const [plans, setPlans] = useState<InstallmentPlan[]>(() => {
    return (vault as any).installments && (vault as any).installments.length > 0
      ? (vault as any).installments
      : INITIAL_INSTALLMENTS;
  });

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Collect Payment Form
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('cash');
  const [collectNote, setCollectNote] = useState('');

  // Add Installment Form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [prodName, setProdName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [totalMonths, setTotalMonths] = useState('4');
  const [instNote, setInstNote] = useState('');

  // Save changes to offline vault & state
  const syncPlans = (updated: InstallmentPlan[]) => {
    setPlans(updated);
    saveLocalVaultSnapshot(tenant.id, { installments: updated } as any);
    refreshVault();
  };

  // Derived filtered list
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        (p.guarantorName && p.guarantorName.toLowerCase().includes(q));

      if (filter === 'active') return matchSearch && p.status === 'active';
      if (filter === 'overdue') return matchSearch && p.status === 'overdue';
      if (filter === 'completed') return matchSearch && p.status === 'completed';
      return matchSearch;
    });
  }, [plans, search, filter]);

  const activePlans = plans.filter(p => p.status === 'active' || p.status === 'overdue');
  const totalMarketDue = activePlans.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);
  const overdueCount = plans.filter(p => p.status === 'overdue').length;

  // Auto calculate monthly installment
  const calculatedMonthly = useMemo(() => {
    const tot = Number(totalPrice) || 0;
    const down = Number(downPayment) || 0;
    const months = Math.max(1, Number(totalMonths) || 1);
    const balance = Math.max(0, tot - down);
    return Math.ceil(balance / months);
  }, [totalPrice, downPayment, totalMonths]);

  // Handle Add Installment Submit
  const handleAddSubmit = () => {
    if (!custName.trim() || !prodName.trim() || !totalPrice.trim()) {
      Alert.alert('ভুল', 'কাস্টমারের নাম, পণ্যের নাম ও মোট বিক্রয় মূল্য লিখুন');
      return;
    }

    triggerHaptic('success');
    const tot = Number(totalPrice) || 0;
    const down = Number(downPayment) || 0;
    const months = Math.max(1, Number(totalMonths) || 1);
    const perInst = Math.ceil(Math.max(0, tot - down) / months);

    // Calculate due date (30 days from now)
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const dueDateStr = due.toISOString().split('T')[0];

    const newPlan: InstallmentPlan = {
      id: 'inst-' + Date.now(),
      customerName: custName.trim(),
      phone: custPhone.trim() || '01700000000',
      customerAddress: custAddress.trim(),
      guarantorName: guarantorName.trim(),
      guarantorPhone: guarantorPhone.trim(),
      productName: prodName.trim(),
      totalAmount: tot,
      downPayment: down,
      paidAmount: down,
      perInstallment: perInst,
      totalInstallments: months,
      paidInstallments: down > 0 ? 0 : 0,
      dueDate: dueDateStr,
      status: tot <= down ? 'completed' : 'active',
      notes: instNote.trim(),
      createdAt: new Date().toISOString()
    };

    const updated = [newPlan, ...plans];
    syncPlans(updated);

    // Reset Form
    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setGuarantorName('');
    setGuarantorPhone('');
    setProdName('');
    setTotalPrice('');
    setDownPayment('');
    setTotalMonths('4');
    setInstNote('');
    setShowAddModal(false);

    playNativeChime('cash');
    const msg = `${newPlan.customerName} এর নামে ${newPlan.productName} এর কিস্তি হিসাব সফলভাবে তৈরি হয়েছে`;
    speakAnnouncement(msg);
  };

  // Open Collect Modal
  const openCollect = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    const remaining = plan.totalAmount - plan.paidAmount;
    const defaultAmt = Math.min(remaining, plan.perInstallment);
    setCollectAmount(String(defaultAmt));
    setCollectMethod('cash');
    setCollectNote('');
    setShowCollectModal(true);
    triggerHaptic('light');
  };

  // Handle Collect Payment Submit
  const handleCollectSubmit = () => {
    if (!selectedPlan) return;
    const amount = Number(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('ভুল', 'সঠিক কিস্তির টাকার পরিমাণ দিন');
      return;
    }

    triggerHaptic('success');
    const updated = plans.map(p => {
      if (p.id === selectedPlan.id) {
        const newPaid = Math.min(p.totalAmount, p.paidAmount + amount);
        const newPaidInst = p.paidInstallments + 1;
        const newStatus = newPaid >= p.totalAmount ? 'completed' : 'active';
        
        // Push next due date by 30 days if active
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        
        return {
          ...p,
          paidAmount: newPaid,
          paidInstallments: newPaidInst,
          dueDate: nextDue.toISOString().split('T')[0],
          status: newStatus as any
        };
      }
      return p;
    });

    syncPlans(updated);
    setShowCollectModal(false);
    playNativeChime('cash');
    const rem = selectedPlan.totalAmount - (selectedPlan.paidAmount + amount);
    const msg = `${selectedPlan.customerName} এর ৳${amount} টাকা কিস্তি আদায় হয়েছে। অবশিষ্ট বাকি ৳${Math.max(0, rem)}`;
    speakAnnouncement(msg);
    Alert.alert('কিস্তি জমা সফল ✅', msg);
  };

  // Send WhatsApp Reminder
  const sendWhatsAppReminder = (plan: InstallmentPlan) => {
    triggerHaptic('medium');
    const remaining = plan.totalAmount - plan.paidAmount;
    const msg = `আসসালামু আলাইকুম ${plan.customerName} ভাই,\n` +
      `আপনার ${tenant.shopName || 'দোকান'} থেকে নেওয়া "${plan.productName}" পণ্যের মাসিক কিস্তি ৳${plan.perInstallment} আগামী ${plan.dueDate} তারিখের মধ্যে পরিশোধের জন্য অনুরোধ করা হলো।\n\n` +
      `📊 বর্তমান মোট বাকি কিস্তি: ৳${remaining}\n` +
      `💳 বিকাশ/নগদ পাঠাতে: ${tenant.phone || ''}\n\n` +
      `ধন্যবাদান্তে,\n${tenant.shopName || ''}\n${tenant.ownerName || ''} (${tenant.phone || ''})`;

    const phoneClean = (plan.phone || '').replace(/\D/g, '');
    const fullPhone = phoneClean.startsWith('88') ? phoneClean : `88${phoneClean}`;
    const url = `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Alert.alert('হোয়াটসঅ্যাপ পাওয়া যায়নি', 'অনুগ্রহ করে হোয়াটসঅ্যাপ ইন্সটল করুন।');
    });
  };

  // Handle Delete Plan
  const handleDeletePlan = (plan: InstallmentPlan) => {
    Alert.alert(
      'কিস্তি রেকর্ড মুছবেন?',
      `"${plan.customerName}"-এর ${plan.productName} কিস্তির হিসাব মুছে ফেলা হবে।`,
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'হ্যাঁ, মুছুন',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            const updated = plans.filter(p => p.id !== plan.id);
            syncPlans(updated);
            speakAnnouncement(`${plan.customerName} এর কিস্তি রেকর্ড মুছে ফেলা হয়েছে`);
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <Stack.Screen
        options={{
          title: '📅 বাকির কিস্তি খাতা',
          headerStyle: { backgroundColor: primaryColor },
          headerTintColor: '#ffffff',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => {
                triggerHaptic('light');
                setShowAddModal(true);
              }}
            >
              <Text style={styles.headerAddBtnText}>+ নতুন কিস্তি</Text>
            </TouchableOpacity>
          )
        }}
      />

      {/* 📊 KPI Header Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff' }]}>
          <Text style={[styles.kpiLabel, { color: isDark ? '#c7d2fe' : '#3730a3' }]}>মোট বকেয়া কিস্তি পাওনা</Text>
          <Text style={[styles.kpiVal, { color: isDark ? '#ffffff' : primaryColor }]}>{formatPrice(totalMarketDue)}</Text>
          <Text style={[styles.kpiSub, { color: isDark ? '#a5b4fc' : '#4338ca' }]}>{activePlans.length} টি চলমান কিস্তি</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: isDark ? '#450a0a' : '#fee2e2' }]}>
          <Text style={[styles.kpiLabel, { color: isDark ? '#fca5a5' : '#991b1b' }]}>জরুরি কিস্তি বাকি</Text>
          <Text style={[styles.kpiVal, { color: '#dc2626' }]}>{overdueCount} জন</Text>
          <Text style={[styles.kpiSub, { color: isDark ? '#fca5a5' : '#b91c1c' }]}>মেয়াদ শেষ হয়েছে</Text>
        </View>
      </View>

      {/* 🔍 Search & Filter Row */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          placeholder="🔍 কাস্টমার, ফোন বা পণ্যের নাম খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && { backgroundColor: primaryColor, borderColor: primaryColor }]}
            onPress={() => { triggerHaptic('light'); setFilter('all'); }}
          >
            <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>সব ({plans.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'overdue' && { backgroundColor: '#dc2626', borderColor: '#dc2626' }]}
            onPress={() => { triggerHaptic('light'); setFilter('overdue'); }}
          >
            <Text style={[styles.filterBtnText, filter === 'overdue' && styles.filterBtnTextActive]}>⚠️ মেয়াদ শেষ ({overdueCount})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'active' && { backgroundColor: '#2563eb', borderColor: '#2563eb' }]}
            onPress={() => { triggerHaptic('light'); setFilter('active'); }}
          >
            <Text style={[styles.filterBtnText, filter === 'active' && styles.filterBtnTextActive]}>চলমান কিস্তি</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'completed' && { backgroundColor: '#16a34a', borderColor: '#16a34a' }]}
            onPress={() => { triggerHaptic('light'); setFilter('completed'); }}
          >
            <Text style={[styles.filterBtnText, filter === 'completed' && styles.filterBtnTextActive]}>পরিশোধিত</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 📜 Installment List */}
      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: 150 }]}>
        {filteredPlans.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>কোনো কিস্তির হিসাব পাওয়া যায়নি</Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: primaryColor }]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyAddBtnText}>+ প্রথম কিস্তি তৈরি করুন</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPlans.map(plan => {
            const remaining = plan.totalAmount - plan.paidAmount;
            const progressPercent = Math.min(100, Math.round((plan.paidAmount / plan.totalAmount) * 100)) || 0;
            const isCompleted = plan.status === 'completed';
            const isOverdue = plan.status === 'overdue';

            return (
              <View
                key={plan.id}
                style={[
                  styles.card,
                  { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
                ]}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.customerName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{plan.customerName}</Text>
                    <Text style={[styles.productName, { color: primaryColor }]}>📦 {plan.productName}</Text>
                    <Text style={styles.phoneText}>📱 {plan.phone} {plan.customerAddress ? `• 📍 ${plan.customerAddress}` : ''}</Text>
                    {plan.guarantorName ? (
                      <Text style={styles.guarantorText}>🤝 জামিনদার: {plan.guarantorName} ({plan.guarantorPhone || 'ফোন নেই'})</Text>
                    ) : null}
                  </View>

                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: isCompleted ? '#dcfce7' : isOverdue ? '#fee2e2' : '#e0e7ff' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: isCompleted ? '#16a34a' : isOverdue ? '#dc2626' : '#4338ca' }
                    ]}>
                      {isCompleted ? '✓ পরিশোধিত' : isOverdue ? '⚠️ মেয়াদ শেষ' : '⏳ চলমান'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar & Amount Row */}
                <View style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>
                      কিস্তি আদায়: {plan.paidInstallments}/{plan.totalInstallments} টি ({progressPercent}%)
                    </Text>
                    <Text style={[styles.progressDue, { color: isCompleted ? '#16a34a' : '#dc2626' }]}>
                      বাকি: {formatPrice(remaining)}
                    </Text>
                  </View>

                  <View style={[styles.progressBar, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercent}%`,
                          backgroundColor: isCompleted ? '#16a34a' : isOverdue ? '#dc2626' : primaryColor
                        }
                      ]}
                    />
                  </View>

                  <View style={styles.dueDetailRow}>
                    <Text style={styles.detailText}>মোট: {formatPrice(plan.totalAmount)}</Text>
                    <Text style={styles.detailText}>জমা: {formatPrice(plan.paidAmount)}</Text>
                    <Text style={styles.detailText}>প্রতি কিস্তি: {formatPrice(plan.perInstallment)}</Text>
                    <Text style={[styles.detailText, isOverdue && { color: '#dc2626', fontWeight: '800' }]}>
                      তারিখ: {plan.dueDate}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.btnRow}>
                  {!isCompleted && (
                    <TouchableOpacity
                      style={[styles.collectBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => openCollect(plan)}
                    >
                      <Text style={styles.collectBtnText}>🤲 কিস্তি আদায় ({formatPrice(plan.perInstallment)})</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => sendWhatsAppReminder(plan)}
                  >
                    <Text style={styles.waBtnText}>💬 তাগাদা</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => handleDeletePlan(plan)}
                  >
                    <Text style={styles.delBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ➕ Add Installment Modal with In-Field Voice */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                ➕ নতুন কিস্তির হিসাব খুলুন
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <VoiceInputField
                label="কাস্টমারের নাম *"
                value={custName}
                onChangeText={setCustName}
                placeholder="যেমন: রফিক উদ্দিন"
                required
                promptText="কাস্টমারের নাম মুখে বলুন"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="মোবাইল নম্বর *"
                    value={custPhone}
                    onChangeText={setCustPhone}
                    placeholder="017XXXXXXXX"
                    keyboardType="phone-pad"
                    isNumeric
                    required
                    promptText="মোবাইল নম্বর মুখে বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="ঠিকানা"
                    value={custAddress}
                    onChangeText={setCustAddress}
                    placeholder="গ্রাম / এলাকা"
                    promptText="ঠিকানা মুখে বলুন"
                  />
                </View>
              </View>

              <VoiceInputField
                label="পণ্যের নাম ও মডেল *"
                value={prodName}
                onChangeText={setProdName}
                placeholder="যেমন: ওয়ালটন ফ্রিজ ২২০ লিটার"
                required
                promptText="পণ্যের নাম মুখে বলুন"
              />

              {/* 💡 Quick stock product chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {vault.products.slice(0, 6).map((prod: ProductItem) => (
                  <TouchableOpacity
                    key={prod.id}
                    style={styles.stockChip}
                    onPress={() => {
                      setProdName(prod.name);
                      setTotalPrice(String(prod.price));
                      triggerHaptic('light');
                    }}
                  >
                    <Text style={styles.stockChipText}>{prod.icon || '📦'} {prod.name} (৳{prod.price})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="মোট বিক্রয় মূল্য (৳) *"
                    value={totalPrice}
                    onChangeText={setTotalPrice}
                    placeholder="৳ ২৫০০০"
                    isNumeric
                    keyboardType="numeric"
                    required
                    promptText="মোট বিক্রয় মূল্য কত টাকা বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="প্রারম্ভিক জমা / ডাউন পেমেন্ট (৳)"
                    value={downPayment}
                    onChangeText={setDownPayment}
                    placeholder="৳ ৫০০০"
                    isNumeric
                    keyboardType="numeric"
                    promptText="ডাউন পেমেন্ট কত টাকা জমা দিয়েছেন বলুন"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="মোট কিস্তির সংখ্যা (মাস) *"
                    value={totalMonths}
                    onChangeText={setTotalMonths}
                    placeholder="৪"
                    isNumeric
                    keyboardType="numeric"
                    required
                    promptText="কত মাসের কিস্তি মুখে বলুন"
                  />
                </View>
                <View style={[styles.calcBox, { backgroundColor: isDark ? '#1e1b4b' : '#f0fdf4' }]}>
                  <Text style={styles.calcBoxLabel}>মাসিক কিস্তি:</Text>
                  <Text style={[styles.calcBoxVal, { color: primaryColor }]}>{formatPrice(calculatedMonthly)}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="জামিনদারের নাম"
                    value={guarantorName}
                    onChangeText={setGuarantorName}
                    placeholder="যেমন: সালাম ভাই"
                    promptText="জামিনদারের নাম বলুন"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <VoiceInputField
                    label="জামিনদারের ফোন"
                    value={guarantorPhone}
                    onChangeText={setGuarantorPhone}
                    placeholder="01XXXXXXXXX"
                    keyboardType="phone-pad"
                    isNumeric
                    promptText="জামিনদারের ফোন নম্বর বলুন"
                  />
                </View>
              </View>

              <VoiceInputField
                label="মন্তব্য / নোট"
                value={instNote}
                onChangeText={setInstNote}
                placeholder="অন্যান্য কোনো শর্ত..."
                promptText="মন্তব্য মুখে বলুন"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleAddSubmit}>
                <Text style={styles.saveBtnText}>কিস্তি সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🤲 Collect Installment Payment Modal with In-Field Voice */}
      <Modal visible={showCollectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                🤲 কিস্তির টাকা জমা গ্রহণ
              </Text>
              <TouchableOpacity onPress={() => setShowCollectModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.collectCust}>{selectedPlan?.customerName} • 📱 {selectedPlan?.phone}</Text>
            <Text style={styles.collectProd}>📦 {selectedPlan?.productName}</Text>

            <View style={styles.collectStatRow}>
              <Text style={styles.collectStat}>মোট: {formatPrice(selectedPlan?.totalAmount || 0)}</Text>
              <Text style={styles.collectStat}>পরিশোধ: {formatPrice(selectedPlan?.paidAmount || 0)}</Text>
              <Text style={[styles.collectStat, { color: '#dc2626', fontWeight: '800' }]}>
                বাকি: {formatPrice((selectedPlan?.totalAmount || 0) - (selectedPlan?.paidAmount || 0))}
              </Text>
            </View>

            <VoiceInputField
              label="কিস্তি আদায়ের পরিমাণ (৳) *"
              value={collectAmount}
              onChangeText={setCollectAmount}
              placeholder={String(selectedPlan?.perInstallment || '৳ ২০০০')}
              isNumeric
              keyboardType="numeric"
              required
              promptText="কত টাকা কিস্তি জমা নিলেন মুখে বলুন"
            />

            <Text style={styles.methodLabel}>পেমেন্ট মাধ্যম:</Text>
            <View style={styles.methodRow}>
              {['cash', 'bkash', 'nagad'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodChip,
                    collectMethod === m && { backgroundColor: primaryColor, borderColor: primaryColor }
                  ]}
                  onPress={() => setCollectMethod(m)}
                >
                  <Text style={[styles.methodText, collectMethod === m && { color: '#ffffff' }]}>
                    {m === 'cash' ? '💵 ক্যাশ' : m === 'bkash' ? '📱 বিকাশ' : '📲 নগদ'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <VoiceInputField
              label="মন্তব্য / রিসিট নম্বর"
              value={collectNote}
              onChangeText={setCollectNote}
              placeholder="ঐচ্ছিক..."
              promptText="মন্তব্য মুখে বলুন"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCollectModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10b981' }]} onPress={handleCollectSubmit}>
                <Text style={styles.saveBtnText}>জমা সম্পন্ন করুন</Text>
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
  headerAddBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  headerAddBtnText: { color: '#4338ca', fontWeight: '900', fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, padding: 12 },
  kpiCard: { flex: 1, padding: 14, borderRadius: 14, elevation: 1 },
  kpiLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  kpiVal: { fontSize: 20, fontWeight: '900', marginVertical: 2 },
  kpiSub: { fontSize: 10.5, fontWeight: '600' },
  searchSection: { padding: 10, borderBottomWidth: 1, gap: 8 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1' },
  filterBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterBtnTextActive: { color: '#ffffff', fontWeight: '800' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  emptyAddBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  emptyAddBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 15, fontWeight: '900' },
  productName: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  phoneText: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  guarantorText: { fontSize: 10.5, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  progressSection: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  progressDue: { fontSize: 13, fontWeight: '900' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  dueDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  detailText: { fontSize: 10.5, color: '#64748b' },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' },
  collectBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  collectBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  waBtn: { backgroundColor: '#25d366', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  waBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 11.5 },
  delBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  delBtnText: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 20, padding: 18, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  closeBtn: { fontSize: 18, color: '#94a3b8', fontWeight: '700' },
  stockChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  stockChipText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  calcBox: { flex: 1, padding: 8, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: '#bbf7d0' },
  calcBoxLabel: { fontSize: 10.5, color: '#64748b', fontWeight: '600' },
  calcBoxVal: { fontSize: 15, fontWeight: '900', marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' },
  collectCust: { fontSize: 13.5, fontWeight: '800', color: '#4f46e5' },
  collectProd: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  collectStatRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, marginBottom: 10 },
  collectStat: { fontSize: 11, color: '#475569' },
  methodLabel: { fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 4, marginTop: 4 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  methodChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  methodText: { fontSize: 11.5, fontWeight: '700', color: '#334155' }
});
