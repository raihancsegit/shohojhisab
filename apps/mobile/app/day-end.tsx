import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function DayEndScreen() {
  const { theme, triggerHaptic, formatPrice, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData();
  const [openingCash, setOpeningCash] = useState('2000');
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  const todaySales = vault.sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const todayExpenses = (vault.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const expectedCash = (parseFloat(openingCash) || 0) + todaySales - todayExpenses;
  const counted = parseFloat(actualCash) || 0;
  const diff = counted - expectedCash;

  const handleCloseDrawer = () => {
    triggerHaptic('success');
    setIsClosed(true);
    speakAnnouncement(`আজকের দিনের ক্যাশ ড্রয়ার হিসাব সফলভাবে সমাপ্ত হয়েছে`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: '🌙 ক্যাশ ড্রয়ার ও দিন শেষ হিসাব',
          headerStyle: { backgroundColor: theme.primaryColor || '#16a34a' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Header Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>⚖️</Text>
        <Text style={styles.bannerTitle}>দিনের ক্যাশ মিলানো (Register Close)</Text>
        <Text style={styles.bannerSub}>আজকের বিক্রি, খরচ এবং ক্যাশ ড্রয়ার মিলিয়ে দেখুন</Text>
      </View>

      {/* Summary Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 আজকের ক্যাশ ফ্লো সারাংশ</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>সকালের প্রারম্ভিক ক্যাশ (Opening):</Text>
          <Text style={styles.rowVal}>{formatPrice(parseFloat(openingCash) || 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>➕ আজকের মোট নগদ বিক্রি (Cash Sales):</Text>
          <Text style={[styles.rowVal, { color: '#16a34a' }]}>{formatPrice(todaySales)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>➖ আজকের মোট দোকান খরচ (Expenses):</Text>
          <Text style={[styles.rowVal, { color: '#dc2626' }]}>{formatPrice(todayExpenses)}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>ড্রয়ারে প্রত্যাশিত ক্যাশ (Expected):</Text>
          <Text style={styles.totalVal}>{formatPrice(expectedCash)}</Text>
        </View>
      </View>

      {/* Count Input Form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💵 ড্রয়ারে গুনে পাওয়া ক্যাশ দিন</Text>
        <TextInput
          style={styles.input}
          placeholder="হাতে গুনে পাওয়া আসল ক্যাশ টাকা (৳)"
          value={actualCash}
          onChangeText={setActualCash}
          keyboardType="numeric"
        />

        {actualCash ? (
          <View style={[styles.diffBox, { backgroundColor: diff >= 0 ? '#f0fdf4' : '#fef2f2' }]}>
            <Text style={styles.diffLabel}>পার্থক্য (Difference):</Text>
            <Text style={[styles.diffVal, { color: diff >= 0 ? '#16a34a' : '#dc2626' }]}>
              {diff >= 0 ? `+${formatPrice(diff)} (উদ্বৃত্ত)` : `${formatPrice(diff)} (ঘাটতি)`}
            </Text>
          </View>
        ) : null}

        <TextInput
          style={[styles.input, { height: 70, marginTop: 8 }]}
          placeholder="মন্তব্য (যদি থাকে)..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          style={[styles.submitBtn, isClosed && { backgroundColor: '#94a3b8' }]}
          onPress={handleCloseDrawer}
          disabled={isClosed}
        >
          <Text style={styles.submitBtnText}>
            {isClosed ? '✓ আজকের ড্রয়ার সমাপ্ত হয়েছে' : '🔒 দিন শেষ করুন ও ক্যাশ ড্রয়ার লক করুন'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, gap: 12 },
  banner: { backgroundColor: '#1e1b4b', padding: 18, borderRadius: 16, alignItems: 'center' },
  bannerIcon: { fontSize: 32, marginBottom: 4 },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 12, color: '#c7d2fe', marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 12.5, color: '#475569' },
  rowVal: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  totalRow: { borderTopWidth: 1.5, borderTopColor: '#cbd5e1', marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: 13.5, fontWeight: '900', color: '#0f172a' },
  totalVal: { fontSize: 16, fontWeight: '900', color: '#4f46e5' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  diffBox: { padding: 10, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  diffLabel: { fontSize: 12.5, fontWeight: '700', color: '#334155' },
  diffVal: { fontSize: 14, fontWeight: '900' },
  submitBtn: { backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  submitBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
});
