import React, { useState } from 'react';
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

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { tenant, theme, themeMode, triggerHaptic, speakAnnouncement, formatPrice, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const vault = getLocalVaultData(tenant.id);
  const expenses = vault.expenses || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('দোকান খরচ');
  const [voiceText, setVoiceText] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter((e: any) => (e.date || '').startsWith(todayStr));
  const totalToday = todayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  // Quick Voice Expense
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
      category: 'দৈনিক খরচ',
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
    Alert.alert('ভয়েস খরচ যোগ', msg);
  };

  const handleAddExpense = () => {
    const num = Number(amount);
    if (!title.trim() || isNaN(num) || num <= 0) {
      Alert.alert('সতর্কতা', 'খরচের বিবরণ ও সঠিক টাকার পরিমাণ দিন!');
      return;
    }

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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 📊 Daily Expense Header */}
      <View style={[styles.headerCard, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View>
          <Text style={styles.headerLabel}>আজকের মোট দোকান খরচ</Text>
          <Text style={styles.headerValue}>{formatPrice(totalToday)}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            triggerHaptic('light');
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addBtnText}>+ নতুন খরচ</Text>
        </TouchableOpacity>
      </View>

      {/* 🎙️ Voice Expense Quick Bar */}
      <View style={[styles.voiceSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.voiceInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          value={voiceText}
          onChangeText={setVoiceText}
          placeholder="🎙️ মুখে বলে খরচ লিখুন (যেমন: চা নাস্তা ৬০ টাকা)..."
          placeholderTextColor="#94a3b8"
          onSubmitEditing={handleVoiceExpense}
        />
        <TouchableOpacity style={[styles.voiceBtn, { backgroundColor: primaryColor }]} onPress={handleVoiceExpense}>
          <Text style={styles.voiceBtnText}>যোগ ▶</Text>
        </TouchableOpacity>
      </View>

      {/* 📋 Expense History */}
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#cbd5e1' : '#334155' }]}>
          আজকের খরচের তালিকা ({todayExpenses.length} টি)
        </Text>
        <ScrollView
          style={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
          showsVerticalScrollIndicator={false}
        >
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>☕</Text>
              <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>আজ কোনো খরচ লেখা হয়নি</Text>
            </View>
          ) : (
            expenses.map(e => (
              <View
                key={e.id}
                style={[
                  styles.expCard,
                  { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.expTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{e.title}</Text>
                  <Text style={styles.expDate}>{e.date || 'আজ'} • {e.category || 'দোকান খরচ'}</Text>
                </View>
                <Text style={styles.expAmount}>- {formatPrice(e.amount)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* ➕ Add Expense Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>নতুন খরচ লিপিবদ্ধ করুন</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="খরচের বিবরণ (যেমন: চা নাস্তা, বিদ্যুৎ বিল)..."
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="টাকার পরিমাণ (৳)..."
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleAddExpense}>
                <Text style={styles.saveText}>খরচ সংরক্ষণ</Text>
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
  headerCard: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18
  },
  headerLabel: { color: '#e0e7ff', fontSize: 12, fontWeight: '600' },
  headerValue: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 2 },
  addBtn: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 12.5 },
  voiceSection: { padding: 10, flexDirection: 'row', gap: 6, borderBottomWidth: 1 },
  voiceInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12 },
  voiceBtn: { borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  voiceBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  list: { flex: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 36 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  expCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  expTitle: { fontSize: 13.5, fontWeight: '800' },
  expDate: { fontSize: 11, color: '#64748b', marginTop: 2 },
  expAmount: { fontSize: 14, fontWeight: '900', color: '#ef4444' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, marginBottom: 10, fontSize: 13, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: '700' },
  saveBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: '800' }
});
