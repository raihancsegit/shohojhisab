import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { DEMO_SHOPS } from '../src/lib/offlineDataVault';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginShop, theme, themeMode, triggerHaptic } = useAuth();
  const isDark = themeMode === 'dark';
  const primaryColor = theme.primaryColor || '#059669';

  const [tab, setTab] = useState<'shop' | 'admin'>('shop');
  const [phone, setPhone] = useState('01986233234');
  const [pinDigits, setPinDigits] = useState(['1', '2', '3', '4']);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const pinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null)
  ];

  const handlePinChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);
    triggerHaptic('light');

    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleLogin = async () => {
    setError('');
    triggerHaptic('medium');
    const fullPin = pinDigits.join('');

    if (tab === 'shop') {
      if (!phone.trim()) {
        setError('দয়া করে মোবাইল নাম্বার দিন!');
        return;
      }
      if (fullPin.length < 4) {
        setError('দয়া করে ৪-ডিজিটের পিন কোড লিখুন!');
        return;
      }

      setLoading(true);
      playNativeChime('cash');
      const res = await loginShop(phone, fullPin);
      setLoading(false);

      if (res.success) {
        speakNativeText('লগইন সফল হয়েছে');
        router.replace('/(tabs)');
      } else {
        setError(res.error || 'ভুল মোবাইল নাম্বার বা পিন!');
      }
    } else {
      if (adminPasscode === 'admin' || adminPasscode === '1234') {
        playNativeChime('cash');
        speakNativeText('অ্যাডমিন লগইন সফল');
        router.replace('/(tabs)');
      } else {
        setError('অ্যাডমিন পাসকোড সঠিক নয় (যেমন: admin)');
      }
    }
  };

  const fillQuickDemo = (demoPhone: string, demoPin: string[]) => {
    triggerHaptic('light');
    setPhone(demoPhone);
    setPinDigits(demoPin);
    setError('');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 🟢 App Logo & Branding */}
      <View style={styles.brandHeader}>
        <View style={[styles.logoCircle, { backgroundColor: primaryColor }]}>
          <Text style={styles.logoIcon}>🏪</Text>
        </View>
        <Text style={[styles.appName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
          ShohojHisab (সহজ হিসাব)
        </Text>
        <Text style={styles.appTagline}>
          ১০০% অফলাইন রিটেল ও হোলসেল বিজনেস ওএস
        </Text>
      </View>

      {/* 🔄 Login Role Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'shop' && { backgroundColor: primaryColor }]}
          onPress={() => {
            triggerHaptic('light');
            setTab('shop');
            setError('');
          }}
        >
          <Text style={[styles.tabText, tab === 'shop' && styles.tabTextActive]}>
            🏪 দোকানদার / কর্মচারী
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'admin' && { backgroundColor: primaryColor }]}
          onPress={() => {
            triggerHaptic('light');
            setTab('admin');
            setError('');
          }}
        >
          <Text style={[styles.tabText, tab === 'admin' && styles.tabTextActive]}>
            🛡️ সিস্টেম অ্যাডমিন
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📝 Login Form Card */}
      <View style={[styles.formCard, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {tab === 'shop' ? (
          <>
            <Text style={[styles.inputLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              মোবাইল নাম্বার বা ইউজার আইডি *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="যেমন: 01986233234"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 12 }]}>
              ৪-ডিজিটের সিকিউরিটি পিন (PIN) *
            </Text>
            <View style={styles.pinRow}>
              {pinDigits.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={pinRefs[idx]}
                  style={[
                    styles.pinBox,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      borderColor: digit ? primaryColor : (isDark ? '#334155' : '#cbd5e1')
                    }
                  ]}
                  value={digit}
                  onChangeText={(val) => handlePinChange(idx, val)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  secureTextEntry
                />
              ))}
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => setShowForgotModal(true)}>
              <Text style={styles.forgotText}>পিন ভুলে গেছেন? রিকভার করুন</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.inputLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              অ্যাডমিন পাসকোড *
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              placeholder="পাসকোড লিখুন (যেমন: admin)"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={adminPasscode}
              onChangeText={setAdminPasscode}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: primaryColor }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginBtnText}>
            {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন ➔'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ⚡ Quick Demo Accounts */}
      <View style={styles.demoSection}>
        <Text style={[styles.demoSectionTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          ⚡ ডেমো একাউন্ট দিয়ে এক ট্যাপে লগইন করুন:
        </Text>
        <View style={styles.demoGrid}>
          {DEMO_SHOPS.map((shop, sIdx) => (
            <TouchableOpacity
              key={shop.id}
              style={[
                styles.demoCard,
                { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }
              ]}
              onPress={() => fillQuickDemo(shop.phone, ['1', '2', '3', '4'])}
            >
              <Text style={styles.demoIcon}>{shop.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.demoName, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  {shop.shopName}
                </Text>
                <Text style={styles.demoSub}>📱 {shop.phone} • পিন: 1234</Text>
              </View>
              <Text style={[styles.demoArrow, { color: primaryColor }]}>➔</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ℹ️ Offline Badge */}
      <View style={styles.offlineBadgeRow}>
        <Text style={styles.offlineBadge}>🟢 ১০০% অফলাইন ব্যাকআপ ও লোকাল স্টোরেজ সুরক্ষিত</Text>
      </View>

      {/* 🔑 Forgot PIN Modal */}
      <Modal visible={showForgotModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#131b2e' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              পিন রিকভারি নির্দেশিকা
            </Text>
            <Text style={styles.modalBodyText}>
              দোকানদার হিসেবে আপনার ডিফল্ট পিন হলো: <Text style={{ fontWeight: 'bold' }}>1234</Text> (মালিক) অথবা <Text style={{ fontWeight: 'bold' }}>2222</Text> (কর্মচারী)।
              {'\n\n'}
              জরুরি প্রয়োজনে আমাদের হেল্পলাইন ২৪/৭ খোলা আছে:
              {'\n'}📞 <Text style={{ fontWeight: 'bold' }}>01986-233234</Text>
            </Text>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: primaryColor }]}
              onPress={() => setShowForgotModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>বুঝেছি</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, alignItems: 'center' },
  brandHeader: { alignItems: 'center', marginBottom: 20 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 6 },
  logoIcon: { fontSize: 32 },
  appName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  appTagline: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
  tabContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, width: '100%', marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 12.5, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#ffffff', fontWeight: '900' },
  formCard: { width: '100%', borderRadius: 18, padding: 18, borderWidth: 1, elevation: 2, marginBottom: 18 },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { color: '#dc2626', fontSize: 12.5, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14, fontWeight: '600' },
  pinRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  pinBox: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, fontSize: 20, fontWeight: '900' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 10 },
  forgotText: { fontSize: 11.5, color: '#4f46e5', fontWeight: '700' },
  loginBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16, elevation: 3 },
  loginBtnText: { color: '#ffffff', fontSize: 14.5, fontWeight: '900' },
  demoSection: { width: '100%', marginBottom: 16 },
  demoSectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  demoGrid: { gap: 8 },
  demoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 10, elevation: 1 },
  demoIcon: { fontSize: 24 },
  demoName: { fontSize: 13.5, fontWeight: '800' },
  demoSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  demoArrow: { fontSize: 16, fontWeight: '900' },
  offlineBadgeRow: { marginTop: 8 },
  offlineBadge: { fontSize: 11, color: '#059669', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '900', marginBottom: 10 },
  modalBodyText: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  modalCloseBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13.5 }
});
