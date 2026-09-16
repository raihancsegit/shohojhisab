import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import {
  getLocalVaultData,
  DEMO_SHOPS,
  VaultState
} from '../../src/lib/offlineDataVault';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    tenant,
    theme,
    activeRoleMode,
    switchRoleMode,
    switchShop,
    isSoundboxEnabled,
    toggleSoundbox,
    speakAnnouncement,
    triggerHaptic,
    formatPrice,
    vaultVersion
  } = useAuth();

  const [showShopModal, setShowShopModal] = useState(false);

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  // Aggregate stats
  const totalSalesAmount = vault.sales.reduce((acc, s) => acc + (s.total || 0), 0);
  const totalCashCollected = vault.sales.filter(s => s.paymentMethod !== 'due').reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalMarketDue = vault.customers.reduce((acc, c) => acc + (c.totalDue || 0), 0);
  const totalStockCount = vault.products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockProducts = vault.products.filter(p => p.stock < 10);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 🏬 Top Store Header Card */}
      <View style={[styles.storeCard, { backgroundColor: theme.primary }]}>
        <View style={styles.storeHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.industryBadge}>
              <Text style={styles.industryBadgeText}>{tenant.icon || '🏪'} {tenant.industryName || 'মুদি ও ডিপার্টমেন্টাল'}</Text>
            </View>
            <Text style={styles.shopName}>{tenant.shopName}</Text>
            <Text style={styles.ownerText}>
              {activeRoleMode === 'owner' ? '👑 মালিক মোড' : '👤 কর্মচারী মোড'} | 🟢 অফলাইন সক্রিয়
            </Text>
          </View>

          {/* Soundbox & Shop Switch Buttons */}
          <View style={styles.headerActionCol}>
            <TouchableOpacity
              style={[styles.iconCircleBtn, isSoundboxEnabled && styles.soundboxActive]}
              onPress={toggleSoundbox}
            >
              <Text style={styles.btnIcon}>{isSoundboxEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shopSwitchBtn]}
              onPress={() => {
                triggerHaptic('medium');
                setShowShopModal(true);
              }}
            >
              <Text style={styles.shopSwitchBtnText}>দোকান বদলান ⇄</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 📊 Today's KPI Summary Grid */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>📈 আজকের ব্যবসার সারসংক্ষেপ</Text>
      </View>

      <View style={styles.kpiGrid}>
        {/* Total Sales */}
        <View style={[styles.kpiCard, { borderColor: '#e2e8f0' }]}>
          <Text style={styles.kpiLabel}>আজকের বিক্রি</Text>
          <Text style={[styles.kpiValue, { color: '#059669' }]}>{formatPrice(totalSalesAmount)}</Text>
          <Text style={styles.kpiSub}>মেমো: {vault.sales.length} টি</Text>
        </View>

        {/* Cash In Drawer */}
        <View style={[styles.kpiCard, { borderColor: '#e2e8f0' }]}>
          <Text style={styles.kpiLabel}>ক্যাশ জমা</Text>
          <Text style={[styles.kpiValue, { color: '#2563eb' }]}>{formatPrice(totalCashCollected)}</Text>
          <Text style={styles.kpiSub}>নগদ ক্যাশ ড্রয়ার</Text>
        </View>

        {/* Market Due */}
        <View style={[styles.kpiCard, { borderColor: '#e2e8f0' }]}>
          <Text style={styles.kpiLabel}>বাজারে মোট বাকি</Text>
          <Text style={[styles.kpiValue, { color: '#d97706' }]}>{formatPrice(totalMarketDue)}</Text>
          <Text style={styles.kpiSub}>কাস্টমার: {vault.customers.length} জন</Text>
        </View>

        {/* Stock Status */}
        <View style={[styles.kpiCard, { borderColor: '#e2e8f0' }]}>
          <Text style={styles.kpiLabel}>দোকানের মোট স্টক</Text>
          <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{totalStockCount} একক</Text>
          <Text style={styles.kpiSub}>পণ্য: {vault.products.length} প্রকার</Text>
        </View>
      </View>

      {/* ⚡ Quick Action Grid */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>⚡ দ্রুত অ্যাকশন</Text>
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
          <Text style={styles.actionIcon}>📖</Text>
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
          <Text style={styles.actionIcon}>☕</Text>
          <Text style={styles.actionTitle}>খরচ খাতা</Text>
        </TouchableOpacity>
      </View>

      {/* ⚠️ Low Stock Alert (If any) */}
      {lowStockProducts.length > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ কম স্টকের সতর্কবার্তা ({lowStockProducts.length} টি পণ্য)</Text>
          <Text style={styles.alertSub}>
            {lowStockProducts.map(p => `${p.name} (${p.stock} ${p.unit})`).join(', ')}
          </Text>
        </View>
      )}

      {/* 📜 Recent Sales List */}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>📋 আজকের সাম্প্রতিক মেমো</Text>
      </View>

      <View style={styles.recentListCard}>
        {vault.sales.length === 0 ? (
          <Text style={styles.emptyText}>আজকে কোনো মেমো তৈরি করা হয়নি</Text>
        ) : (
          vault.sales.slice(0, 5).map(sale => (
            <View key={sale.id} style={styles.saleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.saleInv}>{sale.invoiceNo} • {sale.customerName || 'ক্রেতা'}</Text>
                <Text style={styles.saleItems} numberOfLines={1}>
                  {sale.items?.map(i => `${i.name} (${i.quantity})`).join(', ')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.saleTotal}>{formatPrice(sale.total)}</Text>
                <Text style={[styles.saleMethod, sale.paymentMethod === 'due' ? { color: '#dc2626' } : { color: '#16a34a' }]}>
                  {sale.paymentMethod === 'due' ? 'বাকি' : 'পরিশোধ'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 🏬 Shop Switcher Modal */}
      <Modal visible={showShopModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>দোকান পরিবর্তন করুন</Text>
              <TouchableOpacity onPress={() => setShowShopModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>যে দোকানে কাজ করতে চান সিলেক্ট করুন:</Text>

            <FlatList
              data={DEMO_SHOPS}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isActive = tenant.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.shopItemCard, isActive && styles.shopItemActive]}
                    onPress={() => {
                      switchShop(item);
                      setShowShopModal(false);
                    }}
                  >
                    <Text style={styles.shopItemIcon}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopItemName}>{item.shopName}</Text>
                      <Text style={styles.shopItemSub}>{item.industryName} • {item.ownerName}</Text>
                    </View>
                    {isActive && <Text style={styles.activeCheck}>✓ সক্রিয়</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 90 },
  storeCard: { borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2 },
  storeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  industryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 4 },
  industryBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  shopName: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 2 },
  ownerText: { fontSize: 11.5, color: '#e2e8f0', fontWeight: '600' },
  headerActionCol: { alignItems: 'flex-end', gap: 6 },
  iconCircleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  soundboxActive: { backgroundColor: '#ffffff' },
  btnIcon: { fontSize: 18 },
  shopSwitchBtn: { backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  shopSwitchBtnText: { color: '#0f172a', fontSize: 11, fontWeight: '800' },
  sectionTitleRow: { marginTop: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiCard: { flex: 1, minWidth: '47%', backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, elevation: 1 },
  kpiLabel: { fontSize: 11.5, color: '#64748b', fontWeight: '700', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '900', marginBottom: 2 },
  kpiSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  actionCard: { flex: 1, minWidth: '47%', borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  actionIcon: { fontSize: 26, marginBottom: 4 },
  actionTitle: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  alertCard: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 14 },
  alertTitle: { fontSize: 12.5, fontWeight: '800', color: '#dc2626', marginBottom: 2 },
  alertSub: { fontSize: 11, color: '#991b1b' },
  recentListCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, paddingVertical: 12 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  saleInv: { fontSize: 12.5, fontWeight: '800', color: '#0f172a' },
  saleItems: { fontSize: 11, color: '#64748b' },
  saleTotal: { fontSize: 13.5, fontWeight: '900', color: '#0f172a' },
  saleMethod: { fontSize: 10.5, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  closeBtn: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  modalSub: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  shopItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  shopItemActive: { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' },
  shopItemIcon: { fontSize: 24 },
  shopItemName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  shopItemSub: { fontSize: 11, color: '#64748b' },
  activeCheck: { color: '#4f46e5', fontWeight: '800', fontSize: 12 }
});
