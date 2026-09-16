import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot } from '../src/lib/offlineDataVault';

interface InstallmentPlan {
  id: string;
  customerName: string;
  phone: string;
  productName: string;
  totalAmount: number;
  paidAmount: number;
  perInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  dueDate: string;
  status: 'active' | 'completed' | 'overdue';
}

const DEFAULT_INSTALLMENTS: InstallmentPlan[] = [
  {
    id: 'inst-1',
    customerName: 'মো: রফিকুল ইসলাম',
    phone: '01711223344',
    productName: 'ওয়ালটন ফ্রিজ (৩০০ লিটার)',
    totalAmount: 38000,
    paidAmount: 18000,
    perInstallment: 4000,
    totalInstallments: 10,
    paidInstallments: 4,
    dueDate: '2026-09-20',
    status: 'active'
  },
  {
    id: 'inst-2',
    customerName: 'আব্দুল করিম',
    phone: '01819988776',
    productName: 'ভিশন এলইডি টিভি ৪৩ ইঞ্চি',
    totalAmount: 26000,
    paidAmount: 12000,
    perInstallment: 3500,
    totalInstallments: 8,
    paidInstallments: 3,
    dueDate: '2026-09-15',
    status: 'overdue'
  },
  {
    id: 'inst-3',
    customerName: 'শাহীন আলম',
    phone: '01912345678',
    productName: 'গ্যাস স্টোভ ও সিলিন্ডার সেট',
    totalAmount: 9500,
    paidAmount: 9500,
    perInstallment: 2000,
    totalInstallments: 5,
    paidInstallments: 5,
    dueDate: '2026-08-30',
    status: 'completed'
  }
];

export default function InstallmentsScreen() {
  const { theme, triggerHaptic, formatPrice, speakAnnouncement } = useAuth();
  const [plans, setPlans] = useState<InstallmentPlan[]>(DEFAULT_INSTALLMENTS);
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('all');
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);

  const filtered = plans.filter(p => {
    if (filter === 'active') return p.status === 'active';
    if (filter === 'overdue') return p.status === 'overdue';
    return true;
  });

  const totalDue = plans.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0);

  const handleCollect = () => {
    if (!selectedPlan) return;
    triggerHaptic('success');
    const updated = plans.map(p => {
      if (p.id === selectedPlan.id) {
        const newPaid = Math.min(p.totalAmount, p.paidAmount + p.perInstallment);
        const newPaidInst = p.paidInstallments + 1;
        const newStatus = newPaid >= p.totalAmount ? 'completed' : 'active';
        return {
          ...p,
          paidAmount: newPaid,
          paidInstallments: newPaidInst,
          status: newStatus as any
        };
      }
      return p;
    });
    setPlans(updated);
    setShowCollectModal(false);
    speakAnnouncement(`${selectedPlan.customerName} এর কিস্তি ${selectedPlan.perInstallment} টাকা আদায় হয়েছে`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '📅 বাকির কিস্তি কালেকশন',
          headerStyle: { backgroundColor: theme.primaryColor || '#4338ca' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* KPI Header */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#e0e7ff' }]}>
          <Text style={styles.kpiLabel}>মোট বকেয়া কিস্তি পাওনা</Text>
          <Text style={[styles.kpiVal, { color: '#4338ca' }]}>{formatPrice(totalDue)}</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={styles.kpiLabel}>জরুরি কিস্তি বাকি</Text>
          <Text style={[styles.kpiVal, { color: '#dc2626' }]}>
            {plans.filter(p => p.status === 'overdue').length} জন
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>সব ({plans.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'overdue' && styles.filterBtnActive]}
          onPress={() => setFilter('overdue')}
        >
          <Text style={[styles.filterBtnText, filter === 'overdue' && styles.filterBtnTextActive]}>⚠️ মেয়াদ শেষ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'active' && styles.filterBtnActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterBtnText, filter === 'active' && styles.filterBtnTextActive]}>চলমান কিস্তি</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map(plan => {
          const remaining = plan.totalAmount - plan.paidAmount;
          return (
            <View key={plan.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.customerName}>{plan.customerName}</Text>
                  <Text style={styles.productName}>📦 {plan.productName}</Text>
                  <Text style={styles.phone}>📱 {plan.phone}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: plan.status === 'completed' ? '#dcfce7' : plan.status === 'overdue' ? '#fee2e2' : '#e0e7ff' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: plan.status === 'completed' ? '#16a34a' : plan.status === 'overdue' ? '#dc2626' : '#4338ca' }
                  ]}>
                    {plan.status === 'completed' ? 'পরিশোধিত' : plan.status === 'overdue' ? 'মেয়াদোত্তীর্ণ' : 'চলমান'}
                  </Text>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    কিস্তি: {plan.paidInstallments}/{plan.totalInstallments} টি
                  </Text>
                  <Text style={styles.progressDue}>বাকি: {formatPrice(remaining)}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(plan.paidAmount / plan.totalAmount) * 100}%` }
                    ]}
                  />
                </View>
              </View>

              {/* Action */}
              {plan.status !== 'completed' && (
                <TouchableOpacity
                  style={styles.collectBtn}
                  onPress={() => {
                    setSelectedPlan(plan);
                    setShowCollectModal(true);
                  }}
                >
                  <Text style={styles.collectBtnText}>
                    🤲 কিস্তি আদায় ({formatPrice(plan.perInstallment)})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Collect Modal */}
      <Modal visible={showCollectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🤲 কিস্তির টাকা জমা নিন</Text>
            <Text style={styles.modalSub}>{selectedPlan?.customerName}</Text>
            <Text style={styles.modalProduct}>{selectedPlan?.productName}</Text>
            <View style={styles.modalAmountBox}>
              <Text style={styles.modalAmountLabel}>প্রতি কিস্তির কিস্তি ফি:</Text>
              <Text style={styles.modalAmountVal}>{formatPrice(selectedPlan?.perInstallment || 0)}</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCollectModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCollect}>
                <Text style={styles.submitBtnText}>আদায় সম্পন্ন করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  kpiRow: { flexDirection: 'row', gap: 10, padding: 12 },
  kpiCard: { flex: 1, padding: 14, borderRadius: 14 },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  kpiVal: { fontSize: 18, fontWeight: '900' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1' },
  filterBtnActive: { backgroundColor: '#4338ca', borderColor: '#4338ca' },
  filterBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterBtnTextActive: { color: '#ffffff' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  productName: { fontSize: 12, color: '#4338ca', fontWeight: '700', marginTop: 2 },
  phone: { fontSize: 11.5, color: '#64748b', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '800' },
  progressSection: { marginTop: 10 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressText: { fontSize: 11.5, color: '#64748b', fontWeight: '600' },
  progressDue: { fontSize: 12, fontWeight: '800', color: '#dc2626' },
  progressBar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4338ca' },
  collectBtn: { marginTop: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  collectBtnText: { color: '#16a34a', fontWeight: '800', fontSize: 12.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', width: '100%', maxWidth: 360, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  modalSub: { fontSize: 13, fontWeight: '700', color: '#4f46e5', marginTop: 2 },
  modalProduct: { fontSize: 12, color: '#64748b', marginTop: 1 },
  modalAmountBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  modalAmountLabel: { fontSize: 12, color: '#64748b' },
  modalAmountVal: { fontSize: 20, fontWeight: '900', color: '#16a34a', marginTop: 2 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#16a34a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontWeight: '800' },
});
