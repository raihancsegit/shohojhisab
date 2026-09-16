import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { getLocalVaultData } from '../../src/lib/offlineDataVault';
import { playNativeChime } from '../../src/lib/offlineAudioEngine';

export default function HomeScreen() {
  const router = useRouter();
  const { tenant, theme, isSoundboxEnabled, toggleSoundbox } = useAuth();
  const vault = getLocalVaultData(tenant.id);

  const sales = vault.sales || [];
  const products = vault.products || [];
  const customers = vault.customers || [];
  const expenses = vault.expenses || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s: any) => (s.createdAt || '').startsWith(todayStr));
  const totalSold = todaySales.reduce((acc: number, s: any) => acc + Number(s.totalAmount || 0), 0);
  const totalCash = todaySales.reduce((acc: number, s: any) => acc + Number(s.paidAmount || 0), 0);
  const totalDue = customers.reduce((acc: number, c: any) => acc + Number(c.totalDue || 0), 0);
  const totalStockCount = products.reduce((acc: number, p: any) => acc + Number(p.stock || 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 🏪 Shop Header Banner */}
      <View style={[styles.headerCard, { backgroundColor: theme.primaryColor }]}>
        <View>
          <Text style={styles.shopCategory}>{theme.icon} {theme.name}</Text>
          <Text style={styles.shopName}>{tenant.shopName}</Text>
          <Text style={styles.ownerSubtitle}>মালিক: {tenant.ownerName} | 🟢 অফলাইন মোড সক্রিয়</Text>
        </View>
        <TouchableOpacity onPress={toggleSoundbox} style={styles.soundboxToggle}>
          <Text style={styles.soundboxIcon}>{isSoundboxEnabled ? '🔊' : '🔇'}</Text>
        </TouchableOpacity>
      </View>

      {/* 📊 Today's KPI Metrics */}
      <Text style={styles.sectionTitle}>📈 আজকের ব্যবসার সারসংক্ষেপ</Text>
      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, { borderColor: '#10b981' }]}>
          <Text style={styles.kpiLabel}>আজকের বিক্রি</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>৳{totalSold.toLocaleString('en-US')}</Text>
          <Text style={styles.kpiSub}>মেমো: {todaySales.length} টি</Text>
        </View>

        <View style={[styles.kpiCard, { borderColor: '#3b82f6' }]}>
          <Text style={styles.kpiLabel}>ক্যাশ জমা</Text>
          <Text style={[styles.kpiValue, { color: '#2563eb' }]}>৳{totalCash.toLocaleString('en-US')}</Text>
          <Text style={styles.kpiSub}>নগদ ক্যাশ ড্রয়ার</Text>
        </View>

        <View style={[styles.kpiCard, { borderColor: '#f59e0b' }]}>
          <Text style={styles.kpiLabel}>বাজারে মোট বাকি</Text>
          <Text style={[styles.kpiValue, { color: '#d97706' }]}>৳{totalDue.toLocaleString('en-US')}</Text>
          <Text style={styles.kpiSub}>কাস্টমার: {customers.length} জন</Text>
        </View>

        <View style={[styles.kpiCard, { borderColor: '#8b5cf6' }]}>
          <Text style={styles.kpiLabel}>দোকানের মোট স্টক</Text>
          <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{totalStockCount} {theme.unit}</Text>
          <Text style={styles.kpiSub}>পণ্য: {products.length} প্রকার</Text>
        </View>
      </View>

      {/* 🚀 Quick Action Buttons */}
      <Text style={styles.sectionTitle}>⚡ দ্রুত অ্যাকশন</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#059669' }]}
          onPress={() => {
            playNativeChime('beep');
            router.push('/(tabs)/pos');
          }}
        >
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionLabel}>নতুন মেমো / POS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
          onPress={() => {
            playNativeChime('beep');
            router.push('/(tabs)/khata');
          }}
        >
          <Text style={styles.actionIcon}>📖</Text>
          <Text style={styles.actionLabel}>বাকির খাতা</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]}
          onPress={() => {
            playNativeChime('beep');
            router.push('/(tabs)/stock');
          }}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionLabel}>মাল তোলা / স্টক</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ea580c' }]}
          onPress={() => {
            playNativeChime('beep');
            router.push('/expenses');
          }}
        >
          <Text style={styles.actionIcon}>☕</Text>
          <Text style={styles.actionLabel}>খরচ এন্ট্রি</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 16,
    paddingBottom: 110
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4
  },
  shopCategory: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2
  },
  shopName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900'
  },
  ownerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: '600'
  },
  soundboxToggle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 14
  },
  soundboxIcon: {
    fontSize: 22
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    marginTop: 6
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    elevation: 2
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b'
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 4
  },
  kpiSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600'
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3
  },
  actionIcon: {
    fontSize: 26,
    marginBottom: 6
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  }
});
