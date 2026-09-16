import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  hydrateLocalVault,
  getLocalVaultData,
  saveLocalVaultSnapshot,
  DEMO_SHOPS,
  VaultState
} from '../lib/offlineDataVault';
import { speakNativeText, playNativeChime } from '../lib/offlineAudioEngine';
import { getIndustryTheme, IndustryTheme } from '../lib/industryConfig';

export interface TenantInfo {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  industryId: string;
  industryName?: string;
  icon?: string;
  location?: string;
}

interface AuthContextType {
  tenant: TenantInfo;
  userRole: 'admin' | 'shopkeeper' | null;
  activeRoleMode: 'owner' | 'staff';
  theme: IndustryTheme;
  themeMode: 'light' | 'dark';
  toggleThemeMode: () => void;
  isOnline: boolean;
  isSoundboxEnabled: boolean;
  setIndustryId: (id: string) => void;
  switchShop: (shop: TenantInfo) => void;
  switchRoleMode: (mode: 'owner' | 'staff') => void;
  loginShop: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  toggleSoundbox: () => void;
  speakAnnouncement: (text: string) => void;
  triggerHaptic: (type?: 'light' | 'medium' | 'success' | 'warning') => void;
  formatPrice: (amount: number) => string;
  refreshVault: () => void;
  vaultVersion: number;
}

const defaultTenant: TenantInfo = DEMO_SHOPS[0];

