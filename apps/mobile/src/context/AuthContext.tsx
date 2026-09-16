import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydrateLocalVault, getLocalVaultData, saveLocalVaultSnapshot } from '../lib/offlineDataVault';
import { speakNativeText, playNativeChime } from '../lib/offlineAudioEngine';
import { getIndustryTheme, IndustryTheme } from '../lib/industryConfig';

interface TenantInfo {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  industryId: string;
}

interface AuthContextType {
  tenant: TenantInfo;
  theme: IndustryTheme;
  isOnline: boolean;
  isSoundboxEnabled: boolean;
  setIndustryId: (id: string) => void;
  toggleSoundbox: () => void;
  speakAnnouncement: (text: string) => void;
  refreshVault: () => void;
}

const defaultTenant: TenantInfo = {
  id: 'tenant-1',
  shopName: 'বিসমিল্লাহ স্টোর',
  ownerName: 'মালিক',
  phone: '01700000000',
  industryId: 'cat-grocery'
};

const AuthContext = createContext<AuthContextType>({
  tenant: defaultTenant,
  theme: getIndustryTheme('cat-grocery'),
  isOnline: true,
  isSoundboxEnabled: true,
  setIndustryId: () => {},
  toggleSoundbox: () => {},
  speakAnnouncement: () => {},
  refreshVault: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo>(defaultTenant);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSoundboxEnabled, setIsSoundboxEnabled] = useState<boolean>(true);
  const [vaultKey, setVaultKey] = useState<number>(0);

  useEffect(() => {
    // Load local storage preferences
    AsyncStorage.getItem('shohoj_tenant_info').then(data => {
      if (data) {
        try { setTenant(JSON.parse(data)); } catch (e) {}
      }
    });

    AsyncStorage.getItem('shohoj_soundbox').then(data => {
      if (data !== null) setIsSoundboxEnabled(data === 'true');
    });

    hydrateLocalVault(tenant.id).then(() => setVaultKey(k => k + 1));
  }, []);

  const setIndustryId = (id: string) => {
    const updated = { ...tenant, industryId: id };
    setTenant(updated);
    AsyncStorage.setItem('shohoj_tenant_info', JSON.stringify(updated));
  };

  const toggleSoundbox = () => {
    const next = !isSoundboxEnabled;
    setIsSoundboxEnabled(next);
    AsyncStorage.setItem('shohoj_soundbox', String(next));
    playNativeChime('beep');
  };

  const speakAnnouncement = (text: string) => {
    if (isSoundboxEnabled) {
      speakNativeText(text);
    }
  };

  const refreshVault = () => {
    setVaultKey(k => k + 1);
  };

  const theme = getIndustryTheme(tenant.industryId);

  return (
    <AuthContext.Provider
      value={{
        tenant,
        theme,
        isOnline,
        isSoundboxEnabled,
        setIndustryId,
        toggleSoundbox,
        speakAnnouncement,
        refreshVault
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
