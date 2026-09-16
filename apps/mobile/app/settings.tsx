import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { INDUSTRY_CATEGORIES } from '../src/lib/industryConfig';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';
import { getLocalVaultData, saveLocalVaultSnapshot, resetLocalVaultToSeed } from '../src/lib/offlineDataVault';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    tenant,
    theme,
    themeMode,
    toggleThemeMode,
    setIndustryId,
    isSoundboxEnabled,
    toggleSoundbox,
    logout,
    triggerHaptic,
    refreshVault
  } = useAuth();

  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [shopName, setShopName] = useState(tenant.shopName);
  const [ownerName, setOwnerName] = useState(tenant.ownerName);
  const [phone, setPhone] = useState(tenant.phone);
  const [location, setLocation] = useState(tenant.location || 'বাজার');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');

  const vault = getLocalVaultData(tenant.id);

  const handleSaveProfile = () => {
    if (!shopName.trim() || !phone.trim()) {
      Alert.alert('ভুল', 'দোকানের নাম ও মোবাইল নম্বর লিখুন');
      return;
    }

    triggerHaptic('success');
    tenant.shopName = shopName.trim();
    tenant.ownerName = ownerName.trim();
    tenant.phone = phone.trim();
    tenant.location = location.trim();

    setIsEditingProfile(false);
    speakNativeText('প্রোফাইল তথ্য আপডেট হয়েছে');
    Alert.alert('সফল', 'দোকানের প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!');
  };

  const handleResetData = () => {
    Alert.alert(
      'সতর্কতা: ডাটা রিসেট',
      'আপনি কি সব হিসাব ও স্টক রিসেট করে প্রারম্ভিক ডেমো ডাটা ফিরিয়ে আনতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'হ্যাঁ, রিসেট করুন',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('warning');
            await resetLocalVaultToSeed(tenant.id, tenant.industryId);
            refreshVault();
            playNativeChime('cash');
            speakNativeText('দোকানের সব ডাটা প্রারম্ভিক অবস্থায় রিসেট করা হয়েছে');
            Alert.alert('সফল', 'ডাটা রিসেট সম্পন্ন হয়েছে!');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'লগআউট নিশ্চিতকরণ',
      'আপনি কি সহজ হিসাব থেকে লগআউট করতে চান?',
      [
        { text: 'না', style: 'cancel' },
        {
          text: 'লগআউট',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 🏪 Shop Profile Card */}
      <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>দোকানের প্রোফাইল</Text>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: isEditingProfile ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9') }]}
            onPress={() => {
              if (isEditingProfile) handleSaveProfile();
              else setIsEditingProfile(true);
            }}
          >
            <Text style={[styles.editBtnText, isEditingProfile && { color: '#ffffff' }]}>
              {isEditingProfile ? '✓ সংরক্ষণ' : '✏️ এডিট'}
            </Text>
          </TouchableOpacity>
        </View>

        {isEditingProfile ? (
          <View style={styles.editForm}>
            <Text style={styles.fieldLabel}>দোকানের নাম *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={shopName}
              onChangeText={setShopName}
            />

            <Text style={styles.fieldLabel}>মালিকের নাম</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={ownerName}
              onChangeText={setOwnerName}
            />

            <Text style={styles.fieldLabel}>মোবাইল নম্বর *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.fieldLabel}>ঠিকানা / লোকেশন</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        ) : (
          <View>
            <Text style={styles.fieldLabel}>দোকানের নাম</Text>
            <Text style={[styles.fieldVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{tenant.shopName}</Text>

            <Text style={styles.fieldLabel}>মালিকের নাম</Text>
            <Text style={[styles.fieldVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{tenant.ownerName}</Text>

            <Text style={styles.fieldLabel}>মোবাইল নম্বর</Text>
            <Text style={[styles.fieldVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{tenant.phone}</Text>

            <Text style={styles.fieldLabel}>ঠিকানা</Text>
            <Text style={[styles.fieldVal, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{tenant.location || 'বাজার'}</Text>
          </View>
        )}
      </View>

      {/* 🏷️ Industry Category Picker */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>দোকানের ক্যাটাগরি ও থিম পরিবর্তন</Text>
      <View style={styles.grid}>
        {Object.values(INDUSTRY_CATEGORIES).map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.catCard,
              { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' },
              tenant.industryId === cat.id && { borderColor: cat.primaryColor, borderWidth: 2, backgroundColor: isDark ? '#1e293b' : '#f0fdf4' }
            ]}
            onPress={() => {
              playNativeChime('beep');
              setIndustryId(cat.id);
            }}
          >
            <Text style={styles.catIcon}>{cat.icon}</Text>
            <Text style={[styles.catName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>{cat.name}</Text>
            {tenant.industryId === cat.id && (
              <Text style={[styles.activeBadge, { color: cat.primaryColor }]}>সক্রিয় ✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ⚙️ Preferences & Controls */}
      <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>সিস্টেম প্রেফারেন্স</Text>

        {/* Dark Mode Switch */}
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.settingLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>ডার্ক মোড (Dark Theme)</Text>
            <Text style={styles.subText}>রাতের ব্যবহারে চোখের জন্য আরামদায়ক</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleThemeMode}
            trackColor={{ false: '#cbd5e1', true: primaryColor }}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]} />

        {/* Soundbox Switch */}
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.settingLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>ডিজিটাল সাউন্ডবক্স</Text>
            <Text style={styles.subText}>বিক্রি বা জমা হলে বাংলায় কথা বলবে</Text>
          </View>
          <Switch
            value={isSoundboxEnabled}
            onValueChange={toggleSoundbox}
            trackColor={{ false: '#cbd5e1', true: primaryColor }}
          />
        </View>
      </View>

      {/* ☁️ Cloud & Central Database Sync */}
      <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>সেন্ট্রাল ডাটাবেজ সিঙ্ক</Text>
        <Text style={styles.subText}>
          PWA ওয়েব অ্যাপ এবং মোবাইল অ্যাপ উভয়ই একই ব্যাকএন্ড ডাটাবেজ (PostgreSQL / SQLite) এর সাথে সংযুক্ত থাকতে পারবে।
        </Text>

        <TouchableOpacity
          style={[styles.syncBtn, { backgroundColor: primaryColor }]}
          onPress={async () => {
            triggerHaptic('medium');
            playNativeChime('beep');
            const { syncWithDatabase } = await import('../src/lib/cloudSyncEngine');
            const res = await syncWithDatabase(tenant.id);
            refreshVault();
            if (res.success) {
              playNativeChime('cash');
              speakNativeText('ডাটাবেজ সিঙ্ক সফল হয়েছে');
              Alert.alert('সিঙ্ক সফল', res.message);
            } else {
              Alert.alert('অফলাইন মোড', res.message);
            }
          }}
        >
          <Text style={styles.syncBtnText}>🔄 সেন্ট্রাল ডাটাবেজে সিঙ্ক করুন</Text>
        </TouchableOpacity>
      </View>

      {/* 💾 Storage & Data Vault Summary */}
      <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>লোকাল ডাটা ও ব্যাকআপ</Text>
        <Text style={styles.subText}>
          📦 পণ্য: {vault.products?.length || 0} টি • 🛒 মেমো: {vault.sales?.length || 0} টি • 👥 খাতা: {vault.customers?.length || 0} টি
        </Text>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
          <Text style={styles.resetBtnText}>🔄 ফ্যাক্টরি ডেমো ডাটা রিসেট করুন</Text>
        </TouchableOpacity>
      </View>

      {/* 🚪 Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 একাউন্ট থেকে লগআউট করুন</Text>
      </TouchableOpacity>
    </ScrollView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  editForm: { gap: 8, marginTop: 6 },
  fieldLabel: { fontSize: 11.5, color: '#64748b', fontWeight: '700', marginTop: 8 },
  fieldVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12.5, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  catCard: { width: '48%', borderRadius: 16, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  catIcon: { fontSize: 26, marginBottom: 4 },
  catName: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  activeBadge: { fontSize: 11, fontWeight: '800', marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  divider: { height: 1, marginVertical: 12 },
  settingLabel: { fontSize: 13.5, fontWeight: '800' },
  subText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  syncBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  syncBtnText: { color: '#ffffff', fontSize: 13.5, fontWeight: '900' },
  resetBtn: { backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  resetBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 12 },
  logoutBtn: { backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 14, alignItems: 'center', elevation: 3 },
  logoutBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' }
});

