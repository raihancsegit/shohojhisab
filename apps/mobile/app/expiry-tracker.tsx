import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

interface ExpiryItem {
  id: string;
  name: string;
  category: string;
  batch: string;
  expiryDate: string;
  daysLeft: number;
  stock: number;
  unit: string;
}

const DEMO_EXPIRIES: ExpiryItem[] = [
  { id: 'exp-1', name: 'নাপা এক্সট্রা ৫০০ মি.গ্রা.', category: 'প্যারাসিটামল', batch: 'NX-2024-09', expiryDate: '2026-09-28', daysLeft: 12, stock: 140, unit: 'পাতা' },
  { id: 'exp-2', name: 'অমোডেক্স ২৫০ ক্যাপসুল', category: 'অ্যান্টিবায়োটিক', batch: 'AM-991', expiryDate: '2026-10-05', daysLeft: 19, stock: 45, unit: 'পাতা' },
  { id: 'exp-3', name: 'ফ্রেশ ফুল ক্রিম মিল্ক ১ লিটার', category: 'দুগ্ধজাত', batch: 'ML-088', expiryDate: '2026-09-22', daysLeft: 6, stock: 18, unit: 'প্যাকেট' },
  { id: 'exp-4', name: 'সেভলন অ্যান্টিসেপটিক লিকুইড ১০০ মি.লি.', category: 'ফার্স্ট এইড', batch: 'SV-440', expiryDate: '2026-11-15', daysLeft: 60, stock: 25, unit: 'বোতল' }
];

export default function ExpiryTrackerScreen() {
  const { theme, triggerHaptic } = useAuth();
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const filtered = DEMO_EXPIRIES.filter(item => {
    if (filter === 'critical') return item.daysLeft <= 15;
    if (filter === 'warning') return item.daysLeft > 15 && item.daysLeft <= 30;
    return true;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '⏳ মেয়াদোত্তীর্ণ রাডার (Expiry)',
          headerStyle: { backgroundColor: theme.primaryColor || '#dc2626' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Alert KPI Banner */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={styles.kpiLabel}>জরুরি মেয়াদ শেষ (১৫ দিনে)</Text>
          <Text style={[styles.kpiVal, { color: '#dc2626' }]}>
            {DEMO_EXPIRIES.filter(i => i.daysLeft <= 15).length} টি আইটেম
          </Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={styles.kpiLabel}>আসন্ন মেয়াদ শেষ (৩০ দিনে)</Text>
          <Text style={[styles.kpiVal, { color: '#d97706' }]}>
            {DEMO_EXPIRIES.filter(i => i.daysLeft > 15 && i.daysLeft <= 30).length} টি আইটেম
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>সব ({DEMO_EXPIRIES.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'critical' && styles.filterBtnActive]}
          onPress={() => setFilter('critical')}
        >
          <Text style={[styles.filterBtnText, filter === 'critical' && styles.filterBtnTextActive]}>🚨 ১৫ দিনের মধ্যে</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'warning' && styles.filterBtnActive]}
          onPress={() => setFilter('warning')}
        >
          <Text style={[styles.filterBtnText, filter === 'warning' && styles.filterBtnTextActive]}>⚠️ ৩০ দিনের মধ্যে</Text>
        </TouchableOpacity>
      </View>

      {/* Expiry Items List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map(item => {
          const isCritical = item.daysLeft <= 15;
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>🏷️ {item.category} • ব্যাচ: {item.batch}</Text>
                  <Text style={styles.itemStock}>বর্তমান স্টক: {item.stock} {item.unit}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: isCritical ? '#fee2e2' : '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: isCritical ? '#dc2626' : '#d97706' }]}>
                    {item.daysLeft} দিন বাকি
                  </Text>
                  <Text style={styles.expiryDate}>{item.expiryDate}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  kpiRow: { flexDirection: 'row', gap: 10, padding: 12 },
  kpiCard: { flex: 1, padding: 14, borderRadius: 14 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  kpiVal: { fontSize: 16, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' },
  filterBtnActive: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  filterBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterBtnTextActive: { color: '#ffffff' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  itemMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  itemStock: { fontSize: 11.5, color: '#4f46e5', fontWeight: '700', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  expiryDate: { fontSize: 10, color: '#64748b', marginTop: 2 },
});
