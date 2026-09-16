import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useNav } from '../../src/context/NavContext';
import { getLocalVaultData } from '../../src/lib/offlineDataVault';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    tenant,
    theme,
    themeMode,
    activeRoleMode,
    isSoundboxEnabled,
    toggleSoundbox,
    triggerHaptic,
    formatPrice,
    vaultVersion
  } = useAuth();

  const { openShopModal } = useNav();
  const isDark = themeMode === 'dark';

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  // Aggregate stats
  const totalSalesAmount = vault.sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalCashCollected = vault.sales.filter(s => s.paymentMethod !== 'due').reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalMarketDue = vault.customers.reduce((acc, c) => acc + (c.due || c.totalDue || 0), 0);
  const totalStockCount = vault.products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockProducts = vault.products.filter(p => p.stock < (p.lowStockThreshold || 5));

  const handleShareInvoice = (sale: any) => {
    triggerHaptic('light');
    const text = `🧾 *${tenant.shopName}*\n💵 মেমো: #${sale.invoiceNo || sale.id}\n👤 কাস্টমার: ${sale.customerName || 'খুচরা ক্রেতা'}\n💰 মোট: ${formatPrice(sale.total)}\n\nধন্যবাদ! ডিজিটাল রসিদ সংরক্ষিত।`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 🏬 Top Store Header Card with vibrant solid background */}
      <View style={[
        styles.storeCard,
        { backgroundColor: isDark ? '#1e1b4b' : (theme.primaryColor || '#059669') }
      ]}>
        <View style={styles.storeHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.industryBadge}>
              <Text style={styles.industryBadgeText}>
                {theme.icon || '🏪'} {theme.name || 'মুদি ও ডিপার্টমেন্টাল'}
              </Text>
            </View>
            <Text style={styles.shopName} numberOfLines={1}>{tenant.shopName}</Text>
            <Text style={styles.ownerText}>
              {activeRoleMode === 'owner' ? '👑 দোকান মালিক' : '👤 কর্মচারী শিফট'} • 🟢 অফলাইন সক্রিয়
            </Text>
          </View>

          {/* Soundbox & Shop Switch Buttons */}
          <View style={styles.headerActionCol}>
            <TouchableOpacity
              style={[styles.iconCircleBtn, isSoundboxEnabled && styles.soundboxActive]}
              onPress={toggleSoundbox}
            >
              <Text style={styles.btnIcon}>{isSoundboxEnabled ? '🔊' : '🔈'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shopSwitchBtn}
              onPress={() => {
                triggerHaptic('medium');
                openShopModal();
              }}
            >
              <Text style={styles.shopSwitchBtnText}>দোকান বদলান ⇄</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 📈 Today's KPI Summary Grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
          📈 আজকের ব্যবসার সারসংক্ষেপ
        </Text>
      </View>

      <View style={styles.kpiGrid}>
        {/* Total Sales */}
        <View style={[
          styles.kpiCard,
          {
            backgroundColor: isDark ? '#131b2e' : '#ffffff',
            borderColor: isDark ? '#1e293b' : '#e2e8f0'
          }
        ]}>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>আজকের বিক্রি</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>{formatPrice(totalSalesAmount)}</Text>
          <Text style={styles.kpiSub}>মেমো: {vault.sales.length} টি</Text>
        </View>

        {/* Cash In Drawer */}
        <View style={[
          styles.kpiCard,
          {
            backgroundColor: isDark ? '#131b2e' : '#ffffff',
            borderColor: isDark ? '#1e293b' : '#e2e8f0'
          }
        ]}>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>ক্যাশ জমা</Text>
          <Text style={[styles.kpiValue, { color: '#2563eb' }]}>{formatPrice(totalCashCollected)}</Text>
          <Text style={styles.kpiSub}>নগদ ক্যাশ ড্রয়ার</Text>
        </View>

        {/* Market Due */}
        <View style={[
          styles.kpiCard,
          {
            backgroundColor: isDark ? '#131b2e' : '#ffffff',
            borderColor: isDark ? '#1e293b' : '#e2e8f0'
          }
        ]}>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>বাজারে মোট বাকি</Text>
          <Text style={[styles.kpiValue, { color: '#d97706' }]}>{formatPrice(totalMarketDue)}</Text>
          <Text style={styles.kpiSub}>কাস্টমার: {vault.customers.length} জন</Text>
        </View>

        {/* Stock Status */}
        <View style={[
          styles.kpiCard,
          {
            backgroundColor: isDark ? '#131b2e' : '#ffffff',
            borderColor: isDark ? '#1e293b' : '#e2e8f0'
          }
        ]}>
          <Text style={[styles.kpiLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>দোকানের মোট স্টক</Text>
          <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{totalStockCount} একক</Text>
          <Text style={styles.kpiSub}>পণ্য: {vault.products.length} প্রকার</Text>
        </View>
      </View>

      {/* ⚡ Quick Actions Grid */}
      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
          ⚡ দ্রুত অ্যাকশন
        </Text>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#059669' }]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/pos');
          }}
        >
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionTitle}>নতুন মেমো / POS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#2563eb' }]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/khata');
          }}
        >
          <Text style={styles.actionIcon}>📒</Text>
          <Text style={styles.actionTitle}>বাকির খাতা</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#7c3aed' }]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/stock');
          }}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionTitle}>স্টক ইনভেন্টরি</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: '#ea580c' }]}
          onPress={() => {
            triggerHaptic('light');
            router.push('/expenses');
          }}
        >
          <Text style={styles.actionIcon}>💸</Text>
          <Text style={styles.actionTitle}>খরচ খাতা</Text>
        </TouchableOpacity>
      </View>

      {/* ⚠️ Low Stock Alert (If any) */}
      {lowStockProducts.length > 0 && (
        <TouchableOpacity
          style={[styles.alertCard, { backgroundColor: isDark ? '#2a1215' : '#fef2f2', borderColor: isDark ? '#7f1d1d' : '#fecaca' }]}
          onPress={() => router.push('/stock')}
        >
          <Text style={[styles.alertTitle, { color: '#dc2626' }]}>
            ⚠️ কম স্টকের সতর্কবার্তা ({lowStockProducts.length} টি পণ্য)
          </Text>
          <Text style={[styles.alertSub, { color: isDark ? '#fca5a5' : '#991b1b' }]}>
            {lowStockProducts.map(p => `${p.name} (${p.stock} ${p.unit})`).join(', ')}
          </Text>
        </TouchableOpacity>
      )}

      {/* 📋 Recent Sales Section */}
      <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
          📋 আজকের সাম্প্রতিক মেমো ({vault.sales.length} টি)
        </Text>
        <TouchableOpacity onPress={() => router.push('/reports')}>
          <Text style={styles.seeAllText}>সব দেখুন →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.salesList}>
        {vault.sales.slice(0, 5).map(sale => (
          <View
            key={sale.id}
            style={[
              styles.saleCard,
              {
                backgroundColor: isDark ? '#131b2e' : '#ffffff',
                borderColor: isDark ? '#1e293b' : '#e2e8f0'
              }
            ]}
          >
            <View style={styles.saleHeader}>
              <View>
                <Text style={[styles.invoiceNo, { color: isDark ? '#818cf8' : '#4f46e5' }]}>
                  #{sale.invoiceNo || sale.id}
                </Text>
                <Text style={[styles.customerName, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                  {sale.customerName || 'সাধারণ ক্রেতা'}
                </Text>
              </View>
              <View style={styles.salePriceBox}>
                <Text style={[styles.saleTotal, { color: isDark ? '#4ade80' : '#16a34a' }]}>
                  {formatPrice(sale.total)}
                </Text>
                <View style={[
                  styles.payBadge,
                  { backgroundColor: sale.paymentMethod === 'due' ? '#fee2e2' : '#dcfce7' }
                ]}>
                  <Text style={[
                    styles.payBadgeText,
                    { color: sale.paymentMethod === 'due' ? '#dc2626' : '#16a34a' }
                  ]}>
                    {sale.paymentMethod === 'due' ? 'বাকি' : 'নগদ'}
                  </Text>
                </View>
              </View>
            </View>

            {sale.items && sale.items.length > 0 && (
              <Text style={[styles.saleItemsSummary, { color: isDark ? '#94a3b8' : '#64748b' }]} numberOfLines={1}>
                {sale.items.map((i: any) => `${i.productName || i.name} (${i.qty})`).join(', ')}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: isDark ? '#334155' : '#e2e8f0' }]}
              onPress={() => handleShareInvoice(sale)}
            >
              <Text style={styles.shareBtnText}>💬 হোয়াটসঅ্যাপে রসিদ পাঠান</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 130, // Prevent content overlap with FAB and bottom dock
  },
  storeCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  storeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  industryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  industryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  shopName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  ownerText: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  headerActionCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  soundboxActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  btnIcon: {
    fontSize: 18,
  },
  shopSwitchBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  shopSwitchBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  seeAllText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 26,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  alertCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  alertTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  alertSub: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  salesList: {
    gap: 10,
  },
  saleCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNo: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  salePriceBox: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 15,
    fontWeight: '900',
  },
  payBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  payBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  saleItemsSummary: {
    fontSize: 11.5,
    marginTop: 6,
    marginBottom: 8,
  },
  shareBtn: {
    borderTopWidth: 1,
    paddingTop: 8,
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#16a34a',
  },
});
