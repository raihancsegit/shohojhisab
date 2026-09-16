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

interface StaffUser {
  id: string;
  name: string;
  phone: string;
  role: 'cashier' | 'manager' | 'pharmacist' | 'sales';
  roleName: string;
  pin: string;
  isOwner?: boolean;
}

const DEFAULT_STAFF: StaffUser[] = [
  { id: 's-owner', name: 'দোকান মালিক (এডমিন)', phone: '01986233234', role: 'manager', roleName: 'দোকান মালিক', pin: '1234', isOwner: true },
  { id: 's-1', name: 'মো: সোহেল রানা', phone: '01822334455', role: 'cashier', roleName: 'ক্যাশিয়ার', pin: '2222' },
  { id: 's-2', name: 'মোছা: তানিয়া আক্তার', phone: '01733445566', role: 'sales', roleName: 'সেলস এক্সিকিউটিভ', pin: '4444' }
];

export default function StaffScreen() {
  const { theme, triggerHaptic, speakAnnouncement } = useAuth();
  const [staffList, setStaffList] = useState<StaffUser[]>(DEFAULT_STAFF);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'cashier' | 'manager' | 'sales'>('cashier');

  const handleAddStaff = () => {
    if (!name.trim() || !pin.trim()) return;
    triggerHaptic('success');
    const newStaff: StaffUser = {
      id: `staff-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim() || '01700000000',
      role,
      roleName: role === 'cashier' ? 'ক্যাশিয়ার' : role === 'manager' ? 'ম্যানেজার' : 'সেলস স্টাফ',
      pin: pin.trim()
    };
    setStaffList([...staffList, newStaff]);
    setName('');
    setPhone('');
    setPin('');
    setShowModal(false);
    speakAnnouncement(`নতুন কর্মচারী ${newStaff.name} সফলভাবে যুক্ত হয়েছে`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '👥 কর্মচারী ও পারমিশন',
          headerStyle: { backgroundColor: theme.primaryColor || '#4f46e5' },
          headerTintColor: '#ffffff',
        }}
      />

      {/* Header Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>দোকান কর্মচারী ও শিফট ম্যানেজমেন্ট</Text>
        <Text style={styles.bannerSub}>প্রতিটি কর্মচারীর জন্য আলাদা ৪-ডিজিটের পিন কোড সেট করুন</Text>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <Text style={styles.listTitle}>সক্রিয় কর্মচারী তালিকা ({staffList.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ নতুন কর্মচারী</Text>
        </TouchableOpacity>
      </View>

      {/* Staff List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {staffList.map(staff => (
          <View key={staff.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{staff.isOwner ? '👑' : '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{staff.name}</Text>
                <Text style={styles.meta}>📱 {staff.phone} • পদবী: {staff.roleName}</Text>
              </View>
              <View style={styles.pinBox}>
                <Text style={styles.pinLabel}>লগইন PIN</Text>
                <Text style={styles.pinCode}>{staff.pin}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Staff Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>নতুন কর্মচারী যুক্ত করুন</Text>
            <TextInput
              style={styles.input}
              placeholder="কর্মচারীর পূর্ণ নাম *"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="মোবাইল নম্বর"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="৪-ডিজিট লগইন পিন (PIN) *"
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={4}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddStaff}>
                <Text style={styles.submitBtnText}>সংরক্ষণ করুন</Text>
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
  banner: { backgroundColor: '#1e1b4b', padding: 16, margin: 12, borderRadius: 14 },
  bannerTitle: { fontSize: 15, fontWeight: '900', color: '#ffffff' },
  bannerSub: { fontSize: 11.5, color: '#c7d2fe', marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8 },
  listTitle: { fontSize: 13, fontWeight: '800', color: '#334155' },
  addBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 22 },
  name: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  meta: { fontSize: 11.5, color: '#64748b', marginTop: 1 },
  pinBox: { alignItems: 'flex-end', backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  pinLabel: { fontSize: 9.5, color: '#64748b', fontWeight: '700' },
  pinCode: { fontSize: 13, fontWeight: '900', color: '#4f46e5', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: '#ffffff', width: '100%', maxWidth: 360, borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  submitBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#ffffff', fontWeight: '800' },
});
