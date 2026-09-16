import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { INDUSTRY_CATEGORIES } from '../src/lib/industryConfig';
import { playNativeChime, speakNativeText } from '../src/lib/offlineAudioEngine';
import { getLocalVaultData, resetLocalVaultToSeed } from '../src/lib/offlineDataVault';
import { getServerUrl, setServerUrl, syncWithDatabase, DEFAULT_CANDIDATE_URLS } from '../src/lib/cloudSyncEngine';

type SettingsTab = 'general' | 'features' | 'parties' | 'pos' | 'sync';

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

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General state
  const [shopName, setShopName] = useState(tenant.shopName);
  const [ownerName, setOwnerName] = useState(tenant.ownerName);
  const [phone, setPhone] = useState(tenant.phone);
  const [location, setLocation] = useState(tenant.location || 'বাজার');

  // PIN change state
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Feature Toggles (PWA Parity)
  const [features, setFeatures] = useState({
    enableCustomerKhata: true,
    enableInstallments: true,
    enableExpiryTracker: true,
    enableDealerKhata: true,
    enableCashDrawer: true,
    enableWholesale: false,
    enableBarcodeScanner: true,
    enableWhatsAppReceipts: true,
    enableSoundbox: true,
    enableAutoDueAlert: true
  });

  // Party & Due settings (PWA Parity)
  const [partySettings, setPartySettings] = useState({
    defaultCreditLimit: '5000',
    reminderDays: '3',
    enableSmsAlerts: true,
    shippingAddress: false
  });

  // POS & Transaction settings (PWA Parity)
  const [posSettings, setPosSettings] = useState({
    invoicePrefix: 'INV-',
    enableQuickCashDefault: true,
    showProfitInSale: true,
    enableDiscountPerItem: true,
    printerType: '58mm',
    receiptFooter: 'আমাদের সাথে কেনাকাটা করার জন্য ধন্যবাদ! আবার আসবেন।'
  });

  // Server & Database Sync state
  const [serverUrlInput, setServerUrlInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    getServerUrl().then(url => {
      setServerUrlInput(url);
      testConnection(url);
    });
  }, []);

  const testConnection = async (url: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${url}/api/products?tenantId=${tenant.id}`, { signal: controller.signal });
      clearTimeout(timeout);
      setIsConnected(res.ok || res.status < 500);
    } catch (e) {
      setIsConnected(false);
    }
  };

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

    speakNativeText('দোকানের প্রোফাইল সংরক্ষিত হয়েছে');
    Alert.alert('সফল', 'দোকানের প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!');
  };

  const handleSaveServerUrl = async (customUrl?: string) => {
    const target = customUrl || serverUrlInput;
    if (!target.trim()) return;
    triggerHaptic('medium');
    await setServerUrl(target.trim());
    setServerUrlInput(target.trim());
    await testConnection(target.trim());
    playNativeChime('beep');
    Alert.alert('সার্ভার লিংক সংরক্ষিত', `সেন্ট্রাল ডাটাবেজ API সেট করা হয়েছে:\n${target.trim()}`);
  };

  const handleSyncDatabase = async () => {
    triggerHaptic('medium');
    setIsSyncing(true);
    setSyncStatusMsg('সেন্ট্রাল ডাটাবেজে ডাটা আদান-প্রদান হচ্ছে...');
    playNativeChime('beep');

    const result = await syncWithDatabase(tenant.id);
    setIsSyncing(false);
    setSyncStatusMsg(result.message);
    refreshVault();

    if (result.success) {
      playNativeChime('cash');
      speakNativeText('সেন্ট্রাল ডাটাবেজের সাথে সফলভাবে সিঙ্ক সম্পন্ন হয়েছে');
      setIsConnected(true);
      Alert.alert('সিঙ্ক সফল ✅', `${result.message}\nপণ্য: ${result.syncedProducts || 0}টি | কাস্টমার: ${result.syncedCustomers || 0}জন | সেলস: ${result.syncedSales || 0}টি`);
    } else {
      playNativeChime('alert');
      setIsConnected(false);
      Alert.alert('সিঙ্ক অফলাইন নোটিশ ℹ️', result.message);
    }
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
            speakNativeText('দোকানের সব ডাটা রিসেট করা হয়েছে');
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

  const toggleFeature = (key: keyof typeof features) => {
    triggerHaptic('light');
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'general', label: 'সাধারণ', icon: '🏠' },
    { id: 'features', label: 'ফিচার', icon: '⚙️' },
    { id: 'parties', label: 'বাকি খাতা', icon: '👥' },
    { id: 'pos', label: 'বিক্রি ও মেমো', icon: '🧾' },
    { id: 'sync', label: 'ডাটাবেজ সিঙ্ক', icon: '☁️' }
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      {/* 🧭 Horizontal Top Tabs */}
      <View style={[styles.tabsNav, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tabButton,
                  isActive && { borderBottomColor: primaryColor, borderBottomWidth: 3 }
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setActiveTab(t.id);
                }}
              >
                <Text style={[
                  styles.tabButtonText,
                  { color: isActive ? primaryColor : (isDark ? '#94a3b8' : '#64748b') },
                  isActive && { fontWeight: '900' }
                ]}>
                  {t.icon} {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------- 1. GENERAL TAB ---------------- */}
        {activeTab === 'general' && (
          <>
            <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                🏪 দোকানের প্রোফাইল ও তথ্য
              </Text>
              
              <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>দোকানের নাম</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                value={shopName}
                onChangeText={setShopName}
              />

              <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 10 }]}>মালিকের নাম</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                value={ownerName}
                onChangeText={setOwnerName}
              />

              <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 10 }]}>মোবাইল নম্বর</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 10 }]}>দোকানের ঠিকানা / বাজার</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
                value={location}
                onChangeText={setLocation}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: primaryColor, marginTop: 14 }]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.primaryBtnText}>💾 প্রোফাইল সংরক্ষণ করুন</Text>
              </TouchableOpacity>
            </View>

            {/* Business Category Selector */}
            <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                🏷️ ব্যবসার ধরন ও ক্যাটাগরি
              </Text>
              <View style={styles.catGrid}>
                {Object.values(INDUSTRY_CATEGORIES).map(cat => {
                  const isSelected = tenant.industryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catCard,
                        { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isSelected ? primaryColor : (isDark ? '#1e293b' : '#e2e8f0') },
                        isSelected && { borderWidth: 2 }
                      ]}
                      onPress={() => {
                        triggerHaptic('medium');
                        setIndustryId(cat.id);
                        speakNativeText(`${cat.name} সিলেক্ট করা হয়েছে`);
                      }}
                    >
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <Text style={[styles.catName, { color: isDark ? '#f8fafc' : '#0f172a' }, isSelected && { color: primaryColor, fontWeight: '900' }]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Dark Mode & Soundbox */}
            <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                🎨 থিম ও সাউন্ডবক্স
              </Text>
              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>🌙 ডার্ক মোড (Dark Mode)</Text>
                  <Text style={styles.switchSub}>রাতের বেলা সহজে ব্যবহারের জন্য ডার্ক থিম</Text>
                </View>
                <Switch value={isDark} onValueChange={toggleThemeMode} />
              </View>
              <View style={[styles.switchRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#f1f5f9', paddingTop: 12 }]}>
                <View>
                  <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>🔊 বাংলা সাউন্ডবক্স স্পিকার</Text>
                  <Text style={styles.switchSub}>মেমো ও বাকি আদায়ের সময় বাংলায় ঘোষণা</Text>
                </View>
                <Switch value={isSoundboxEnabled} onValueChange={toggleSoundbox} />
              </View>
            </View>
          </>
        )}

        {/* ---------------- 2. FEATURES TAB ---------------- */}
        {activeTab === 'features' && (
          <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              ⚙️ সক্রিয় ফিচার ও মডিউল কন্ট্রোল
            </Text>
            
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>📖 বাকির খাতা ও কাস্টমার লেজার</Text>
                <Text style={styles.switchSub}>গ্রাহকের বকেয়া ও নগদ জমা ট্র্যাকিং</Text>
              </View>
              <Switch value={features.enableCustomerKhata} onValueChange={() => toggleFeature('enableCustomerKhata')} />
            </View>

            <View style={[styles.switchRow, styles.switchBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>📅 কিস্তি খাতা (Installment Radar)</Text>
                <Text style={styles.switchSub}>মাসিক/সাপ্তাহিক কিস্তিতে পণ্য বিক্রয়</Text>
              </View>
              <Switch value={features.enableInstallments} onValueChange={() => toggleFeature('enableInstallments')} />
            </View>

            <View style={[styles.switchRow, styles.switchBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>⏳ মেয়াদোত্তীর্ণ রাডার (Expiry Radar)</Text>
                <Text style={styles.switchSub}>ঔষধ ও পণ্যের মেয়াদ শেষের আগাম সতর্কবার্তা</Text>
              </View>
              <Switch value={features.enableExpiryTracker} onValueChange={() => toggleFeature('enableExpiryTracker')} />
            </View>

            <View style={[styles.switchRow, styles.switchBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>🛍️ ডিলার ও মহাজন খাতা</Text>
                <Text style={styles.switchSub}>কোম্পানি ও সাপ্লায়ারদের দেনা-পাওনা</Text>
              </View>
              <Switch value={features.enableDealerKhata} onValueChange={() => toggleFeature('enableDealerKhata')} />
            </View>

            <View style={[styles.switchRow, styles.switchBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>🌙 ক্যাশ ড্রয়ার ও দিন শেষ হিসাব</Text>
                <Text style={styles.switchSub}>সারাদিনের ক্যাশ গণনা ও ড্রয়ার মিলানো</Text>
              </View>
              <Switch value={features.enableCashDrawer} onValueChange={() => toggleFeature('enableCashDrawer')} />
            </View>

            <View style={[styles.switchRow, styles.switchBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>📢 হোয়াটসঅ্যাপ রসিদ ও বাকি তাগাদা</Text>
                <Text style={styles.switchSub}>১-ক্লিকে কাস্টমারকে ডিজিটাল রসিদ শেয়ার</Text>
              </View>
              <Switch value={features.enableWhatsAppReceipts} onValueChange={() => toggleFeature('enableWhatsAppReceipts')} />
            </View>
          </View>
        )}

        {/* ---------------- 3. PARTIES TAB ---------------- */}
        {activeTab === 'parties' && (
          <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              👥 বাকি ও কাস্টমার সেটিংস
            </Text>

            <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>ডিফল্ট বাকি সীমা (ক্রেডিট লিমিট)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={partySettings.defaultCreditLimit}
              onChangeText={(v) => setPartySettings(p => ({ ...p, defaultCreditLimit: v }))}
              keyboardType="numeric"
              placeholder="যেমন: 5000"
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 12 }]}>বাকি পরিশোধের তাগাদা নোটিশ দিন (দিন)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={partySettings.reminderDays}
              onChangeText={(v) => setPartySettings(p => ({ ...p, reminderDays: v }))}
              keyboardType="numeric"
              placeholder="যেমন: 3"
            />

            <View style={[styles.switchRow, styles.switchBorder, { marginTop: 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: isDark ? '#f8fafc' : '#0f172a' }]}>🔔 স্বয়ংক্রিয় বাকি তাগাদা নোটিফিকেশন</Text>
                <Text style={styles.switchSub}>বকেয়ার ডেডলাইন পার হলে অ্যালার্ট দেখাবে</Text>
              </View>
              <Switch
                value={partySettings.enableSmsAlerts}
                onValueChange={(v) => setPartySettings(p => ({ ...p, enableSmsAlerts: v }))}
              />
            </View>
          </View>
        )}

        {/* ---------------- 4. POS TAB ---------------- */}
        {activeTab === 'pos' && (
          <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              🧾 বিক্রি ও ডিজিটাল মেমো সেটিংস
            </Text>

            <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>মেমো নম্বর প্রিফিক্স</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={posSettings.invoicePrefix}
              onChangeText={(v) => setPosSettings(p => ({ ...p, invoicePrefix: v }))}
              placeholder="INV-"
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 12 }]}>থার্মাল প্রিন্টার সাইজ</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {['58mm (মিনি)', '80mm (স্ট্যান্ডার্ড)'].map((pType) => (
                <TouchableOpacity
                  key={pType}
                  style={[
                    styles.presetBtn,
                    posSettings.printerType.includes(pType.slice(0, 4)) && { backgroundColor: primaryColor, borderColor: primaryColor }
                  ]}
                  onPress={() => setPosSettings(p => ({ ...p, printerType: pType }))}
                >
                  <Text style={[
                    styles.presetBtnText,
                    posSettings.printerType.includes(pType.slice(0, 4)) && { color: '#ffffff', fontWeight: '900' }
                  ]}>
                    🖨️ {pType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569', marginTop: 12 }]}>মেমো ফুটার বার্তা (Footer Note)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a', height: 60 }]}
              value={posSettings.receiptFooter}
              onChangeText={(v) => setPosSettings(p => ({ ...p, receiptFooter: v }))}
              multiline
            />
          </View>
        )}

        {/* ---------------- 5. SYNC TAB ---------------- */}
        {activeTab === 'sync' && (
          <View style={[styles.card, { backgroundColor: isDark ? '#131b2e' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.cardTitle, { color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 0 }]}>
                ☁️ সেন্ট্রাল ডাটাবেজ API ও সিঙ্ক
              </Text>
              <View style={[styles.badge, { backgroundColor: isConnected ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isConnected ? '#15803d' : '#b91c1c' }}>
                  {isConnected ? '🟢 কানেক্টেড' : '🔴 অফলাইন মোড'}
                </Text>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              সেন্ট্রাল ডাটাবেজ API সার্ভার URL
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#f8fafc' : '#0f172a' }]}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="http://192.168.0.100:4005"
            />

            {/* Quick 1-tap presets */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#94a3b8' : '#64748b', marginTop: 10, fontSize: 11 }]}>
              ⚡ দ্রুত সিলেক্ট করুন (1-Tap Presets):
            </Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}
                onPress={() => handleSaveServerUrl('http://192.168.0.100:4005')}
              >
                <Text style={[styles.presetBtnText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  🏠 Wi-Fi LAN: http://192.168.0.100:4005
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}
                onPress={() => handleSaveServerUrl('http://localhost:4005')}
              >
                <Text style={[styles.presetBtnText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  💻 Localhost: http://localhost:4005
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: primaryColor, marginTop: 16 }]}
              onPress={handleSyncDatabase}
              disabled={isSyncing}
            >
              <Text style={styles.primaryBtnText}>
                {isSyncing ? '🔄 সিঙ্ক হচ্ছে...' : '🔄 এখন সেন্ট্রাল ডাটাবেজ সিঙ্ক করুন'}
              </Text>
            </TouchableOpacity>

            {syncStatusMsg ? (
              <Text style={[styles.syncStatusText, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                ℹ️ {syncStatusMsg}
              </Text>
            ) : null}

            {/* Database Reset */}
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#f1f5f9', paddingTop: 16 }}>
              <Text style={[styles.cardTitle, { color: '#ef4444', fontSize: 13 }]}>
                ⚠️ বিপজ্জনক অঞ্চল (Danger Zone)
              </Text>
              <TouchableOpacity style={styles.dangerBtn} onPress={handleResetData}>
                <Text style={styles.dangerBtnText}>🗑️ সম্পূর্ণ হিসাব ও ডাটা রিসেট করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 🚪 Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 একাউন্ট থেকে লগআউট করুন</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsNav: { borderBottomWidth: 1 },
  tabsScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  tabButtonText: { fontSize: 13, fontWeight: '700' },
  scrollArea: { flex: 1 },
  content: { padding: 14, gap: 14 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13, fontWeight: '600' },
  primaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', elevation: 2 },
  primaryBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13.5 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 4 },
  catIcon: { fontSize: 24 },
  catName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 10 },
  switchLabel: { fontSize: 13, fontWeight: '700' },
  switchSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  presetBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  presetBtnText: { fontSize: 12, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  syncStatusText: { fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  dangerBtn: { backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 8 },
  dangerBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 12.5 },
  logoutBtn: { backgroundColor: '#fee2e2', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  logoutBtnText: { color: '#dc2626', fontWeight: '900', fontSize: 13.5 }
});
