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

export default function LoyaltyScreen() {
  const { tenant, theme, triggerHaptic, formatPrice, speakAnnouncement } = useAuth();
  const vault = getLocalVaultData();
  const [customers, setCustomers] = useState(vault.customers || []);
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleRedeem = () => {
    if (!selectedCust || !pointsToRedeem) return;
    const pts = parseInt(pointsToRedeem) || 0;
    if (pts <= 0 || pts > (selectedCust.points || 0)) return;

    triggerHaptic('success');
    const discountAmount = Math.floor(pts * 0.5); // 1 point = 0.5 Taka
    const updated = customers.map(c => {
      if (c.id === selectedCust.id) {
        return {
          ...c,
          points: (c.points || 0) - pts
        };
      }
      return c;
    });

    setCustomers(updated);
    vault.customers = updated;
    saveLocalVaultSnapshot(tenant.id, vault);
    setShowModal(false);
    setPointsToRedeem('');
    speakAnnouncement(`${selectedCust.name} এর ${pts} পয়েন্ট রিডিম করে ${discountAmount} টাকা ছাড় দেওয়া হয়েছে`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '🎁 কাস্টমার লয়্যালটি পয়েন্ট',
          headerStyle: { backgroundColor: theme.primaryColor || '#d97706' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Loyalty Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerBadge}>🎁 লয়্যালটি রিওয়ার্ডস প্রোগ্রাম</Text>
        <Text style={styles.bannerTitle}>গ্রাহক পয়েন্ট ও ক্যাশব্যাক ওয়ালেট</Text>
        <Text style={styles.bannerSub}>প্রতি ৳১০০ কেনাকাটায় ১ পয়েন্ট অর্জন • ১০০ পয়েন্ট = ৳৫০ ছাড়</Text>
      </View>

      {/* Customer Loyalty List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {customers.map(cust => {
          const points = cust.points || Math.floor((cust.totalPurchases || 2500) / 100);
          const value = Math.floor(points * 0.5);
          return (
            <View key={cust.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>👑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{cust.name}</Text>
                  <Text style={styles.phone}>📱 {cust.phone}</Text>
                </View>
                <View style={styles.pointBox}>
                  <Text style={styles.pointVal}>{points} পয়েন্ট</Text>
                  <Text style={styles.pointEquiv}>= ৳{value} সমমূল্য</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.redeemBtn}
                onPress={() => {
                  setSelectedCust({ ...cust, points });
                  setShowModal(true);
                }}
              >
                <Text style={styles.redeemBtnText}>🏷️ পয়েন্ট রিডিম করে ছাড় দিন</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Redeem Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>পয়েন্ট রিডিম ও ডিসকাউন্ট</Text>
            <Text style={styles.modalSub}>{selectedCust?.name}</Text>
            <Text style={styles.modalPoints}>বর্তমান অর্জন: {selectedCust?.points || 0} পয়েন্ট</Text>
            <TextInput
              style={styles.input}
              placeholder="কত পয়েন্ট ভাঙাতে চান?"
              value={pointsToRedeem}
              onChangeText={setPointsToRedeem}
              keyboardType="numeric"
              autoFocus
            />
            {pointsToRedeem ? (
              <Text style={styles.discountPreview}>
                গ্রাহক ছাড় পাবেন: ৳{Math.floor((parseInt(pointsToRedeem) || 0) * 0.5)}
              </Text>
            ) : null}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleRedeem}>
                <Text style={styles.submitBtnText}>রিডিম সম্পন্ন</Text>
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
  banner: { backgroundColor: '#78350f', padding: 18, margin: 12, borderRadius: 16 },
  bannerBadge: { color: '#fef08a', fontSize: 11.5, fontWeight: '800', marginBottom: 4 },
  bannerTitle: { fontSize: 16.5, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 11.5, color: '#fde68a', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20 },
  name: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  phone: { fontSize: 11.5, color: '#64748b', marginTop: 1 },
  pointBox: { alignItems: 'flex-end', backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fef3c7' },
  pointVal: { fontSize: 14, fontWeight: '900', color: '#b45309' },
  pointEquiv: { fontSize: 10, color: '#92400e', fontWeight: '700' },
  redeemBtn: { marginTop: 10, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  redeemBtnText: { color: '#b45309', fontWeight: '800', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', width: '100%', maxWidth: 360, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  modalSub: { fontSize: 13, fontWeight: '700', color: '#d97706', marginTop: 2 },
  modalPoints: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  discountPreview: { fontSize: 13, fontWeight: 'bold', color: '#16a34a', marginTop: 8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#d97706', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontWeight: '800' },
});
