import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { DEMO_SHOPS } from '../src/lib/offlineDataVault';

export default function BranchesScreen() {
  const { tenant, switchShop, theme, triggerHaptic, speakAnnouncement } = useAuth();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '🏢 দোকানের শাখাসমূহ (Branches)',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>মাল্টি-ব্রাঞ্চ সেন্ট্রালাইজড ম্যানেজমেন্ট</Text>
        <Text style={styles.bannerSub}>একই অ্যাকাউন্ট থেকে একাধিক আউটলেট বা গোডাউন পরিচালনা করুন</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {DEMO_SHOPS.map(shop => {
          const isActive = tenant.id === shop.id;
          return (
            <TouchableOpacity
              key={shop.id}
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => {
                triggerHaptic('success');
                switchShop(shop);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Text style={styles.icon}>{shop.icon || '🏪'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.shopName, isActive && styles.shopNameActive]}>{shop.shopName}</Text>
                  <Text style={styles.meta}>📍 {shop.industryName} • 📱 {shop.phone}</Text>
                  <Text style={styles.owner}>মালিক: {shop.ownerName}</Text>
                </View>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeText}>সক্রিয় ব্রাঞ্চ ✓</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  banner: { backgroundColor: '#1e1b4b', padding: 16, margin: 12, borderRadius: 14 },
  bannerTitle: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 11.5, color: '#c7d2fe', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
  cardActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  icon: { fontSize: 24 },
  shopName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  shopNameActive: { color: '#4f46e5', fontWeight: '900' },
  meta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  owner: { fontSize: 11.5, color: '#059669', fontWeight: '700', marginTop: 2 },
  activeBadge: { backgroundColor: '#4f46e5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  activeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
});