const AuthContext = createContext<AuthContextType>({
  tenant: defaultTenant,
  userRole: 'shopkeeper',
  activeRoleMode: 'owner',
  theme: getIndustryTheme('cat-grocery'),
  themeMode: 'light',
  toggleThemeMode: () => {},
  isOnline: true,
  isSoundboxEnabled: true,
  setIndustryId: () => {},
  switchShop: () => {},
  switchRoleMode: () => {},
  loginShop: async () => ({ success: true }),
  logout: () => {},
  toggleSoundbox: () => {},
  speakAnnouncement: () => {},
  triggerHaptic: () => {},
  formatPrice: (amount: number) => `৳ ${amount.toLocaleString('en-US')}`,
  refreshVault: () => {},
  vaultVersion: 0
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo>(defaultTenant);
  const [userRole, setUserRole] = useState<'admin' | 'shopkeeper' | null>('shopkeeper');
  const [activeRoleMode, setActiveRoleMode] = useState<'owner' | 'staff'>('owner');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSoundboxEnabled, setIsSoundboxEnabled] = useState<boolean>(true);
  const [vaultVersion, setVaultVersion] = useState<number>(0);

  useEffect(() => {
    // Load local storage preferences
    AsyncStorage.getItem('shohoj_tenant_info').then(data => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setTenant(parsed);
          hydrateLocalVault(parsed.id, parsed.industryId).then(() => setVaultVersion(v => v + 1));
        } catch (e) {}
      } else {
        hydrateLocalVault(defaultTenant.id, defaultTenant.industryId).then(() => setVaultVersion(v => v + 1));
      }
    });

    AsyncStorage.getItem('shohoj_soundbox').then(data => {
      if (data !== null) setIsSoundboxEnabled(data === 'true');
    });

    AsyncStorage.getItem('shohoj_role_mode').then(data => {
      if (data === 'staff' || data === 'owner') setActiveRoleMode(data);
    });

    AsyncStorage.getItem('shohoj_theme_mode').then(data => {
      if (data === 'dark' || data === 'light') setThemeMode(data);
    });
  }, []);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
  };

  const toggleThemeMode = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    AsyncStorage.setItem('shohoj_theme_mode', next);
    triggerHaptic('light');
    speakAnnouncement(next === 'dark' ? 'ডার্ক মোড সক্রিয়' : 'লাইট মোড সক্রিয়');
  };

  const switchShop = (shop: TenantInfo) => {
    setTenant(shop);
    AsyncStorage.setItem('shohoj_tenant_info', JSON.stringify(shop));
    hydrateLocalVault(shop.id, shop.industryId).then(() => setVaultVersion(v => v + 1));
    triggerHaptic('success');
    speakAnnouncement(`${shop.shopName} চালু হয়েছে`);
  };

  const setIndustryId = (id: string) => {
    const updated = { ...tenant, industryId: id };
    setTenant(updated);
    AsyncStorage.setItem('shohoj_tenant_info', JSON.stringify(updated));
    hydrateLocalVault(tenant.id, id).then(() => setVaultVersion(v => v + 1));
  };

  const switchRoleMode = (mode: 'owner' | 'staff') => {
    setActiveRoleMode(mode);
    AsyncStorage.setItem('shohoj_role_mode', mode);
    triggerHaptic('medium');
    speakAnnouncement(mode === 'owner' ? 'মালিক মোড সক্রিয়' : 'কর্মচারী মোড সক্রিয়');
  };

  const loginShop = async (phone: string, pin: string) => {
    triggerHaptic('medium');
    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    let loggedTenant: TenantInfo | null = null;
    let isOwner = true;

    // 1. Try real database API login first
    try {
      const { getServerUrl } = await import('../lib/cloudSyncEngine');
      const baseUrl = await getServerUrl();
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'shop', phone: cleanPhone, pin: cleanPin })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tenant) {
          loggedTenant = {
            id: data.tenant.id,
            shopName: data.tenant.shop_name || data.tenant.shopName || 'আমার দোকান',
            ownerName: data.tenant.owner_name || data.tenant.ownerName || 'দোকানদার',
            phone: data.tenant.phone || cleanPhone,
            industryId: data.tenant.industry_category_id || data.tenant.industryId || 'cat-grocery'
          };
          isOwner = data.user?.isOwner !== false;
        }
      }
    } catch (e) {
      console.log('[Auth] Database API offline, falling back to local vault auth');
    }

    // 2. Fallback to local known/demo shop or create dynamic account for user
    if (!loggedTenant) {
      const matched = DEMO_SHOPS.find(s => s.phone === cleanPhone);
      if (matched) {
        loggedTenant = matched;
      } else {
        // Create / restore account for entered phone
        loggedTenant = {
          id: `tenant-${cleanPhone.slice(-6)}`,
          shopName: 'বিসমিল্লাহ স্টোর',
          ownerName: 'দোকান মালিক',
          phone: cleanPhone,
          industryId: 'cat-grocery'
        };
      }
    }

    setTenant(loggedTenant);
    setUserRole('shopkeeper');
    setActiveRoleMode(isOwner ? 'owner' : 'staff');
    await AsyncStorage.setItem('shohoj_tenant_info', JSON.stringify(loggedTenant));
    await AsyncStorage.setItem('shohoj_user_role', 'shopkeeper');
    await hydrateLocalVault(loggedTenant.id, loggedTenant.industryId);
    setVaultVersion(v => v + 1);
    triggerHaptic('success');
    speakAnnouncement(`${loggedTenant.shopName} এ স্বাগতম`);
    return { success: true };
  };

  const logout = async () => {
    triggerHaptic('medium');
    setUserRole(null);
    await AsyncStorage.removeItem('shohoj_user_role');
    speakAnnouncement('লগআউট সম্পন্ন হয়েছে');
  };


  const toggleSoundbox = () => {
    const next = !isSoundboxEnabled;
    setIsSoundboxEnabled(next);
    AsyncStorage.setItem('shohoj_soundbox', String(next));
    triggerHaptic('light');
    playNativeChime('beep');
    if (next) speakNativeText('সাউন্ডবক্স চালু হয়েছে');
  };

  const speakAnnouncement = (text: string) => {
    if (isSoundboxEnabled) {
      speakNativeText(text);
    }
  };

  const formatPrice = (amount: number): string => {
    const num = Number(amount) || 0;
    return `৳${num.toLocaleString('en-US')}`;
  };

  const refreshVault = () => {
    setVaultVersion(v => v + 1);
  };

  const theme = getIndustryTheme(tenant.industryId);

  return (
    <AuthContext.Provider
      value={{
        tenant,
        userRole,
        activeRoleMode,
        theme,
        themeMode,
        toggleThemeMode,
        isOnline,
        isSoundboxEnabled,
        setIndustryId,
        switchShop,
        switchRoleMode,
        loginShop,
        logout,
        toggleSoundbox,
        speakAnnouncement,
        triggerHaptic,
        formatPrice,
        refreshVault,
        vaultVersion
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
