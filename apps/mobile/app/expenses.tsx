import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';
import VoiceInputField from '../src/components/VoiceInputField';

const EXPENSE_CATEGORIES = ['সব খরচ', 'দোকান ভাড়া', 'বিদ্যুৎ বিল', 'কর্মচারী বেতন', 'চা-নাস্তা', 'পরিবহন', 'প্যাকেজিং', 'অন্যান্য'];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, speakAnnouncement, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const expenses = vault.expenses || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState('সব খরচ');
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('চা-নাস্তা');
  const [voiceText, setVoiceText] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter((e: any) => (e.date || '').startsWith(todayStr));
  const totalToday = todayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  const totalAllTime = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e: any) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || (e.title || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q);
      const matchCat = selectedCat === 'সব খরচ' || e.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [expenses, search, selectedCat]);

  // Quick Voice Expense (Ultra Voice memo)
  const handleVoiceExpense = () => {
    const text = voiceText.trim();
    if (!text) return;

    triggerHaptic('medium');
    playNativeChime('beep');

    const numMatch = text.match(/(\d+)/);
    const cost = numMatch ? parseInt(numMatch[1], 10) : 50;
    const cleanTitle = text.replace(/(\d+)|টাকা|খরচ|লেখো|করলাম|হয়েছে/g, '').trim() || 'দৈনিক খরচ';

    const newExp = {
      id: `exp-off-${Date.now()}`,
      title: cleanTitle,
      amount: cost,
      category: 'চা-নাস্তা',
      date: todayStr,
      createdAt: new Date().toISOString()
    };

    saveLocalVaultSnapshot(tenant.id, {
      expenses: [newExp, ...expenses]
    });

    setVoiceText('');
    refreshVault();
    playNativeChime('cash');
    const msg = `${cleanTitle} ৳${cost} টাকা খরচ লেখা হয়েছে`;
    speakNativeText(msg);
    Alert.alert('ভয়েস খরচ যোগ ✅', msg);
  };

  const handleAddExpense = () => {
    const num = Number(amount);
    if (!title.trim() || isNaN(num) || num <= 0) {
      Alert.alert('সতর্কতা', 'খরচের বিবরণ ও সঠিক টাকার পরিমাণ দিন!');
      return;
    }

    triggerHaptic('success');
    const newExp = {
      id: `exp-off-${Date.now()}`,
      title: title.trim(),
      amount: num,
      category,
      date: todayStr,
      createdAt: new Date().toISOString()
    };

    saveLocalVaultSnapshot(tenant.id, {
      expenses: [newExp, ...expenses]
    });

    playNativeChime('cash');
    speakAnnouncement(`${newExp.title} ৳${num} টাকা খরচ লেখা হয়েছে`);
    setShowAddModal(false);
    setTitle('');
    setAmount('');
    refreshVault();
  };

  const handleDeleteExpense = (id: string, expTitle: string) => {
    Alert.alert('খরচ মুছবেন?', `"${expTitle}" খরচের এন্ট্রি মুছে ফেলতে চান?`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ, মুছুন',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('medium');
          const updated = expenses.filter((e: any) => e.id !== id);
          saveLocalVaultSnapshot(tenant.id, { expenses: updated });
          refreshVault();
          speakAnnouncement('খরচের এন্ট্রি মুছে ফেলা হয়েছে');
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Daily Expense Header */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>আজকের মোট খরচ</Text>
            <Text style={styles.headerTotal}>{formatPrice(totalToday)}</Text>
            <Text style={styles.headerCount}>{todayExpenses.length} টি ভাউচার</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.headerSub}>দোকানের মোট খরচ</Text>
            <Text style={styles.headerAllTime}>{formatPrice(totalAllTime)}</Text>
            <TouchableOpacity
              style={styles.addExpBtn}
              onPress={() => {
                triggerHaptic('light');
                setShowAddModal(true);
              }}
            >
              <Text style={styles.addExpBtnText}>+ নতুন খরচ লিখুন</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🎙️ Voice Expense & Search */}
      <View style={[styles.actionSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.voiceRow}>
          <TextInput
            style={[styles.voiceInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
            value={voiceText}
            onChangeText={setVoiceText}
            placeholder="🎙️ মুখে বলুন (যেমন: নাস্তা খরচ ১২০ টাকা)..."
            placeholderTextColor="#94a3b8"
            onSubmitEditing={handleVoiceExpense}
          />
          <TouchableOpacity style={[styles.voiceBtn, { backgroundColor: primaryColor }]} onPress={handleVoiceExpense}>
            <Text style={styles.voiceBtnText}>যোগ ▶</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          value={search}
          onChangeText={setSearch}
          placeholder="🔍 খরচের বিবরণ বা খাত খুঁজুন..."
          placeholderTextColor="#94a3b8"
        />

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {EXPENSE_CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.catPill,
                selectedCat === c && { backgroundColor: primaryColor, borderColor: primaryColor }
              ]}
              onPress={() => { triggerHaptic('light'); setSelectedCat(c); }}
            >
              <Text style={[styles.catPillText, selectedCat === c && styles.catPillTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 📜 Expense Items List */}
      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: 150 }]}>
        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>কোনো খরচের হিসাব পাওয়া যায়নি</Text>
          </View>
        ) : (
          filteredExpenses.map((e: any) => (
            <View
              key={e.id}
              style={[
                styles.expCard,
                { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.expTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{e.title}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                  <View style={styles.expCatBadge}>
                    <Text style={styles.expCatText}>{e.category || 'সাধারণ খরচ'}</Text>
                  </View>
                  <Text style={styles.expDate}>{e.date || todayStr}</Text>
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.expAmount}>{formatPrice(e.amount)}</Text>
                <TouchableOpacity onPress={() => handleDeleteExpense(e.id, e.title)}>
                  <Text style={{ fontSize: 11, color: '#dc2626' }}>🗑️ ডিলিট</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ➕ Add Expense Modal with In-Field Voice */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                ➕ নতুন খরচ লিখুন
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <VoiceInputField
              label="খরচের বিবরণ *"
              value={title}
              onChangeText={setTitle}
              placeholder="যেমন: দোকানের চা-নাস্তা ও বিস্কুট"
              required
              promptText="খরচের বিবরণ মুখে বলুন"
            />

            <VoiceInputField
              label="টাকার পরিমাণ (৳) *"
              value={amount}
              onChangeText={setAmount}
              placeholder="যেমন: ১২০"
              isNumeric
              keyboardType="numeric"
              required
              promptText="খরচের পরিমাণ কত টাকা বলুন"
            />

            {/* Category Select Chips */}
            <Text style={styles.inputLabel}>খরচের খাত বা ক্যাটাগরি:</Text>
            <View style={styles.modalCatRow}>
              {['চা-নাস্তা', 'বিদ্যুৎ বিল', 'দোকান ভাড়া', 'পরিবহন', 'কর্মচারী', 'অন্যান্য'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.modalCatChip,
                    category === c && { backgroundColor: primaryColor, borderColor: primaryColor }
                  ]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.modalCatText, category === c && { color: '#ffffff', fontWeight: '800' }]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleAddExpense}>
                <Text style={styles.saveBtnText}>খরচ সংরক্ষণ</Text>
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
  headerCard: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSub: { fontSize: 11.5, color: '#e0e7ff', fontWeight: '600' },
  headerTotal: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  headerAllTime: { fontSize: 15, fontWeight: '800', color: '#e0e7ff', marginTop: 2 },
  headerCount: { fontSize: 11, color: '#e0e7ff', marginTop: 2, fontWeight: '600' },
  addExpBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 6 },
  addExpBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 11.5 },
  actionSection: { padding: 10, borderBottomWidth: 1, gap: 8 },
  voiceRow: { flexDirection: 'row', gap: 6 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  voiceBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5, borderWidth: 1, borderColor: '#cbd5e1' },
  catScroll: { gap: 6 },
  catPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1' },
  catPillText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  catPillTextActive: { color: '#ffffff', fontWeight: '800' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  expCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, elevation: 1 },
  expTitle: { fontSize: 14, fontWeight: '800' },
  expCatBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  expCatText: { fontSize: 10, color: '#475569', fontWeight: '700' },
  expDate: { fontSize: 10.5, color: '#94a3b8' },
  expAmount: { fontSize: 15, fontWeight: '900', color: '#dc2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  inputLabel: { fontSize: 11.5, fontWeight: '700', color: '#64748b', marginBottom: 4, marginTop: 6 },
  modalCatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  modalCatChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  modalCatText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' }
});
