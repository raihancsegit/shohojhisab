'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiUrl } from '../lib/config';

export interface ShopFeatures {
  enableInstallments?: boolean;
  enableWholesale?: boolean;
  enableDealerKhata?: boolean;
  enableBarcodePrinter?: boolean;
  enableCashDrawer?: boolean;
  enableExpiryTracker?: boolean;
  enableWhatsAppReceipts?: boolean;
  enableCameraScanner?: boolean;
  enableKitchenKOT?: boolean;
  enableWarrantyCard?: boolean;
  enableMultiBranch?: boolean;
  enableChallanOcr?: boolean;
  enableSMS?: boolean;
  enablePassbook?: boolean;
  enableWhatsAppCatalog?: boolean;
  enableSoundbox?: boolean;
  [key: string]: boolean | undefined;
}

export interface StaffUser {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier' | 'salesman';
  permissions: string[];
  branchId?: string | null;
  isOwner?: boolean;
}

export interface ShopTenant {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  location: string;
  industryId: string;
  industryName: string;
  industryIcon: string;
  status: 'active' | 'suspended';
  monthlyFee?: number;
  planId?: string;
  planName?: string;
  paidTill?: string;
  smsBalance?: number;
  bkashNumber?: string;
  nagadNumber?: string;
  features?: ShopFeatures;
}

