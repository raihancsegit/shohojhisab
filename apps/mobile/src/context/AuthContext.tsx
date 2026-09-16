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
}

interface AuthContextType {
  tenant: TenantInfo;
  userRole: 'admin' | 'shopkeeper' | null;
  activeRoleMode: 'owner' | 'staff';
  theme: IndustryTheme;
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
  }, []);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (type === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
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
    const matched = DEMO_SHOPS.find(s => s.phone === phone.trim()) || defaultTenant;
    setTenant(matched);
    setUserRole('shopkeeper');
    setActiveRoleMode(pin === '2222' || pin === '4444' ? 'staff' : 'owner');
    AsyncStorage.setItem('shohoj_tenant_info', JSON.stringify(matched));
    await hydrateLocalVault(matched.id, matched.industryId);
    setVaultVersion(v => v + 1);
    triggerHaptic('success');
    speakAnnouncement(`${matched.shopName} এ স্বাগতম`);
    return { success: true };
  };

  const logout = () => {
    triggerHaptic('medium');
    setUserRole(null);
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
