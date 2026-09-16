import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function NotificationsScreen() {
  const { tenant, theme, triggerHaptic, formatPrice } = useAuth();
  const router = useRouter();
  const vault = getLocalVaultData();
  const [filter, setFilter] = useState<'all' | 'due' | 'stock' | 'system'>('all');

  // Generate intelligent offline notifications from vault data
  const notifications = [];

  // 1. Low stock alerts
  const lowStock = (vault.products || []).filter(p => p.stock <= Number(p.minStockAlert || p.lowStockThreshold || 5));
  lowStock.forEach(p => {
    notifications.push({
      id: `stock-${p.id}`,
      type: 'stock',
      title: `কম স্টকের সতর্কতা: ${p.name}`,
      desc: `দোকানে মাত্র ${p.stock} ${p.unit} অবশিষ্ট আছে। নতুন অর্ডার প্রয়োজন।`,
      time: 'সক্রিয় অ্যালার্ট',
      icon: '📦',
      actionUrl: '/stock',
      actionText: 'স্টক আপডেট'
    });
  });

  // 2. Customer Due alerts
  const dueCust = (vault.customers || []).filter(c => Number(c.totalDue || c.due || 0) > 0);
  dueCust.forEach(c => {
    const custDue = Number(c.totalDue || c.due || 0);
    notifications.push({
      id: `due-${c.id}`,
      type: 'due',
      title: `বকেয়া তাগাদা: ${c.name}`,
      desc: `বর্তমান বাকি ${formatPrice(custDue)}। ১-ক্লিকে হোয়াটসঅ্যাপ বা এসএমএস তাগাদা পাঠান।`,
      time: 'বকেয়া আছে',
      icon: '🔴',
      actionUrl: '/marketing',
      actionText: 'তাগাদা পাঠান'
    });
  });

  // 3. System offline sync
  notifications.push({
    id: 'sys-offline',
    type: 'system',
    title: 'অফলাইন ডাটা সেফগারhover্ড সক্রিয়',
    desc: `আপনার "${tenant.shopName}" এর সকল হিসাব, বিক্রি ও খাতা লোকাল ডিভাইসে সুরক্ষিত আছে।`,
    time: 'অফলাইন সিঙ্ক',
    icon: '⚡',
    actionUrl: '/settings',
    actionText: 'সেটিংস দেখুন'
  });

  const filtered = notifications.filter(n => filter === 'all' || n.type === filter);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '🔔 বিজ্ঞপ্তি ও নোটিফিকেশন',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>
            সবগুলো ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'due' && styles.filterBtnActive]}
          onPress={() => setFilter('due')}
        >
          <Text style={[styles.filterBtnText, filter === 'due' && styles.filterBtnTextActive]}>
            🔴 বাকি তাগাদা
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'stock' && styles.filterBtnActive]}
          onPress={() => setFilter('stock')}
        >
          <Text style={[styles.filterBtnText, filter === 'stock' && styles.filterBtnTextActive]}>
            📦 স্টক এলার্ট
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.desc}>{item.desc}</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  triggerHaptic('light');
                  router.push(item.actionUrl as any);
                }}
              >
                <Text style={styles.actionBtnText}>{item.actionText} →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#4f46e5' },
  filterBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterBtnTextActive: { color: '#ffffff' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 12, alignItems: 'flex-start' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { fontSize: 13.5, fontWeight: '800', color: '#0f172a', flex: 1 },
  time: { fontSize: 10.5, color: '#94a3b8' },
  desc: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 8 },
  actionBtn: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  actionBtnText: { color: '#4f46e5', fontSize: 11.5, fontWeight: '800' },
});