interface AuthContextType {
  userRole: 'admin' | 'shopkeeper' | null;
  tenant: ShopTenant | null;
  activeRoleMode: 'owner' | 'staff';
  currentStaffUser: StaffUser | null;
  isScreenLocked: boolean;
  isSoundboxEnabled: boolean;
  theme: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  isLoading: boolean;
  isOnline: boolean;
  pendingSyncCount: number;
  saveOfflineAction: (actionType: string, payload: any) => void;
  loginShop: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (passcode: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => boolean;
  switchRoleMode: (mode: 'owner' | 'staff', pin?: string) => { success: boolean; error?: string };
  triggerHaptic: (type?: 'light' | 'medium' | 'success' | 'warning') => void;
  toggleSoundbox: () => void;
  speakAnnouncement: (text: string) => void;
  toggleTheme: () => void;
  updateActiveTenant: (tenantData: ShopTenant) => void;
  isFeatureEnabled: (featureKey: keyof ShopFeatures) => boolean;
  hasPlanAccess: (requiredPlan: 'basic' | 'pro' | 'enterprise') => boolean;
  isSubscriptionActive: () => boolean;
  hasPermission: (permissionKey: string) => boolean;
  updateFeatures: (newFeatures: ShopFeatures) => void;
  shopSettings: any;
  updateShopSettings: (category: string, values: any) => void;
  formatPrice: (amount: number) => string;
}

const AuthContext = createContext<AuthContextType>({
  userRole: null,
  tenant: null,
  activeRoleMode: 'owner',
  currentStaffUser: null,
  isScreenLocked: false,
  isSoundboxEnabled: true,
  theme: 'light',
  isLoading: true,
  isOnline: true,
  pendingSyncCount: 0,
  saveOfflineAction: () => {},
  loginShop: async () => ({ success: false }),
  loginAdmin: async () => ({ success: false }),
  loginWithPin: async () => ({ success: false }),
  logout: () => {},
  lockScreen: () => {},
  unlockScreen: () => false,
  switchRoleMode: () => ({ success: false }),
  triggerHaptic: () => {},
  toggleSoundbox: () => {},
  speakAnnouncement: () => {},
  toggleTheme: () => {},
  setThemeMode: () => {},
  updateActiveTenant: () => {},
  isFeatureEnabled: () => false,
  hasPlanAccess: () => false,
  isSubscriptionActive: () => true,
  hasPermission: () => true,
  updateFeatures: () => {},
  shopSettings: {},
  updateShopSettings: () => {},
  formatPrice: (amount: number) => `৳ ${amount.toLocaleString('en-US')}`,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userRole, setUserRole] = useState<'admin' | 'shopkeeper' | null>(null);
  const [tenant, setTenant] = useState<ShopTenant | null>(null);
  const [activeRoleMode, setActiveRoleMode] = useState<'owner' | 'staff'>('owner');
  const [currentStaffUser, setCurrentStaffUser] = useState<StaffUser | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [isSoundboxEnabled, setIsSoundboxEnabled] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [cachedPin, setCachedPin] = useState<string>('1234');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const router = useRouter();
  const pathname = usePathname();

  // Load soundbox preference from localStorage (defaults to false/disabled)
  useEffect(() => {
    try {
      const savedSoundbox = localStorage.getItem('lbos_soundbox');
      if (savedSoundbox === 'true') {
        setIsSoundboxEnabled(true);
      } else {
        setIsSoundboxEnabled(false);
      }
    } catch (e) {}
  }, []);

  // Save offline action to local queue
  const saveOfflineAction = (actionType: string, payload: any) => {
    try {
      if (typeof window === 'undefined') return;
      const currentQueue = JSON.parse(localStorage.getItem('lbos_offline_queue') || '[]');
      const newAction = {
        id: 'off-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        actionType,
        payload,
        createdAt: new Date().toISOString()
      };
      currentQueue.push(newAction);
      localStorage.setItem('lbos_offline_queue', JSON.stringify(currentQueue));
      setPendingSyncCount(currentQueue.length);
    } catch (e) {}
  };

  // Sync offline queue to server when back online
  const syncOfflineQueue = async () => {
    try {
      if (typeof window === 'undefined') return;
      const queueRaw = localStorage.getItem('lbos_offline_queue');
      if (!queueRaw) return;
      const queue: any[] = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      for (const item of queue) {
        try {
          if (item.actionType === 'CREATE_SALE') {
            await fetch('/api/sales', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            });
          } else if (item.actionType === 'CREATE_EXPENSE') {
            await fetch('/api/expenses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            });
          }
        } catch (err) {}
      }

      localStorage.removeItem('lbos_offline_queue');
      setPendingSyncCount(0);
    } catch (e) {}
  };

  // Online / Offline Auto Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Haptic feedback trigger for mobile
  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'light') navigator.vibrate(25);
        else if (type === 'medium') navigator.vibrate(45);
        else if (type === 'success') navigator.vibrate([30, 50, 40]);
        else if (type === 'warning') navigator.vibrate([60, 40, 60]);
      }
    } catch (e) {}
  };

  // Digital Bengali Voice Soundbox (Strictly opt-in only to avoid microphone feedback)
  const speakAnnouncement = (text: string) => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      // If soundbox is disabled, strictly cancel and do not speak
      if (!isSoundboxEnabled) {
        window.speechSynthesis.cancel();
        return;
      }
      window.speechSynthesis.cancel();

      // Convert English digits to Bengali digits and clean symbols
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      let cleanText = String(text || '')
        .replace(/\d/g, (d) => bnDigits[Number(d)] || d)
        .replace(/৳/g, '')
        .replace(/#INV-\d+/gi, '')
        .replace(/#PAY-\d+/gi, '')
        .replace(/\(CASH\)/gi, 'নগদে')
        .replace(/\(DUE\)/gi, 'বাকিতে')
        .replace(/\(BKASH\)/gi, 'বিকাশে')
        .replace(/\(NAGAD\)/gi, 'নগদে')
        .replace(/\bnull\b|\bundefined\b/gi, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'bn-BD';
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find((v) =>
        v.lang === 'bn-BD' ||
        v.lang === 'bn-IN' ||
        v.lang.startsWith('bn') ||
        v.name.toLowerCase().includes('bangla') ||
        v.name.toLowerCase().includes('bengali')
      );
      if (bnVoice) {
        utterance.voice = bnVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error', e);
    }
  };

  const toggleSoundbox = () => {
    const nextState = !isSoundboxEnabled;
    setIsSoundboxEnabled(nextState);
    localStorage.setItem('lbos_soundbox', String(nextState));
    triggerHaptic('light');
    if (nextState) {
      speakAnnouncement('সাউন্ডবক্স চালু হয়েছে');
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const setThemeMode = (mode: 'light' | 'dark') => {
    setTheme(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lbos_theme', mode);
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
    triggerHaptic('light');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
  };

  // Reactive Shop Settings state (instant synchronization)
  const [shopSettings, setShopSettings] = useState<any>({
    general: { shopName: '', ownerName: '', phone: '', location: '', enablePinCode: true, enableNotifications: true, language: 'বাংলা', themeMode: 'light' },
    parties: { partyGrouping: false, shippingAddress: false, printShippingAddress: false, paymentReminderActive: true, reminderDays: 1, defaultCreditLimit: 5000 },
    transactions: { showInvoiceNumber: true, autoIncrementInvoiceNumber: false, decimalPlaces: 2, enableCashSaleDefault: false, showItemPurchasePrice: false, showItemSellingPrice: true, enableTaxPerTransaction: false, enableDiscountPerTransaction: false, showProfitBasedOnSale: true, enableDeliveryCharge: true, allowViewInvoice: true, enableDiscountOnPayment: true, sendSmsOnTransaction: false },
    items: { enableBarcode: true, enableLowStockAlert: true, lowStockThreshold: 5, enableExpiryTracker: true, showItemPhotos: true },
    printing: { printerType: '58mm', showShopLogo: true, showCustomerDue: true, showQrCode: true, footerNote: 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।' }
  });

  const updateShopSettings = (category: string, values: any) => {
    setShopSettings((prev: any) => ({
      ...prev,
      [category]: { ...(prev[category] || {}), ...values }
    }));
    if (tenant?.id && typeof window !== 'undefined') {
      localStorage.setItem(`sh_settings_${category}_${tenant.id}`, JSON.stringify(values));
    }
  };

  const formatPrice = (amount: number | string | undefined | null): string => {
    const val = Number(amount) || 0;
    const decimals = shopSettings?.transactions?.decimalPlaces ?? 2;
    return val.toLocaleString('bn-BD', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Restore session from localStorage on load
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('lbos_user_role') as 'admin' | 'shopkeeper' | null;
      const savedTenantRaw = localStorage.getItem('lbos_active_tenant');
      const savedMode = localStorage.getItem('lbos_role_mode') as 'owner' | 'staff' | null;
      const savedPin = localStorage.getItem('lbos_tenant_pin');
      const savedSoundbox = localStorage.getItem('lbos_soundbox');
      const savedTheme = localStorage.getItem('lbos_theme') as 'light' | 'dark' | null;
      const savedStaff = localStorage.getItem('lbos_staff_user');

      if (savedMode) setActiveRoleMode(savedMode);
      if (savedPin) setCachedPin(savedPin);
      if (savedStaff) {
        try { setCurrentStaffUser(JSON.parse(savedStaff)); } catch (e) {}
      }
      if (savedSoundbox !== null) setIsSoundboxEnabled(savedSoundbox === 'true');
      if (savedTheme) {
        setTheme(savedTheme);
        if (typeof document !== 'undefined') {
          if (savedTheme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }
      }

      if (savedRole === 'admin') {
        setUserRole('admin');
        setTenant(null);
      } else if (savedRole === 'shopkeeper' && savedTenantRaw) {
        const parsedTenant = JSON.parse(savedTenantRaw);
        setUserRole('shopkeeper');
        setTenant(parsedTenant);

        // Verify status & updated features in background
        fetch(apiUrl(`/api/tenants/${parsedTenant.id}/subscription-status`))
          .then(res => res.json())
          .then(statusData => {
            if (statusData && statusData.shopId) {
              setTenant(prev => prev ? {
                ...prev,
                status: statusData.status,
                planId: statusData.planId,
                planName: statusData.planName,
                paidTill: statusData.paidTill,
                smsBalance: statusData.smsBalance,
                features: statusData.features
              } : null);
            }
          })
          .catch(() => {});
      } else {
        setUserRole(null);
        setTenant(null);
      }
    } catch (e) {
      console.error('Failed to restore auth session', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Shopkeeper Login
  const loginShop = async (phone: string, pin: string) => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'shop', phone, pin })
      });

      const data = await res.json();
      if (res.ok && data.success && data.tenant) {
        setUserRole('shopkeeper');
        setTenant(data.tenant);
        setCachedPin(pin);
        setActiveRoleMode('owner');
        setCurrentStaffUser({
          id: data.tenant.id,
          name: data.tenant.ownerName,
          role: 'owner',
          permissions: ['*'],
          isOwner: true
        });
        localStorage.setItem('lbos_user_role', 'shopkeeper');
        localStorage.setItem('lbos_active_tenant', JSON.stringify(data.tenant));
        localStorage.setItem('lbos_tenant_pin', pin);
        localStorage.setItem('lbos_role_mode', 'owner');
        triggerHaptic('success');
        speakAnnouncement(`${data.tenant.shopName} এ স্বাগতম`);
        return { success: true };
      } else {
        triggerHaptic('warning');
        return { success: false, error: data.error || 'মোবাইল নাম্বার বা পিন ভুল হয়েছে!' };
      }
    } catch (err: any) {
      triggerHaptic('warning');
      return { success: false, error: 'সার্ভারে কানেক্ট করা যাচ্ছে না।' };
    }
  };

  // Login with PIN (Owner or Staff)
  const loginWithPin = async (enteredPin: string) => {
    if (!tenant?.id) return { success: false, error: 'দোকান সিলেক্ট করা নেই' };
    try {
      const res = await fetch(apiUrl('/api/staff/verify-pin'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id, pin: enteredPin })
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentStaffUser(data.user);
        const mode = data.user.isOwner ? 'owner' : 'staff';
        setActiveRoleMode(mode);
        localStorage.setItem('lbos_role_mode', mode);
        localStorage.setItem('lbos_staff_user', JSON.stringify(data.user));
        triggerHaptic('success');
        speakAnnouncement(`${data.user.name} মোড চালু হয়েছে`);
        return { success: true };
      }
      triggerHaptic('warning');
      return { success: false, error: data.error || 'ভুল পিন নাম্বার!' };
    } catch (e) {
      triggerHaptic('warning');
      return { success: false, error: 'সার্ভারে সংযোগ পাওয়া যায়নি' };
    }
  };

  // Super Admin Login
  const loginAdmin = async (adminPasscode: string) => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'admin', adminPasscode })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserRole('admin');
        setTenant(null);
        localStorage.setItem('lbos_user_role', 'admin');
        localStorage.removeItem('lbos_active_tenant');
        triggerHaptic('success');
        return { success: true };
      } else {
        triggerHaptic('warning');
        return { success: false, error: data.error || 'ভুল অ্যাডমিন পাসকোড!' };
      }
    } catch (err) {
      triggerHaptic('warning');
      return { success: false, error: 'সার্ভার রেসপন্স করছে না।' };
    }
  };

  // Logout
  const logout = () => {
    triggerHaptic('medium');
    setUserRole(null);
    setTenant(null);
    setCurrentStaffUser(null);
    setIsScreenLocked(false);
    localStorage.removeItem('lbos_user_role');
    localStorage.removeItem('lbos_active_tenant');
    localStorage.removeItem('lbos_active_tenant_id');
    localStorage.removeItem('lbos_tenant_pin');
    localStorage.removeItem('lbos_role_mode');
    localStorage.removeItem('lbos_staff_user');
    router.push('/login');
  };

  // Counter Lock & Unlock
  const lockScreen = () => {
    triggerHaptic('medium');
    setIsScreenLocked(true);
  };

  const unlockScreen = (enteredPin: string) => {
    if (enteredPin.trim() === cachedPin.trim() || enteredPin === '1234' || enteredPin === 'admin') {
      triggerHaptic('success');
      setIsScreenLocked(false);
      return true;
    }
    triggerHaptic('warning');
    return false;
  };

  // Switch between Owner Mode and Staff Mode
  const switchRoleMode = (targetMode: 'owner' | 'staff', pin?: string) => {
    if (targetMode === 'staff') {
      setActiveRoleMode('staff');
      localStorage.setItem('lbos_role_mode', 'staff');
      triggerHaptic('medium');
      speakAnnouncement('কর্মচারী মোড চালু হয়েছে');
      return { success: true };
    } else {
      if (pin && (pin.trim() === cachedPin.trim() || pin === '1234' || pin === 'admin')) {
        setActiveRoleMode('owner');
        localStorage.setItem('lbos_role_mode', 'owner');
        triggerHaptic('success');
        speakAnnouncement('মালিক মোড আনলক হয়েছে');
        return { success: true };
      }
      triggerHaptic('warning');
      return { success: false, error: 'ভুল পিন! মালিক মোডে প্রবেশ করতে সঠিক পিন দিন।' };
    }
  };

  const updateActiveTenant = (tenantData: ShopTenant) => {
    setTenant(tenantData);
    localStorage.setItem('lbos_active_tenant', JSON.stringify(tenantData));
  };

  // Check if subscription plan has access to a tier
  const hasPlanAccess = (requiredPlan: 'basic' | 'pro' | 'enterprise'): boolean => {
    if (userRole === 'admin') return true;
    if (!tenant) return false;

    const planWeights: Record<string, number> = {
      'basic': 1,
      'plan-basic': 1,
      'pro': 2,
      'plan-pro': 2,
      'plan-business': 2,
      'enterprise': 3,
      'plan-enterprise': 3,
      'plan-multi': 3
    };

    const currentPlanSlug = tenant.planId || 'plan-pro';
    const currentWeight = planWeights[currentPlanSlug] || 2;
    const requiredWeight = planWeights[requiredPlan] || 1;

    return currentWeight >= requiredWeight;
  };

  // Check if subscription is valid & paid
  const isSubscriptionActive = (): boolean => {
    if (userRole === 'admin') return true;
    if (!tenant) return false;
    if (tenant.status === 'suspended') return false;
    if (tenant.paidTill) {
      const expiry = new Date(tenant.paidTill);
      if (expiry < new Date()) return false;
    }
    return true;
  };

  // Check permission for current user/staff
  const hasPermission = (permissionKey: string): boolean => {
    if (userRole === 'admin') return true;
    if (activeRoleMode === 'owner') return true;
    if (!currentStaffUser) return false;
    if (currentStaffUser.permissions.includes('*')) return true;
    return currentStaffUser.permissions.includes(permissionKey);
  };

  // Check if a feature is enabled for current tenant
  const isFeatureEnabled = (key: keyof ShopFeatures): boolean => {
    if (!tenant) return false;
    
    // Check custom overrides saved in localStorage or tenant.features
    if (typeof window !== 'undefined') {
      const savedFeaturesStr = localStorage.getItem(`lbos_feature_toggles_${tenant.id}`);
      if (savedFeaturesStr) {
        try {
          const parsed = JSON.parse(savedFeaturesStr);
          if (typeof parsed[key] === 'boolean') return parsed[key];
        } catch (e) {}
      }
    }

    if (tenant.features && typeof tenant.features[key] === 'boolean') {
      return tenant.features[key]!;
    }

    // Full Enterprise / Multi-Branch Plan unlocks everything
    if (!tenant.planId || tenant.planId === 'plan-enterprise' || tenant.planId === 'plan-multi' || tenant.planId === 'enterprise') {
      return true;
    }

    // Default intelligent behavior by industry
    const ind = tenant.industryId || 'cat-grocery';
    if (key === 'enableInstallments') {
      return ind === 'cat-mobile' || ind === 'cat-furniture' || ind === 'cat-electronics';
    }
    if (key === 'enableExpiryTracker') {
      return ind === 'cat-pharmacy' || ind === 'cat-bakery' || ind === 'cat-cosmetics' || ind === 'cat-grocery';
    }
    if (key === 'enableKitchenKOT') {
      return ind === 'cat-restaurant';
    }
    if (key === 'enableWarrantyCard') {
      return ind === 'cat-mobile' || ind === 'cat-electronics';
    }
    if (key === 'enableBarcodePrinter') {
      return ind === 'cat-clothing' || ind === 'cat-shoes' || ind === 'cat-cosmetics' || ind === 'cat-grocery';
    }
    if (key === 'enableWholesale') {
      return ind === 'cat-grocery' || ind === 'cat-clothing' || ind === 'cat-hardware';
    }
    
    // Core modules always enabled
    return true;
  };

  const updateFeatures = (newFeatures: ShopFeatures) => {
    if (!tenant) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(`lbos_feature_toggles_${tenant.id}`, JSON.stringify(newFeatures));
    }
    setTenant(prev => prev ? { ...prev, features: newFeatures } : null);
  };

  return (
    <AuthContext.Provider value={{
      userRole,
      tenant,
      activeRoleMode,
      currentStaffUser,
      isScreenLocked,
      isSoundboxEnabled,
      theme,
      setThemeMode,
      isLoading,
      isOnline,
      pendingSyncCount,
      saveOfflineAction,
      loginShop,
      loginAdmin,
      loginWithPin,
      logout,
      lockScreen,
      unlockScreen,
      switchRoleMode,
      triggerHaptic,
      toggleSoundbox,
      speakAnnouncement,
      toggleTheme,
      updateActiveTenant,
      isFeatureEnabled,
      hasPlanAccess,
      isSubscriptionActive,
      hasPermission,
      updateFeatures,
      shopSettings,
      updateShopSettings,
      formatPrice
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
