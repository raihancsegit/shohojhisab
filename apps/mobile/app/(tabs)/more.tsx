import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { DEMO_SHOPS } from '../../src/lib/offlineDataVault';

export default function MoreScreen() {
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
    triggerHaptic
  } = useAuth();

  const [showShopModal, setShowShopModal] = useState(false);

  const menuItems = [
    { id: 'expenses', title: '☕ খরচের খাতা (Expenses)', desc: 'দোকানের চা-নাস্তা, বিদ্যুৎ ও বিবিধ খরচ', route: '/expenses' },
    { id: 'reports', title: '📊 ব্যবসার রিপোর্ট ও লাভ-ক্ষতি', desc: 'দৈনিক ও মাসিক হিসাবের পরিসংখ্যান', route: '/reports' },
    { id: 'stock', title: '📦 স্টক ইনভেন্টরি ম্যানেজমেন্ট', desc: 'মজুদ পণ্য ও নতুন চালান যোগ', route: '/stock' },
    { id: 'khata', title: '📖 কাস্টমার বাকি খাতা ও লেজার', desc: 'বাকি আদায় ও কাস্টমার তালিকা', route: '/khata' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 🏬 Shop Info Header */}
      <View style={[styles.shopHeader, { backgroundColor: theme.primary }]}>
        <Text style={styles.shopIcon}>{tenant.icon || '🏪'}</Text>
        <Text style={styles.shopName}>{tenant.shopName}</Text>
        <Text style={styles.shopSub}>{tenant.industryName} • প্রোফাইল</Text>
        <Text style={styles.ownerText}>মালিক: {tenant.ownerName} ({tenant.phone})</Text>

        <TouchableOpacity style={styles.changeShopBtn} onPress={() => setShowShopModal(true)}>
          <Text style={styles.changeShopBtnText}>অন্য দোকানে সুইচ করুন ⇄</Text>
        </TouchableOpacity>
      </View>

      {/* ⚙️ Key Settings & Toggles */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>সেটিংস ও মোড কনট্রোল</Text>

        {/* Soundbox Master Switch */}
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>🔊 বাংলা ডিজিটাল সাউন্ডবক্স</Text>
            <Text style={styles.settingDesc}>বিক্রি ও পেমেন্ট জমার সময় বাংলায় কণ্ঠ ঘোষণা</Text>
          </View>
          <Switch
            value={isSoundboxEnabled}
            onValueChange={toggleSoundbox}
            trackColor={{ false: '#cbd5e1', true: theme.primary }}
          />
        </View>

        {/* Role Mode Switch */}
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>
              {activeRoleMode === 'owner' ? '👑 মালিক মোড সক্রিয়' : '👤 কর্মচারী মোড সক্রিয়'}
            </Text>
            <Text style={styles.settingDesc}>
              {activeRoleMode === 'owner' ? 'পূর্ণ ব্যবসার হিসাব ও রিপোর্ট অ্যাক্সেস' : 'শুধুমাত্র POS বিক্রি ও সাধারণ হিসাব'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.modeBtn, { backgroundColor: activeRoleMode === 'owner' ? '#e0e7ff' : '#dcfce7' }]}
            onPress={() => switchRoleMode(activeRoleMode === 'owner' ? 'staff' : 'owner')}
          >
            <Text style={[styles.modeBtnText, { color: activeRoleMode === 'owner' ? '#4338ca' : '#15803d' }]}>
              {activeRoleMode === 'owner' ? 'কর্মচারী মোড' : 'মালিক মোড'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 📋 Features Navigation */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>অন্যান্য ফিচারসমূহ</Text>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              triggerHaptic('light');
              router.push(item.route as any);
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ℹ️ App Version Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ShohojHisab Native Business OS</Text>
        <Text style={styles.infoSub}>ভার্সন: ১.০.০ (১০০% অফলাইন ইঞ্জিন সক্রিয়)</Text>
        <Text style={styles.infoDesc}>ইন্টারনেট ছাড়াও নির্বিঘ্নে চলবে আপনার দোকানের হিসাব ও সাউন্ডবক্স</Text>
      </View>

      {/* 🏬 Shop Switcher Modal */}
      <Modal visible={showShopModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>দোকান নির্বাচন করুন</Text>
              <TouchableOpacity onPress={() => setShowShopModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

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
  shopHeader: { borderRadius: 20, padding: 18, alignItems: 'center', marginBottom: 14, elevation: 2 },
  shopIcon: { fontSize: 36, marginBottom: 4 },
  shopName: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 2 },
  shopSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  ownerText: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2, marginBottom: 10 },
  changeShopBtn: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  changeShopBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 11.5 },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  settingTitle: { fontSize: 13.5, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  settingDesc: { fontSize: 11, color: '#64748b' },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  modeBtnText: { fontSize: 11.5, fontWeight: '800' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  menuTitle: { fontSize: 13.5, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  menuDesc: { fontSize: 11, color: '#64748b' },
  arrow: { fontSize: 16, color: '#94a3b8', fontWeight: '800' },
  infoCard: { backgroundColor: '#f1f5f9', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  infoTitle: { fontSize: 13, fontWeight: '900', color: '#334155', marginBottom: 2 },
  infoSub: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 2 },
  infoDesc: { fontSize: 10.5, color: '#94a3b8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  closeBtn: { fontSize: 18, color: '#64748b', fontWeight: '800' },
  shopItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  shopItemActive: { backgroundColor: '#e0e7ff', borderColor: '#4f46e5' },
  shopItemIcon: { fontSize: 24 },
  shopItemName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  shopItemSub: { fontSize: 11, color: '#64748b' },
  activeCheck: { color: '#4f46e5', fontWeight: '800', fontSize: 12 }
});
