import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData } from '../src/lib/offlineDataVault';

export default function ReportsScreen() {
  const { tenant } = useAuth();
  const vault = getLocalVaultData(tenant.id);

  const sales = vault.sales || [];
  const expenses = vault.expenses || [];
  const customers = vault.customers || [];
  const products = vault.products || [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter((s: any) => (s.createdAt || '').startsWith(todayStr));
  const todayExpenses = expenses.filter((e: any) => (e.date || '').startsWith(todayStr));

  const totalSold = todaySales.reduce((acc: number, s: any) => acc + Number(s.totalAmount || 0), 0);
  const totalCash = todaySales.reduce((acc: number, s: any) => acc + Number(s.paidAmount || 0), 0);
  const totalExpense = todayExpenses.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
  const totalDueGiven = todaySales.reduce((acc: number, s: any) => acc + Number(s.dueAmount || 0), 0);
  const totalMarketDue = customers.reduce((acc: number, c: any) => acc + Number(c.totalDue || 0), 0);
  const estimatedProfit = Math.round(totalSold * 0.2 - totalExpense);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 📊 Today's Executive Financial Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>আজকের মোট নিট লাভ (আনুমানিক)</Text>
        <Text style={styles.heroProfit}>৳{estimatedProfit.toLocaleString('en-US')}</Text>
        <Text style={styles.heroSub}>মোট বিক্রি: ৳{totalSold.toLocaleString('en-US')} | খরচ: ৳{totalExpense.toLocaleString('en-US')}</Text>
      </View>

      {/* 📋 Breakdown Cards */}
      <Text style={styles.sectionTitle}>বিস্তারিত আর্থিক হিসাব</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>আজকের মোট বিক্রি</Text>
          <Text style={[styles.val, { color: '#059669' }]}>৳{totalSold.toLocaleString('en-US')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>নগদ ক্যাশ কালেকশন</Text>
          <Text style={[styles.val, { color: '#2563eb' }]}>৳{totalCash.toLocaleString('en-US')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>আজকের নতুন বাকি প্রদান</Text>
          <Text style={[styles.val, { color: '#d97706' }]}>৳{totalDueGiven.toLocaleString('en-US')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>আজকের দোকান খরচ</Text>
          <Text style={[styles.val, { color: '#dc2626' }]}>- ৳{totalExpense.toLocaleString('en-US')}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1.5, borderTopColor: '#e2e8f0', paddingTop: 10, marginTop: 4 }]}>
          <Text style={styles.totalBold}>বাজারে মোট বকেয়া বাকি</Text>
          <Text style={styles.dueTotal}>৳{totalMarketDue.toLocaleString('en-US')}</Text>
        </View>
      </View>

      {/* 📦 Inventory Health */}
      <Text style={styles.sectionTitle}>ইনভেন্টরি স্থিতি</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>মোট নিবন্ধিত পণ্য</Text>
          <Text style={styles.val}>{products.length} প্রকার</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>মোট মেমো তৈরি হয়েছে</Text>
          <Text style={styles.val}>{todaySales.length} টি</Text>
        </View>
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
    paddingBottom: 40
  },
  heroCard: {
    backgroundColor: '#059669',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700'
  },
  heroProfit: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  label: {
    fontSize: 13.5,
    color: '#334155',
    fontWeight: '600'
  },
  val: {
    fontSize: 15,
    fontWeight: '800'
  },
  totalBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  dueTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#dc2626'
  }
});
