import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { getLocalVaultData, saveLocalVaultSnapshot, VaultDealer } from '../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';
import VoiceInputField from '../src/components/VoiceInputField';

export default function DealersScreen() {
  const { tenant, theme, themeMode, triggerHaptic, formatPrice, speakAnnouncement, refreshVault, vaultVersion } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#4f46e5';

  const vault = useMemo(() => {
    return getLocalVaultData(tenant.id, tenant.industryId);
  }, [tenant.id, tenant.industryId, vaultVersion]);

  const [dealers, setDealers] = useState<VaultDealer[]>(vault.dealers || []);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<VaultDealer | null>(null);

  // Add Form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [dueAmount, setDueAmount] = useState('0');

  // Edit Form state
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDue, setEditDue] = useState('');

  // Pay Form state
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');

  const syncDealers = (updated: VaultDealer[]) => {
    setDealers(updated);
    saveLocalVaultSnapshot(tenant.id, { dealers: updated } as any);
    refreshVault();
  };

  const filteredDealers = useMemo(() => {
    return dealers.filter(d => {
      const q = search.toLowerCase().trim();
      return !q ||
        d.name.toLowerCase().includes(q) ||
        d.company.toLowerCase().includes(q) ||
        d.phone.includes(q);
    });
  }, [dealers, search]);

  const totalPayable = dealers.reduce((sum, d) => sum + Number(d.totalDue || d.due || 0), 0);
  const totalDealersWithDue = dealers.filter(d => Number(d.totalDue || d.due || 0) > 0).length;

  const handleAddDealer = () => {
    if (!name.trim() || !company.trim()) {
      Alert.alert('ভুল', 'ডিলারের নাম ও কোম্পানির নাম লিখুন');
      return;
    }
    triggerHaptic('success');
    const initDue = parseFloat(dueAmount) || 0;
    const newDealer: VaultDealer = {
      id: `dealer-${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      phone: phone.trim() || '01700000000',
      totalDue: initDue,
      due: initDue,
      lastOrderDate: new Date().toISOString().split('T')[0],
      lastPurchaseDate: new Date().toISOString().split('T')[0]
    };

    const updated = [newDealer, ...dealers];
    syncDealers(updated);

    setName('');
    setCompany('');
    setPhone('');
    setDueAmount('0');
    setShowAddModal(false);
    playNativeChime('cash');
    speakAnnouncement(`নতুন ডিলার ${newDealer.name} যুক্ত হয়েছে`);
  };

  const handlePayDealer = () => {
    if (!selectedDealer || !payAmount) return;
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      Alert.alert('ভুল', 'সঠিক টাকার পরিমাণ দিন');
      return;
    }

    triggerHaptic('success');
    const updated = dealers.map(d => {
      if (d.id === selectedDealer.id) {
        const curDue = Number(d.totalDue || d.due || 0);
        const newDue = Math.max(0, curDue - amount);
        return { ...d, totalDue: newDue, due: newDue };
      }
      return d;
    });

    syncDealers(updated);
    setPayAmount('');
    setPayNote('');
    setShowPayModal(false);
    playNativeChime('cash');
    const rem = Math.max(0, Number(selectedDealer.totalDue || selectedDealer.due || 0) - amount);
    const msg = `ডিলার ${selectedDealer.name} কে ৳${amount} টাকা পরিশোধ করা হয়েছে। অবশিষ্ট বাকি ৳${rem}`;
    speakAnnouncement(msg);
    Alert.alert('পরিশোধ সফল ✅', msg);
  };

  const openEdit = (d: VaultDealer) => {
    setSelectedDealer(d);
    setEditName(d.name);
    setEditCompany(d.company);
    setEditPhone(d.phone || '');
    setEditDue(String(d.totalDue || d.due || 0));
    setShowEditModal(true);
    triggerHaptic('light');
  };

  const handleEditSubmit = () => {
    if (!selectedDealer || !editName.trim()) return;
    triggerHaptic('success');
    const updated = dealers.map(d => {
      if (d.id === selectedDealer.id) {
        return {
          ...d,
          name: editName.trim(),
          company: editCompany.trim(),
          phone: editPhone.trim(),
          totalDue: parseFloat(editDue) || d.totalDue,
          due: parseFloat(editDue) || d.due
        };
      }
      return d;
    });
    syncDealers(updated);
    setShowEditModal(false);
    speakAnnouncement(`${editName} এর তথ্য আপডেট করা হয়েছে`);
  };

  const handleDeleteDealer = (d: VaultDealer) => {
    Alert.alert('ডিলার মুছবেন?', `"${d.name}" (${d.company}) ডিলারের হিসাব মুছে ফেলতে চান?`, [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ, মুছুন',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('medium');
          const updated = dealers.filter(item => item.id !== d.id);
          syncDealers(updated);
          speakAnnouncement('ডিলারের হিসাব মুছে ফেলা হয়েছে');
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <Stack.Screen
        options={{
          title: '🛍️ ডিলার ও ক্রয় খাতা',
          headerStyle: { backgroundColor: primaryColor },
          headerTintColor: '#ffffff',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => {
                triggerHaptic('light');
                setShowAddModal(true);
              }}
            >
              <Text style={styles.headerAddBtnText}>+ নতুন ডিলার</Text>
            </TouchableOpacity>
          )
        }}
      />

      {/* 📊 Summary KPI Banner */}
      <View style={[styles.kpiContainer, { backgroundColor: isDark ? '#111827' : primaryColor }]}>
        <View style={styles.kpiRow}>
          <View>
            <Text style={styles.kpiLabel}>মোট ডিলার পাওনা (বাকি)</Text>
            <Text style={styles.kpiValue}>{formatPrice(totalPayable)}</Text>
            <Text style={styles.kpiSub}>মোট পাওনাদার: {totalDealersWithDue} জন</Text>
          </View>
          <TouchableOpacity
            style={styles.addDealerPill}
            onPress={() => {
              triggerHaptic('light');
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addDealerPillText}>+ নতুন সাপ্লায়ার</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔍 Search Input */}
      <View style={[styles.searchSection, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#f8fafc' : '#0f172a' }]}
          placeholder="🔍 ডিলারের নাম, কোম্পানি বা ফোন দিয়ে খুঁজুন..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* 📜 Dealers List */}
      <ScrollView style={styles.list} contentContainerStyle={[styles.listContent, { paddingBottom: 150 }]}>
        {filteredDealers.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={[styles.emptyText, { color: isDark ? '#94a3b8' : '#64748b' }]}>কোনো ডিলারের হিসাব পাওয়া যায়নি</Text>
          </View>
        ) : (
          filteredDealers.map(d => {
            const dueVal = Number(d.totalDue || d.due || 0);
            const hasDue = dueVal > 0;
            return (
              <View
                key={d.id}
                style={[
                  styles.card,
                  { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dealerName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{d.name}</Text>
                    <Text style={[styles.dealerCompany, { color: primaryColor }]}>🏢 {d.company}</Text>
                    <Text style={styles.dealerPhone}>📱 {d.phone || 'ফোন নেই'}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.dueAmount, { color: hasDue ? '#dc2626' : '#16a34a' }]}>
                      {formatPrice(dueVal)}
                    </Text>
                    <Text style={styles.dueLabel}>{hasDue ? 'পাওনা বকেয়া' : 'পরিশোধিত'}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.btnRow}>
                  {hasDue && (
                    <TouchableOpacity
                      style={[styles.payBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => {
                        setSelectedDealer(d);
                        setPayAmount(String(dueVal));
                        setShowPayModal(true);
                      }}
                    >
                      <Text style={styles.payBtnText}>💵 পাওনা পরিশোধ</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${d.phone}`)}
                  >
                    <Text style={styles.callBtnText}>📞 কল</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                    onPress={() => openEdit(d)}
                  >
                    <Text style={[styles.editBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.delBtn}
                    onPress={() => handleDeleteDealer(d)}
                  >
                    <Text style={styles.delBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ➕ Add Dealer Modal with In-Field Voice */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                ➕ নতুন ডিলার বা সাপ্লায়ার
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <VoiceInputField
                label="ডিলার / প্রতিনিধির নাম *"
                value={name}
                onChangeText={setName}
                placeholder="যেমন: মো: কামরুল হাসান"
                required
                promptText="ডিলারের নাম মুখে বলুন"
              />

              <VoiceInputField
                label="কোম্পানি / সরবরাহকারী প্রতিষ্ঠান *"
                value={company}
                onChangeText={setCompany}
                placeholder="যেমন: প্রাণ আরএফএল / বসুন্ধরা গ্রুপ"
                required
                promptText="কোম্পানির নাম মুখে বলুন"
              />

              <VoiceInputField
                label="মোবাইল নম্বর *"
                value={phone}
                onChangeText={setPhone}
                placeholder="01700000000"
                keyboardType="phone-pad"
                isNumeric
                required
                promptText="মোবাইল নম্বর বলুন"
              />

              <VoiceInputField
                label="প্রারম্ভিক পাওনা / বকেয়া (৳)"
                value={dueAmount}
                onChangeText={setDueAmount}
                placeholder="0"
                isNumeric
                keyboardType="numeric"
                promptText="পূর্বের বকেয়া পাওনা কত টাকা বলুন"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleAddDealer}>
                <Text style={styles.saveBtnText}>ডিলার সংরক্ষণ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 💵 Pay Dealer Modal with In-Field Voice */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              💵 ডিলারকে টাকা পরিশোধ: {selectedDealer?.name}
            </Text>
            <Text style={styles.modalSub}>
              কোম্পানি: {selectedDealer?.company} • বর্তমান বকেয়া: {formatPrice(selectedDealer?.totalDue || selectedDealer?.due || 0)}
            </Text>

            <VoiceInputField
              label="পরিশোধের পরিমাণ (৳) *"
              value={payAmount}
              onChangeText={setPayAmount}
              placeholder="যেমন: ৫০০০"
              isNumeric
              keyboardType="numeric"
              required
              promptText="কত টাকা পরিশোধ করলেন মুখে বলুন"
            />

            <VoiceInputField
              label="নোট বা ব্যাংক ভাউচার নম্বর"
              value={payNote}
              onChangeText={setPayNote}
              placeholder="যেমন: চেক নম্বর / ক্যাশ পেমেন্ট"
              promptText="নোট মুখে বলুন"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10b981' }]} onPress={handlePayDealer}>
                <Text style={styles.saveBtnText}>পরিশোধ সম্পন্ন করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✏️ Edit Dealer Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              ✏️ ডিলার তথ্য এডিট
            </Text>

            <VoiceInputField
              label="ডিলারের নাম *"
              value={editName}
              onChangeText={setEditName}
              placeholder="নাম"
              required
              promptText="নাম মুখে বলুন"
            />

            <VoiceInputField
              label="কোম্পানি *"
              value={editCompany}
              onChangeText={setEditCompany}
              placeholder="কোম্পানি"
              required
              promptText="কোম্পানির নাম বলুন"
            />

            <VoiceInputField
              label="মোবাইল নম্বর"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="ফোন"
              keyboardType="phone-pad"
              isNumeric
              promptText="ফোন নম্বর বলুন"
            />

            <VoiceInputField
              label="মোট বকেয়া (৳)"
              value={editDue}
              onChangeText={setEditDue}
              isNumeric
              keyboardType="numeric"
              promptText="বকেয়া কত টাকা বলুন"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleEditSubmit}>
                <Text style={styles.saveBtnText}>আপডেট সংরক্ষণ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerAddBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  headerAddBtnText: { color: '#4f46e5', fontWeight: '900', fontSize: 12 },
  kpiContainer: { padding: 16, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, elevation: 2 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiLabel: { fontSize: 11.5, color: '#e0e7ff', fontWeight: '600' },
  kpiValue: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  kpiSub: { fontSize: 11, color: '#e0e7ff', marginTop: 2, fontWeight: '600' },
  addDealerPill: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addDealerPillText: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  searchSection: { padding: 10, borderBottomWidth: 1 },
  searchInput: { borderRadius: 10, paddingHorizontal: 12, height: 38, fontSize: 12.5, borderWidth: 1, borderColor: '#cbd5e1' },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 10 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 16, padding: 14, borderWidth: 1, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dealerName: { fontSize: 15, fontWeight: '900' },
  dealerCompany: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  dealerPhone: { fontSize: 11.5, color: '#64748b', marginTop: 2 },
  dueAmount: { fontSize: 16, fontWeight: '900' },
  dueLabel: { fontSize: 10.5, color: '#64748b', marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  payBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  payBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  callBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  callBtnText: { color: '#2563eb', fontWeight: '800', fontSize: 11.5 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  editBtnText: { fontSize: 12 },
  delBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  delBtnText: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  modalSub: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 2, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: '800' }
});
