'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_CATEGORIES = [
  { id: 'cat-grocery', banglaName: 'মুদি ও সুপার শপ (Grocery & Super Shop)', icon: '🛒' },
  { id: 'cat-pharmacy', banglaName: 'ফার্মেসি ও ওষুধ (Pharmacy & Medicine)', icon: '💊' },
  { id: 'cat-cosmetics', banglaName: 'কসমেটিক্স ও সাজসজ্জা (Cosmetics & Beauty)', icon: '💄' },
  { id: 'cat-clothing', banglaName: 'পোশাক ও ফ্যাশন শপ (Clothing & Fashion)', icon: '👗' },
  { id: 'cat-shoes', banglaName: 'জুতা ও ফুটওয়্যার (Shoes & Footwear)', icon: '👞' },
  { id: 'cat-mobile', banglaName: 'মোবাইল ও ইলেকট্রনিক্স (Mobile & Electronics)', icon: '📱' },
  { id: 'cat-hardware', banglaName: 'হার্ডওয়্যার ও স্যানিটারি (Hardware & Sanitary)', icon: '🔧' },
  { id: 'cat-restaurant', banglaName: 'রেস্তোরাঁ ও ক্যাফে (Restaurant & Cafe)', icon: '🍔' },
  { id: 'cat-bakery', banglaName: 'বেকারি ও কনফেকশনারি (Bakery & Confectionery)', icon: '🎂' },
  { id: 'cat-sweet', banglaName: 'মিষ্টি ও মিষ্টান্ন ভাণ্ডার (Sweetmeat & Desserts)', icon: '🧁' },
  { id: 'cat-stationery', banglaName: 'বই ও স্টেশনারি (Books & Stationery)', icon: '📚' },
  { id: 'cat-meat-fish', banglaName: 'মাংস ও মাছের আড়ত (Meat & Fish)', icon: '🥩' },
  { id: 'cat-furniture', banglaName: 'ফার্নিচার ও আসবাবপত্র (Furniture & Wood)', icon: '🛋️' },
  { id: 'cat-tea', banglaName: 'চা স্টল ও স্ন্যাক্স বার (Tea Stall & Snacks)', icon: '☕' },
  { id: 'cat-wholesale', banglaName: 'পাইকারি ও ডিলার এজেন্সি (Wholesale & Agency)', icon: '📦' },
  { id: 'cat-general', banglaName: 'সাধারণ রিটেইল ব্যবসা (General Retail)', icon: '🏪' }
];

export default function SuperAdminPage() {
  const { userRole, loginAdmin, logout, updateActiveTenant, triggerHaptic } = useAuth();
  const router = useRouter();

  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'coupons' | 'analytics' | 'settings'>('shops');

  const [tenants, setTenants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>({
    totalShops: 0,
    activeShops: 0,
    suspendedShops: 0,
    monthlyRecurringRevenue: 0,
    totalSubscriptionRevenue: 0,
    totalTransactions: 0,
    totalSalesVolume: 0,
    totalCollected: 0,
    totalMarketDue: 0,
    totalProductsCount: 0,
    totalCustomersCount: 0,
    totalCouponsCount: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending_approval' | 'trial' | 'active' | 'expired' | 'suspended'>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editModalShop, setEditModalShop] = useState<any | null>(null);
  const [featureModalShop, setFeatureModalShop] = useState<any | null>(null);
  const [shopFeatures, setShopFeatures] = useState<any>({});
  const [resetPinShop, setResetPinShop] = useState<any | null>(null);
  const [smsRechargeShop, setSmsRechargeShop] = useState<any | null>(null);
  const [smsCountInput, setSmsCountInput] = useState('100');
  const [inspectShop, setInspectShop] = useState<any | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [createdHandoff, setCreatedHandoff] = useState<any | null>(null);
  const [notice, setNotice] = useState('');

  // New Shop Form state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [location, setLocation] = useState('স্থানীয় বাজার');
  const [industryCategoryId, setIndustryCategoryId] = useState('cat-grocery');
  const [selectedPlanId, setSelectedPlanId] = useState('plan-pro');
  const [selectedBillingOption, setSelectedBillingOption] = useState<'trial' | 'monthly_pro' | 'yearly_pro' | 'basic' | 'enterprise'>('trial');
  const [monthlyFee, setMonthlyFee] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  // New Coupon Form state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponDiscountValue, setCouponDiscountValue] = useState('10');
  const [couponMinOrder, setCouponMinOrder] = useState('0');
  const [couponMaxUses, setCouponMaxUses] = useState('1000');
  const [couponExpiry, setCouponExpiry] = useState('2028-12-31');

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<any>({
    // 1. General & Branding
    platformName: 'ShohojHisab (সহজ হিসাব)',
    tagline: 'বাংলাদেশের এক নম্বর লোকাল বিজনেস ওএস',
    supportPhone: '01986233234',
    supportWhatsApp: '01986233234',
    supportEmail: 'support@shohojhisab.com',
    hqAddress: 'ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ',
    currencySymbol: '৳',
    timezone: 'Asia/Dhaka',
    copyrightText: '© ২০২৬ সহজ হিসাব। সর্বস্বত্ব সংরক্ষিত।',

    // 2. Payment Gateway & Merchant
    bkashMerchant: '01986233234',
    bkashAccountType: 'merchant',
    nagadMerchant: '01986233234',
    nagadAccountType: 'merchant',
    rocketNumber: '019862332348',
    autoActivateSubscriptions: 'true',
    instantPgVerification: 'true',
    paymentInstructions: 'বিকাশ বা নগদ অ্যাপ থেকে পেমেন্ট অপশনে গিয়ে ট্রানজেকশন আইডি দিন।',

    // 3. SMS & Notification Gateway
    smsGatewayProvider: 'BulkSMSBD',
    smsApiKey: 'live_sec_key_shohoj_882910',
    smsSenderId: 'SHOHOJ',
    costPerSms: '0.35',
    sendWelcomeSms: 'true',
    sendDueReminderSms: 'true',
    welcomeSmsTemplate: 'সহজ হিসাব-এ স্বাগতম! আপনার দোকান সফলভাবে নিবন্ধিত হয়েছে।',
    dueSmsTemplate: 'সালামু আলাইকুম, আপনার {shopName} এ ৳{dueAmount} বকেয়া রয়েছে। পরিশোধের বিনীত অনুরোধ।',

    // 4. Subscription & Pricing
    defaultMonthlyFee: '149',
    basicPlanMonthly: '99',
    proPlanMonthly: '149',
    enterprisePlanMonthly: '299',
    freeTrialDays: '7',
    gracePeriodDays: '7',
    yearlyDiscountPercent: '20',
    allowTrialWithoutCard: 'true',

    // 5. Global Feature Flags
    globalVoicePOS: 'true',
    globalOcrScanner: 'true',
    globalThermalPrint: 'true',
    globalMultiBranch: 'true',
    maintenanceMode: 'false',
    maintenanceNotice: 'সিস্টেম মেইনটেন্যান্সের কাজ চলছে। সাময়িক অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত।',
    globalAnnouncementBanner: 'নতুন ভয়েস মেমো ও সাউন্ডবক্স ফিচার এখন সক্রিয়!',
    showAnnouncementBanner: 'true',

    // 6. Cloud & Backup
    autoBackupInterval: 'daily',
    lastBackupDate: new Date().toISOString()
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'payment' | 'sms' | 'billing' | 'features' | 'backup' | 'audit'>('general');
  const [diagResult, setDiagResult] = useState<any | null>(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const [detailedAnalytics, setDetailedAnalytics] = useState<any>({
    planBreakdown: [],
    recentTransactions: [],
    shopRankings: [],
    categoryStats: [],
    monthlySales: []
  });

  const loadAdminData = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch (e) {}

    try {
      const ovRes = await fetch('/api/admin/overview');
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }
    } catch (e) {}

    try {
      const detRes = await fetch('/api/admin/analytics-detailed');
      if (detRes.ok) {
        setDetailedAnalytics(await detRes.json());
      }
    } catch (e) {}

    try {
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData) && catData.length > 0) {
          setCategories(catData);
        }
      }
    } catch (e) {}

    try {
      const coupRes = await fetch('/api/admin/coupons');
      if (coupRes.ok) {
        setCoupons(await coupRes.json());
      }
    } catch (e) {}

    try {
      const logRes = await fetch('/api/admin/audit-logs');
      if (logRes.ok) {
        setAuditLogs(await logRes.json());
      }
    } catch (e) {}

    try {
      const setRes = await fetch('/api/admin/settings');
      if (setRes.ok) {
        setPlatformSettings(await setRes.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (userRole === 'admin') {
      loadAdminData();
    }
  }, [userRole]);

  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await loginAdmin(passcode);
    if (!res.success) {
      setPassError(res.error || 'ভুল অ্যাডমিন পাসকোড!');
    } else {
      setPassError('');
      loadAdminData();
    }
  };

  // Impersonate / Login-as-Shop
  const handleImpersonateShop = (shop: any) => {
    triggerHaptic('success');
    const tenantPayload = {
      id: shop.id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      phone: shop.phone,
      location: shop.location,
      industryId: shop.industryId,
      industryName: shop.industryName,
      industryIcon: shop.industryIcon,
      status: shop.status,
      planId: shop.planId,
      planName: shop.planName,
      paidTill: shop.paidTill,
      smsBalance: shop.smsBalance,
      monthlyFee: shop.monthlyFee,
      features: shop.features
    };

    localStorage.setItem('lbos_user_role', 'shopkeeper');
    localStorage.setItem('lbos_active_tenant', JSON.stringify(tenantPayload));
    localStorage.setItem('lbos_role_mode', 'owner');
    updateActiveTenant(tenantPayload);
    router.push('/');
  };

  // Change Shop Plan
  const handleChangeShopPlan = async (shopId: string, newPlanId: string) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/admin/tenants/${shopId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: newPlanId })
      });
      if (res.ok) {
        await loadAdminData();
        setNotice('✓ দোকানের সাবস্ক্রিপশন প্ল্যান সফলভাবে পরিবর্তন করা হয়েছে!');
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Extend Shop Validity
  const handleExtendValidity = async (shopId: string, months: number) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/admin/tenants/${shopId}/extend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months })
      });
      if (res.ok) {
        const d = await res.json();
        await loadAdminData();
        setNotice(`✓ ${d.message}`);
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Approve Pending Shop (Trial or Paid)
  const handleApproveShop = async (shopId: string, mode: 'trial' | 'paid' = 'trial') => {
    triggerHaptic('success');
    try {
      const res = await fetch(`/api/admin/tenants/${shopId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, durationDays: mode === 'trial' ? 7 : 30 })
      });
      if (res.ok) {
        const d = await res.json();
        await loadAdminData();
        setNotice(`✓ ${d.message || 'দোকান অনুমোদন করা হয়েছে!'}`);
        setTimeout(() => setNotice(''), 4000);
      } else {
        const err = await res.json();
        setNotice(`⚠️ ${err.error || 'অনুমোদন সম্পন্ন করা সম্ভব হয়নি'}`);
      }
    } catch (e) {
      setNotice('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি');
    }
  };

  // Extend 7-Day Free Trial
  const handleExtendTrial = async (shopId: string, days = 7) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/admin/tenants/${shopId}/trial`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });
      if (res.ok) {
        const d = await res.json();
        await loadAdminData();
        setNotice(`✓ ${d.message}`);
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Toggle Shop Status (Active vs Suspended)
  const toggleShopStatus = async (shopId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/admin/tenants/${shopId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await loadAdminData();
        setNotice(`✓ দোকানের স্ট্যাটাস ${nextStatus === 'active' ? 'সক্রিয়' : 'স্থগিত'} করা হয়েছে!`);
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // SMS Recharge
  const handleSmsRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsRechargeShop || !smsCountInput) return;
    triggerHaptic('medium');
    try {
      const res = await fetch('/api/admin/sms/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: smsRechargeShop.id,
          smsCount: Number(smsCountInput)
        })
      });
      if (res.ok) {
        const d = await res.json();
        setNotice(`✓ ${d.message}`);
        setSmsRechargeShop(null);
        await loadAdminData();
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Reset PIN
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinShop || !newPinInput || newPinInput.length < 4) return;
    triggerHaptic('medium');

    try {
      const res = await fetch(`/api/admin/tenants/${resetPinShop.id}/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPinInput })
      });
      if (res.ok) {
        const d = await res.json();
        setNotice(`✓ ${d.message}`);
        setResetPinShop(null);
        setNewPinInput('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
  };

  // Save Edit Shop Details
  const handleSaveEditShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalShop) return;
    triggerHaptic('medium');

    try {
      const res = await fetch(`/api/admin/tenants/${editModalShop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: editModalShop.shopName,
          ownerName: editModalShop.ownerName,
          phone: editModalShop.phone,
          location: editModalShop.location,
          industryCategoryId: editModalShop.industryId || editModalShop.industryCategoryId,
          planId: editModalShop.planId,
          pin: editModalShop.pin,
          status: editModalShop.status,
          billingCycle: editModalShop.billingCycle,
          paidTill: editModalShop.paidTill,
          monthlyFee: Number(editModalShop.monthlyFee) || 0,
          smsBalance: Number(editModalShop.smsBalance) || 0
        })
      });
      if (res.ok) {
        await loadAdminData();
        setNotice('✓ দোকানের তথ্য সফলভাবে আপডেট হয়েছে!');
        setEditModalShop(null);
        setTimeout(() => setNotice(''), 3500);
      } else {
        const err = await res.json();
        alert(err.error || 'আপডেট করতে সমস্যা হয়েছে!');
      }
    } catch (e) {
      alert('সার্ভার এরর!');
    }
  };

  // Delete Shop
  const handleDeleteShop = async (shop: any) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${shop.shopName}" এবং এর সমস্ত ডেটা ডিলিট করতে চান? এই কাজ ফিরিয়ে নেওয়া যাবে না!`)) {
      return;
    }
    triggerHaptic('warning');
    try {
      const res = await fetch(`/api/admin/tenants/${shop.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadAdminData();
        setNotice('✓ দোকান সফলভাবে ডিলিট করা হয়েছে!');
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Deep Inspect Shop Data
  const handleOpenInspect = async (shop: any) => {
    triggerHaptic('light');
    setInspectShop(shop);
    setInspectData(null);
    try {
      const res = await fetch(`/api/tenants/${shop.id}/subscription-status`);
      if (res.ok) {
        setInspectData(await res.json());
      }
    } catch (e) {}
  };

  // Open Feature Controls for specific shop
  const openFeatureModal = (shop: any) => {
    let currentFeats: any = {};
    if (shop.features) {
      try { currentFeats = typeof shop.features === 'string' ? JSON.parse(shop.features) : shop.features; } catch (e) {}
    } else {
      currentFeats = {
        enableInstallments: true,
        enableWholesale: true,
        enableDealerKhata: true,
        enableBarcodePrinter: true,
        enableCashDrawer: true,
        enableExpiryTracker: true,
        enableWhatsAppReceipts: true,
        enableCameraScanner: true,
        enableMultiBranch: shop.planId === 'plan-enterprise',
        enableChallanOcr: true,
        enableSMS: true,
        enablePassbook: true
      };
    }
    setShopFeatures(currentFeats);
    setFeatureModalShop(shop);
    triggerHaptic('light');
  };

  // Save Feature Controls for shop
  const handleSaveShopFeatures = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureModalShop) return;
    triggerHaptic('success');

    try {
      await fetch(`/api/admin/tenants/${featureModalShop.id}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: shopFeatures })
      });
      setNotice(`✓ "${featureModalShop.shopName}" দোকানের বিশেষ ফিচারসমূহ সফলভাবে আপডেট করা হয়েছে!`);
      setFeatureModalShop(null);
      await loadAdminData();
      setTimeout(() => setNotice(''), 3500);
    } catch (e) {}
  };

  // Save Platform Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformSettings)
      });
      if (res.ok) {
        setNotice('✓ প্ল্যাটফর্ম সেটিংস সফলভাবে সংরক্ষিত ও ডাটাবেজে আপডেট হয়েছে!');
        await loadAdminData();
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {
      alert('সেটিংস সংরক্ষণে সমস্যা হয়েছে');
    }
    setSavingSettings(false);
  };

  // Download Full Database JSON Backup
  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    triggerHaptic('light');
    try {
      const res = await fetch('/api/admin/backup/export');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shohojhisab_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setNotice('✓ সম্পূর্ণ ডাটাবেজ ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {
      alert('ব্যাকআপ ফাইল তৈরি করতে ব্যর্থ হয়েছে');
    }
    setIsDownloadingBackup(false);
  };

  // Clear System Cache & Diagnostics
  const handleClearSystemCache = async () => {
    setIsClearingCache(true);
    triggerHaptic('medium');
    try {
      const res = await fetch('/api/admin/system/clear-cache', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setDiagResult(data);
        setNotice('✓ ' + data.message);
        await loadAdminData();
        setTimeout(() => setNotice(''), 4500);
      }
    } catch (e) {
      alert('ক্যাশ ক্লিয়ার করতে ব্যর্থ হয়েছে');
    }
    setIsClearingCache(false);
  };

  // Create New Shop
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !ownerName || !phone) return;
    setSubmitting(true);
    triggerHaptic('medium');

    const isTrial = selectedBillingOption === 'trial';
    const cycle = isTrial ? 'trial' : (selectedBillingOption === 'yearly_pro' ? 'yearly' : 'monthly');
    const fee = isTrial ? 0 : (Number(monthlyFee) || (selectedBillingOption === 'yearly_pro' ? 1499 : 149));

    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          ownerName,
          phone,
          pin: pin || '1234',
          location,
          industryCategoryId,
          planId: selectedPlanId,
          monthlyFee: fee,
          isTrial,
          billingCycle: cycle,
          durationDays: isTrial ? 7 : (cycle === 'yearly' ? 365 : 30)
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedHandoff({
          shopName,
          ownerName,
          phone,
          pin: pin || '1234',
          location,
          monthlyFee: isTrial ? '০ (৭ দিন ফ্রি ট্রায়াল)' : `${fee}`,
          billingCycle: isTrial ? 'ফ্রি ট্রায়াল (৭ দিন)' : (cycle === 'yearly' ? 'বাৎসরিক (৩৬৫ দিন)' : 'মাসিক (৩০ দিন)'),
          industryName: data.tenant?.industryName || 'সাধারণ দোকান'
        });

        await loadAdminData();
        setShowAddModal(false);
        setShopName('');
        setOwnerName('');
        setPhone('');
        setPin('1234');
        setLocation('স্থানীয় বাজার');
        setSelectedBillingOption('trial');
        setSelectedPlanId('plan-pro');
        setMonthlyFee('0');
        triggerHaptic('success');
      } else {
        alert(data.error || 'দোকান তৈরি করতে সমস্যা হয়েছে!');
      }
    } catch (err) {
      alert('সার্ভার এরর!');
    }
    setSubmitting(false);
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    triggerHaptic('medium');
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          discountType: couponDiscountType,
          discountValue: Number(couponDiscountValue) || 10,
          minOrderAmount: Number(couponMinOrder) || 0,
          maxUses: Number(couponMaxUses) || 1000,
          expiryDate: couponExpiry
        })
      });
      if (res.ok) {
        setNotice('✓ নতুন প্রোমো কুপন তৈরি হয়েছে!');
        setShowCouponModal(false);
        setCouponCode('');
        await loadAdminData();
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('কুপনটি ডিলিট করতে চান?')) return;
    try {
      await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      await loadAdminData();
      setNotice('✓ কুপন ডিলিট করা হয়েছে!');
      setTimeout(() => setNotice(''), 3500);
    } catch (e) {}
  };

  // Unauthenticated Admin Passcode Screen
  if (userRole !== 'admin') {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="ui-card" style={{ maxWidth: '400px', width: '100%', padding: '36px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '14px' }}>👑</span>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
            সুপার অ্যাডমিন লগইন
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
            প্ল্যাটফর্ম ওনার ও সাবস্ক্রিপশন কন্ট্রোল প্যানেলে প্রবেশ করতে আপনার মাস্টার পাসকোড দিন।
          </p>

          <form onSubmit={handleAdminUnlock} style={{ display: 'grid', gap: '14px' }}>
            <input
              type="password"
              placeholder="মাস্টার পাসকোড দিন (admin)"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '15px',
                textAlign: 'center',
                letterSpacing: '2px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {passError && (
              <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: '700' }}>
                ⚠️ {passError}
              </div>
            )}

            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                color: '#fff',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.4)'
              }}
            >
              🔓 কন্ট্রোল সেন্টারে প্রবেশ করুন
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getRemainingDays = (paidTillStr?: string) => {
    if (!paidTillStr) return null;
    try {
      const target = new Date(paidTillStr + 'T23:59:59');
      const now = new Date();
      const diffTime = target.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
      return null;
    }
  };

  const filteredTenants = tenants.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q ||
                   (t.shopName && t.shopName.toLowerCase().includes(q)) ||
                   (t.ownerName && t.ownerName.toLowerCase().includes(q)) ||
                   (t.phone && t.phone.includes(q)) ||
                   (t.location && t.location.toLowerCase().includes(q));
    const matchStatus = filterStatus === 'all'
      ? true
      : filterStatus === 'pending_approval'
      ? (t.status === 'pending_approval' || t.status === 'pending')
      : filterStatus === 'trial'
      ? (t.billingCycle === 'trial' || t.isTrial || t.status === 'trial')
      : filterStatus === 'active'
      ? (t.status === 'active' && t.billingCycle !== 'trial' && !t.isTrial)
      : filterStatus === 'expired'
      ? (t.status === 'expired')
      : t.status === filterStatus;
    const matchCat = filterCategory === 'all' || t.industryId === filterCategory || t.industryCategoryId === filterCategory;
    return matchQ && matchStatus && matchCat;
  });

  return (
    <div className="app-container" style={{ paddingBottom: '96px', maxWidth: '1260px', width: '100%' }}>
      
      {/* Top Super Admin Glass Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #311042 100%)',
        borderRadius: '28px',
        padding: '28px 24px',
        color: '#ffffff',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.1)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '800', marginBottom: '8px' }}>
            <span>👑 ShohojHisab Platform Master Suite</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            সুপার অ্যাডমিন কন্ট্রোল সেন্টার
          </h1>
          <p style={{ fontSize: '13.5px', color: '#cbd5e1', margin: 0 }}>
            সকল দোকানের সাবস্ক্রিপশন প্ল্যান, মেয়াদ বৃদ্ধি, এসএমএস পুল, কুপন এবং ফিচার পারমিশন নিয়ন্ত্রণ করুন।
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '11px 20px',
              borderRadius: '14px',
              fontSize: '13.5px',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
          >
            <span>➕ নতুন দোকান যুক্ত করুন</span>
          </button>

          <button
            onClick={logout}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '11px 18px',
              borderRadius: '14px',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            লগআউট
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '14px 18px', borderRadius: '16px', marginBottom: '20px', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)' }}>
          <span>✓</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'shops', label: `🏪 সকল দোকান ও লাইসেন্স (${tenants.length})`, icon: '🏪' },
          { id: 'coupons', label: `🎟️ প্রোমো কুপন (${coupons.length})`, icon: '🎟️' },
          { id: 'analytics', label: '📊 সেলস ও সাবস্ক্রিপশন আয়', icon: '📊' },
          { id: 'settings', label: '⚙️ সেটিংস ও অডিট লগ', icon: '⚙️' }
        ].map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); triggerHaptic('light'); }}
              style={{
                padding: '11px 20px',
                borderRadius: '14px',
                border: active ? '1.5px solid #0f172a' : '1px solid rgba(226, 232, 240, 0.9)',
                background: active ? '#0f172a' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                fontWeight: active ? '900' : '700',
                fontSize: '13.5px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active ? '0 4px 14px rgba(15, 23, 42, 0.15)' : '0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHOPS DIRECTORY & CONTROL */}
      {activeTab === 'shops' && (
        <div>
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="ui-card" style={{ borderLeft: '4px solid #3b82f6', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>মোট দোকান সংখ্যা</span>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: '18px' }}>🏪</span>
              </div>
              <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px' }}>
                {overview.totalShops} টি
              </div>
              <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700' }}>
                চালু: {overview.activeShops} টি • স্থগিত: {overview.suspendedShops} টি
              </span>
            </div>

            <div className="ui-card" style={{ borderLeft: '4px solid #f59e0b', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>অনুমোদন অপেক্ষমাণ</span>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'grid', placeItems: 'center', fontSize: '18px' }}>⏳</span>
              </div>
              <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#b45309', margin: '4px 0 2px' }}>
                {overview.pendingShops ?? tenants.filter(t => t.status === 'pending_approval' || t.status === 'pending').length} টি
              </div>
              <button
                onClick={() => setFilterStatus('pending_approval')}
                style={{ fontSize: '12px', color: '#b45309', fontWeight: '800', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
              >
                ফিল্টার করে অনুমোদন করুন →
              </button>
            </div>

            <div className="ui-card" style={{ borderLeft: '4px solid #10b981', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>মাসিক সম্ভাব্য MRR</span>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', fontSize: '18px' }}>💳</span>
              </div>
              <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#059669', margin: '4px 0 2px' }}>
                ৳{overview.monthlyRecurringRevenue?.toLocaleString('en-US')}
              </div>
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>
                মোট সাবস্ক্রিপশন: ৳{overview.totalSubscriptionRevenue || 0}
              </span>
            </div>

            <div className="ui-card" style={{ borderLeft: '4px solid #8b5cf6', padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>দোকানসমূহের বিক্রি</span>
                <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: '18px' }}>📈</span>
              </div>
              <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#7c3aed', margin: '4px 0 2px' }}>
                ৳{overview.totalSalesVolume?.toLocaleString('en-US')}
              </div>
              <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '700' }}>
                মোট {overview.totalTransactions} টি মেমো
              </span>
            </div>
          </div>

          {/* Search, Filter & Segmented Tabs Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search Bar */}
              <div style={{ flex: '1 1 280px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '16px', fontSize: '16px', color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
                <input
                  type="text"
                  placeholder="দোকানের নাম, মালিকের নাম, মোবাইল বা লোকেশন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 44px',
                    borderRadius: '16px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: '#475569'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Industry Category Dropdown */}
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '16px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    background: '#ffffff',
                    outline: 'none',
                    fontWeight: '700',
                    color: '#334155',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <option value="all">📦 সব ক্যাটাগরি ({categories.length})</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🏪'} {c.banglaName || c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Counter Badge */}
              <div style={{
                padding: '10px 16px',
                borderRadius: '14px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                fontSize: '12.5px',
                fontWeight: '800',
                color: '#475569',
                whiteSpace: 'nowrap'
              }}>
                দেখাচ্ছে: <strong style={{ color: '#0f172a' }}>{filteredTenants.length}</strong> / {tenants.length} টি
              </div>
            </div>

            {/* Segmented Status Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { key: 'all', label: 'সকল দোকান', count: tenants.length, icon: '🏪', color: '#0f172a' },
                { key: 'pending_approval', label: 'অনুমোদন অপেক্ষমাণ', count: tenants.filter(t => t.status === 'pending_approval' || t.status === 'pending').length, icon: '⏳', color: '#b45309', glow: true },
                { key: 'trial', label: '৭ দিনের ফ্রি ট্রায়াল', count: tenants.filter(t => t.billingCycle === 'trial' || t.isTrial || t.status === 'trial').length, icon: '🎁', color: '#7e22ce' },
                { key: 'active', label: 'চালু পেইড দোকান', count: tenants.filter(t => t.status === 'active' && t.billingCycle !== 'trial' && !t.isTrial).length, icon: '✅', color: '#059669' },
                { key: 'expired', label: 'মেয়াদোত্তীর্ণ', count: tenants.filter(t => t.status === 'expired').length, icon: '⚠️', color: '#dc2626' },
                { key: 'suspended', label: 'স্থগিত দোকান', count: tenants.filter(t => t.status === 'suspended').length, icon: '⏸', color: '#64748b' }
              ].map(p => {
                const isSelected = filterStatus === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => { setFilterStatus(p.key as any); triggerHaptic('light'); }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '99px',
                      border: isSelected ? `2px solid ${p.color}` : '1.5px solid #e2e8f0',
                      background: isSelected ? (p.key === 'all' ? '#0f172a' : p.color + '18') : '#ffffff',
                      color: isSelected ? (p.key === 'all' ? '#ffffff' : p.color) : '#64748b',
                      fontSize: '13px',
                      fontWeight: isSelected ? '900' : '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 3px 10px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '900',
                      padding: '1px 6px',
                      borderRadius: '99px',
                      background: isSelected ? (p.key === 'all' ? 'rgba(255,255,255,0.2)' : p.color) : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#64748b'
                    }}>
                      {p.count}
                    </span>
                    {p.glow && p.count > 0 && !isSelected && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shop List or Empty State */}
          {filteredTenants.length === 0 ? (
            <div className="ui-card" style={{ textAlign: 'center', padding: '56px 20px', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                কোনো দোকান খুঁজে পাওয়া যায়নি
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '420px', margin: '0 auto 18px' }}>
                আপনার সার্চ শব্দ বা নির্বাচিত ফিল্টারের সাথে মিল রেখে কোনো দোকান পাওয়া যায়নি।
              </p>
              <button
                onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterCategory('all'); }}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                সব ফিল্টার রিসেট করুন
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '18px' }}>
              {filteredTenants.map(t => {
                const remainingDays = getRemainingDays(t.paidTill);
                const isPending = t.status === 'pending_approval' || t.status === 'pending';
                const isTrial = t.billingCycle === 'trial' || t.isTrial || t.status === 'trial';
                const isActivePaid = t.status === 'active' && !isTrial;
                const isExpired = t.status === 'expired' || (remainingDays !== null && remainingDays <= 0 && !isPending);

                return (
                  <div
                    key={t.id}
                    className="ui-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      padding: '22px 24px',
                      borderRadius: '22px',
                      border: '1px solid rgba(226, 232, 240, 0.95)',
                      borderLeft: isPending
                        ? '6px solid #f59e0b'
                        : isTrial
                        ? '6px solid #8b5cf6'
                        : isActivePaid
                        ? '6px solid #10b981'
                        : '6px solid #ef4444',
                      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
                      background: '#ffffff',
                      position: 'relative'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Shop Avatar */}
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '18px',
                          background: isPending
                            ? '#fef3c7'
                            : isTrial
                            ? '#f3e8ff'
                            : isActivePaid
                            ? '#ecfdf5'
                            : '#fee2e2',
                          color: isPending
                            ? '#b45309'
                            : isTrial
                            ? '#7e22ce'
                            : isActivePaid
                            ? '#059669'
                            : '#dc2626',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '28px',
                          border: `1.5px solid ${isPending ? '#fde68a' : isTrial ? '#d8b4fe' : isActivePaid ? '#a7f3d0' : '#fca5a5'}`
                        }}>
                          {t.industryIcon || '🏪'}
                        </div>

                        <div>
                          {/* Name & Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                              {t.shopName}
                            </h3>

                            {/* Status Tag */}
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: '800',
                              padding: '3px 10px',
                              borderRadius: '99px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: isPending
                                ? '#fef3c7'
                                : isTrial
                                ? '#f3e8ff'
                                : isActivePaid
                                ? '#ecfdf5'
                                : '#fee2e2',
                              color: isPending
                                ? '#b45309'
                                : isTrial
                                ? '#7e22ce'
                                : isActivePaid
                                ? '#059669'
                                : '#dc2626',
                              border: `1px solid ${isPending ? '#fde68a' : isTrial ? '#d8b4fe' : isActivePaid ? '#a7f3d0' : '#fca5a5'}`
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isPending ? '#b45309' : isTrial ? '#7e22ce' : isActivePaid ? '#059669' : '#dc2626',
                                display: 'inline-block'
                              }} />
                              {isPending
                                ? '⏳ অনুমোদন অপেক্ষমাণ'
                                : isTrial
                                ? '🎁 ৭ দিনের ফ্রি ট্রায়াল'
                                : isActivePaid
                                ? '● সক্রিয় পেইড'
                                : isExpired
                                ? '⚠️ মেয়াদোত্তীর্ণ'
                                : '● স্থগিত'}
                            </span>

                            {/* Trial Countdown or Validity Days Badge */}
                            {isTrial && (
                              <span style={{
                                fontSize: '11.5px',
                                fontWeight: '800',
                                padding: '3px 10px',
                                borderRadius: '99px',
                                background: remainingDays !== null && remainingDays > 0 ? '#faf5ff' : '#fee2e2',
                                color: remainingDays !== null && remainingDays > 0 ? '#6b21a8' : '#b91c1c',
                                border: `1px solid ${remainingDays !== null && remainingDays > 0 ? '#e9d5ff' : '#fca5a5'}`
                              }}>
                                {remainingDays !== null && remainingDays > 0
                                  ? `⏳ আর ${remainingDays} দিন ফ্রি`
                                  : '⚠️ ট্রায়াল শেষ!'}
                              </span>
                            )}

                            {isActivePaid && remainingDays !== null && (
                              <span style={{
                                fontSize: '11.5px',
                                fontWeight: '800',
                                padding: '3px 10px',
                                borderRadius: '99px',
                                background: remainingDays > 0 ? '#f0fdf4' : '#fee2e2',
                                color: remainingDays > 0 ? '#15803d' : '#b91c1c',
                                border: `1px solid ${remainingDays > 0 ? '#bbf7d0' : '#fca5a5'}`
                              }}>
                                {remainingDays > 0 ? `✅ ${remainingDays} দিন বাকি` : '⚠️ মেয়াদ শেষ'}
                              </span>
                            )}
                          </div>

                          {/* Metadata Chips */}
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              👤 <strong>{t.ownerName}</strong>
                            </span>
                            <span style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} className="num-font">
                              📱 <strong style={{ color: '#0f172a' }}>{t.phone}</strong>
                            </span>
                            <span style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              📍 {t.location || 'স্থানীয় বাজার'}
                            </span>
                            <span style={{ background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              🏷️ {t.industryName || 'ব্যবসা'}
                            </span>
                            <span style={{ background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fde68a', fontWeight: '800' }}>
                              🔑 পিন: <strong>{t.pin || '1234'}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Plan & Validity Info + Primary Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          padding: '8px 14px',
                          borderRadius: '14px',
                          textAlign: 'right'
                        }}>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>প্ল্যান ও মেয়াদ</div>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: isTrial ? '#7e22ce' : '#4f46e5' }}>
                            {t.planName || t.planId || 'প্রো শপ'} ({isTrial ? 'ফ্রি ট্রায়াল' : t.billingCycle === 'yearly' ? '১ বছর' : 'মাসিক'})
                          </div>
                          <div style={{ fontSize: '11px', color: isPending ? '#b45309' : (isExpired ? '#dc2626' : '#059669'), fontWeight: '800' }}>
                            {isPending
                              ? 'অনুমোদনের পর সক্রিয় হবে'
                              : `মেয়াদ: ${t.paidTill || '২০২৭-১২-৩১'} পর্যন্ত`}
                          </div>
                        </div>

                        {/* Approval or Launch Button */}
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleApproveShop(t.id, 'trial')}
                              style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                fontWeight: '900',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)'
                              }}
                            >
                              <span>🎁 ৭ দিন ফ্রি ট্রায়াল অনুমোদন</span>
                            </button>
                            <button
                              onClick={() => handleApproveShop(t.id, 'paid')}
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 16px',
                                borderRadius: '12px',
                                fontWeight: '900',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                              }}
                            >
                              <span>✅ সরাসরি পেইড অনুমোদন</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleImpersonateShop(t)}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              padding: '11px 20px',
                              borderRadius: '14px',
                              fontWeight: '900',
                              fontSize: '13.5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                              transition: 'transform 0.15s ease'
                            }}
                          >
                            <span>🚀 দোকানে প্রবেশ করুন</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subscription, Extension & SMS Control Bar */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '16px',
                      padding: '12px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      {/* Plan Switcher */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#475569' }}>প্ল্যান পরিবর্তন:</span>
                        <select
                          value={t.planId || 'plan-pro'}
                          onChange={(e) => handleChangeShopPlan(t.id, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '12.5px',
                            fontWeight: '800',
                            background: '#ffffff',
                            color: '#0f172a',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="plan-basic">বেসিক দোকান (৳৯৯/মা)</option>
                          <option value="plan-pro">প্রো শপ (৳১৪৯/মা)</option>
                          <option value="plan-enterprise">মাল্টি-ব্রাঞ্চ Enterprise (৳২৯৯/মা)</option>
                        </select>
                      </div>

                      {/* Extend Validity Quick Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#475569' }}>মেয়াদ বৃদ্ধি:</span>
                        <button
                          onClick={() => handleExtendTrial(t.id, 7)}
                          style={{ padding: '6px 12px', borderRadius: '10px', background: '#f3e8ff', border: '1px solid #d8b4fe', color: '#7e22ce', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}
                        >
                          🎁 +৭ দিন ট্রায়াল
                        </button>
                        <button
                          onClick={() => handleExtendValidity(t.id, 1)}
                          style={{ padding: '6px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          +১ মাস
                        </button>
                        <button
                          onClick={() => handleExtendValidity(t.id, 6)}
                          style={{ padding: '6px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          +৬ মাস
                        </button>
                        <button
                          onClick={() => handleExtendValidity(t.id, 12)}
                          style={{ padding: '6px 12px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #86efac', color: '#065f46', fontSize: '12px', fontWeight: '900', cursor: 'pointer' }}
                        >
                          +১ বছর 🔥
                        </button>
                      </div>

                      {/* SMS Balance & Recharge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#475569' }}>
                          📩 SMS: <strong>{t.smsBalance || 0}</strong>
                        </span>
                        <button
                          onClick={() => setSmsRechargeShop(t)}
                          style={{ padding: '6px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                        >
                          + রিচার্জ
                        </button>
                      </div>
                    </div>

                    {/* Bottom Action Toolbar - Highlighted & Categorized */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      paddingTop: '6px',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      {/* 1. EDIT BUTTON - PROMINENT & HIGH-CONTRAST */}
                      <button
                        onClick={() => setEditModalShop(t)}
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '11px',
                          fontWeight: '900',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 10px rgba(79, 70, 229, 0.28)'
                        }}
                      >
                        <span>✏️</span>
                        <span>দোকান এডিট</span>
                      </button>

                      {/* 2. RESET PIN */}
                      <button
                        onClick={() => { setResetPinShop(t); setNewPinInput(''); }}
                        style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1.5px solid #fde68a',
                          padding: '8px 14px',
                          borderRadius: '11px',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🔑</span>
                        <span>পিন রিসেট</span>
                      </button>

                      {/* 3. FEATURE PERMISSIONS */}
                      <button
                        onClick={() => openFeatureModal(t)}
                        style={{
                          background: '#f5f3ff',
                          color: '#6d28d9',
                          border: '1.5px solid #ddd6fe',
                          padding: '8px 14px',
                          borderRadius: '11px',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>⚙️</span>
                        <span>ফিচার পারমিশন</span>
                      </button>

                      {/* 4. DETAILS / AUDIT */}
                      <button
                        onClick={() => handleOpenInspect(t)}
                        style={{
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1.5px solid #bae6fd',
                          padding: '8px 14px',
                          borderRadius: '11px',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🔍</span>
                        <span>বিস্তারিত অডিট</span>
                      </button>

                      {/* 5. SUSPEND / ACTIVATE */}
                      <button
                        onClick={() => toggleShopStatus(t.id, t.status)}
                        style={{
                          background: t.status === 'active' ? '#fff1f2' : '#f0fdf4',
                          color: t.status === 'active' ? '#e11d48' : '#16a34a',
                          border: `1.5px solid ${t.status === 'active' ? '#fecdd3' : '#bbf7d0'}`,
                          padding: '8px 14px',
                          borderRadius: '11px',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{t.status === 'active' ? '⏸' : '▶'}</span>
                        <span>{t.status === 'active' ? 'স্থগিত করুন' : 'সক্রিয় করুন'}</span>
                      </button>

                      {/* 6. DELETE BUTTON */}
                      <button
                        onClick={() => handleDeleteShop(t)}
                        style={{
                          background: '#ffffff',
                          color: '#dc2626',
                          border: '1.5px solid #fecaca',
                          padding: '8px 14px',
                          borderRadius: '11px',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>🗑️</span>
                        <span>ডিলিট</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COUPONS MANAGEMENT */}
      {activeTab === 'coupons' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                🎟️ প্রোমো কুপন ও ডিসকাউন্ট ভাউচার
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                দোকানদারদের সাবস্ক্রিপশনে বিশেষ ছাড়ের কুপন কোড তৈরি ও পরিচালনা করুন।
              </p>
            </div>
            <button
              onClick={() => setShowCouponModal(true)}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              ➕ নতুন কুপন তৈরি করুন
            </button>
          </div>

          <div className="ui-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800' }}>কুপন কোড</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800' }}>ডিসকাউন্ট</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800' }}>সর্বনিম্ন বিল</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800' }}>ব্যবহার সংখ্যা</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800' }}>মেয়াদ</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800', textAlign: 'right' }}>একশন</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c: any) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '900', color: '#4f46e5' }}>
                      <span style={{ background: '#eef2ff', padding: '4px 10px', borderRadius: '6px', border: '1px dashed #c7d2fe' }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: '#059669' }}>
                      {c.discount_type === 'percentage' ? `${c.discount_value}% ছাড়` : `৳${c.discount_value} ফ্ল্যাট`}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      ৳{c.min_order_amount || 0}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      <strong>{c.used_count || 0}</strong> / {c.max_uses || 1000} বার
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.expiry_date || '২০২৮-১২-৩১'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        মুছুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="ui-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700' }}>মোট সংগৃহীত পেমেন্ট</div>
              <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#059669', margin: '6px 0' }}>
                ৳{overview.totalCollected?.toLocaleString('en-US')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>ক্যাশ ও ডিজিটাল পেমেন্ট</div>
            </div>

            <div className="ui-card" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700' }}>মার্কেট বাকি পাওনা</div>
              <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626', margin: '6px 0' }}>
                ৳{overview.totalMarketDue?.toLocaleString('en-US')}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>দোকানদারদের মোট বকেয়া</div>
            </div>

            <div className="ui-card" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700' }}>ডাটাবেজে মোট পণ্য সংখ্যা</div>
              <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#2563eb', margin: '6px 0' }}>
                {overview.totalProductsCount?.toLocaleString('en-US')} টি
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>সকল দোকান মিলিয়ে</div>
            </div>

            <div className="ui-card" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700' }}>মোট কাস্টমার সংখ্যা</div>
              <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#7c3aed', margin: '6px 0' }}>
                {overview.totalCustomersCount?.toLocaleString('en-US')} জন
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>লেজার ও খাতা রেজিস্টার্ড</div>
            </div>
          </div>

          {/* Plan Distribution Breakdown */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📦 সাবস্ক্রিপশন টিয়ার ও MRR ডিস্ট্রিবিউশন</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {(detailedAnalytics.planBreakdown || []).map((pb: any) => (
                <div key={pb.planId} style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '15px', color: '#1e293b' }}>{pb.banglaName || pb.name}</strong>
                    <span style={{ fontSize: '12px', fontWeight: '800', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '99px' }}>
                      ৳{pb.monthlyPrice}/মাস
                    </span>
                  </div>
                  <div className="num-font" style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
                    {pb.count} টি দোকান ({pb.percentage}%)
                  </div>
                  <div style={{ fontSize: '13px', color: '#059669', fontWeight: '800', marginTop: '6px' }}>
                    মাসিক আয় (MRR): ৳{pb.mrr?.toLocaleString('en-US')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Shops Table */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏆 সেরা পারফর্মিং দোকানসমূহ (রিয়েল-টাইম সেলস র্যাংকিং)</span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>দোকানের নাম</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>মালিক ও যোগাযোগ</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>মোট বিক্রি (Sales)</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>ক্যাশ আদায়</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>বাকি পাওনা</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>পণ্য / কাস্টমার</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailedAnalytics.shopRankings || []).map((sr: any, idx: number) => (
                    <tr key={sr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: '#0f172a' }}>
                        <span style={{ color: idx === 0 ? '#f59e0b' : '#64748b', marginRight: '6px' }}>#{idx + 1}</span>
                        {sr.shop_name}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {sr.owner_name} ({sr.phone})
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: '#7c3aed' }}>
                        ৳{Number(sr.totalSales || 0).toLocaleString('en-US')}
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{sr.orderCount || 0} টি মেমো</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#059669' }}>
                        ৳{Number(sr.totalCollected || 0).toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#dc2626' }}>
                        ৳{Number(sr.totalDue || 0).toLocaleString('en-US')}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}>
                        📦 {sr.productCount || 0} টি • 👥 {sr.customerCount || 0} জন
                      </td>
                    </tr>
                  ))}
                  {(detailedAnalytics.shopRankings || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        এখনো কোনো বিক্রয় রেকর্ড তৈরি হয়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Subscription Transactions Feed */}
          <div className="ui-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💳 রিসেন্ট সাবস্ক্রিপশন পেমেন্ট ট্রানজেকশন</span>
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>তারিখ ও সময়</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>দোকানের নাম</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>প্ল্যান ও সাইকেল</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>পেমেন্ট মেথড</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800' }}>TrxID / নম্বর</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: '800', textAlign: 'right' }}>পরিমাণ</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailedAnalytics.recentTransactions || []).map((st: any) => (
                    <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px' }}>
                        {st.created_at?.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                        {st.shop_name || 'দোকান'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#4f46e5', fontWeight: '800' }}>
                        {st.plan_bangla_name || st.plan_id} ({st.billing_cycle === 'yearly' ? 'বাৎসরিক' : 'মাসিক'})
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          background: st.payment_method === 'bkash' ? '#fdf2f8' : '#fff7ed',
                          color: st.payment_method === 'bkash' ? '#db2777' : '#ea580c',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '12px'
                        }}>
                          {st.payment_method?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#334155' }}>
                        <code>{st.trx_id}</code> ({st.phone_number})
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: '#059669', textAlign: 'right' }}>
                        ৳{st.amount}
                      </td>
                    </tr>
                  ))}
                  {(detailedAnalytics.recentTransactions || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM SETTINGS & AUDIT LOGS */}
      {activeTab === 'settings' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          
          {/* Sub-navigation categories */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '6px',
            borderBottom: '1.5px solid #e2e8f0'
          }}>
            {[
              { id: 'general', label: '🏢 সাধারণ ও ব্রান্ডিং', desc: 'প্ল্যাটফর্মের নাম, লোগো ও যোগাযোগ' },
              { id: 'payment', label: '💳 পেমেন্ট ও মার্চেন্ট', desc: 'বিকাশ, নগদ ও পেমেন্ট রুলস' },
              { id: 'sms', label: '📩 এসএমএস গেটওয়ে', desc: 'এসএমএস এপিআই ও অ্যালার্ট মেসেজ' },
              { id: 'billing', label: '💎 প্ল্যান ও বিলিং', desc: 'প্ল্যান প্রাইসিং ও ফ্রি ট্রায়াল' },
              { id: 'features', label: '⚡ গ্লোবাল ফিচার ফ্ল্যাগস', desc: 'ভয়েস সহকারী, চালান স্ক্যানার ও নোটিশ' },
              { id: 'backup', label: '💾 ব্যাকআপ ও ডায়াগনস্টিক', desc: 'ক্লাউড ব্যাকআপ ও ক্যাশ ক্লিয়ার' },
              { id: 'audit', label: '📜 সিস্টেম অডিট লগ', desc: 'অ্যাডমিন অ্যাক্টিভিটি হিস্ট্রি' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSettingsSubTab(tab.id as any);
                  triggerHaptic('light');
                }}
                style={{
                  background: settingsSubTab === tab.id ? '#0f172a' : '#ffffff',
                  color: settingsSubTab === tab.id ? '#ffffff' : '#475569',
                  border: settingsSubTab === tab.id ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: settingsSubTab === tab.id ? '0 4px 12px rgba(15, 23, 42, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SUB-TAB 1: GENERAL & BRANDING */}
          {settingsSubTab === 'general' && (
            <div className="ui-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                  🏢 সাধারণ ও প্ল্যাটফর্ম ব্রান্ডিং সেটিংস
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  সফটওয়্যারের অফিসিয়াল নাম, হেল্পলাইন নম্বর, সাপোর্ট ইমেইল ও প্রধান ঠিকানা নিয়ন্ত্রণ করুন
                </p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    সফটওয়্যার / প্ল্যাটফর্মের নাম *
                  </label>
                  <input
                    type="text"
                    value={platformSettings.platformName || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    ট্যাগলাইন / মূল স্লোগান
                  </label>
                  <input
                    type="text"
                    value={platformSettings.tagline || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, tagline: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    অফিসিয়াল সাপোর্ট হেল্পলাইন ফোন *
                  </label>
                  <input
                    type="text"
                    value={platformSettings.supportPhone || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, supportPhone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    সাপোর্ট হোয়াটসঅ্যাপ নম্বর *
                  </label>
                  <input
                    type="text"
                    value={platformSettings.supportWhatsApp || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, supportWhatsApp: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    সাপোর্ট ইমেইল এড্রেস
                  </label>
                  <input
                    type="email"
                    value={platformSettings.supportEmail || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    প্রধান কার্যালয়ের ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={platformSettings.hqAddress || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, hqAddress: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    কারেন্সি সিম্বল
                  </label>
                  <input
                    type="text"
                    value={platformSettings.currencySymbol || '৳'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, currencySymbol: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    টাইমজোন
                  </label>
                  <input
                    type="text"
                    value={platformSettings.timezone || 'Asia/Dhaka'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, timezone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                    }}
                  >
                    {savingSettings ? 'সংরক্ষণ হচ্ছে...' : '✓ সাধারণ সেটিংস সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-TAB 2: PAYMENT & MERCHANTS */}
          {settingsSubTab === 'payment' && (
            <div className="ui-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                  💳 পেমেন্ট গেটওয়ে ও মার্চেন্ট অ্যাকাউন্ট সেটিংস
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  দোকানদারদের সাবস্ক্রিপশন ফি গ্রহণের জন্য বিকাশ, নগদ ও রকেট পেমেন্ট কনফিগারেশন
                </p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#db2777', marginBottom: '6px' }}>
                    অফিসিয়াল বিকাশ নম্বর *
                  </label>
                  <input
                    type="text"
                    value={platformSettings.bkashMerchant || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, bkashMerchant: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #fbcfe8', fontSize: '15px', fontWeight: '800' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#db2777', marginBottom: '6px' }}>
                    বিকাশ অ্যাকাউন্টের ধরন
                  </label>
                  <select
                    value={platformSettings.bkashAccountType || 'merchant'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, bkashAccountType: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  >
                    <option value="merchant">মার্চেন্ট অ্যাকাউন্ট (Payment)</option>
                    <option value="personal">পার্সোনাল নম্বর (Send Money)</option>
                    <option value="agent">এজেন্ট নম্বর (Cash In)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#ea580c', marginBottom: '6px' }}>
                    অফিসিয়াল নগদ নম্বর *
                  </label>
                  <input
                    type="text"
                    value={platformSettings.nagadMerchant || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, nagadMerchant: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #ffedd5', fontSize: '15px', fontWeight: '800' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#ea580c', marginBottom: '6px' }}>
                    নগদ অ্যাকাউন্টের ধরন
                  </label>
                  <select
                    value={platformSettings.nagadAccountType || 'merchant'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, nagadAccountType: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  >
                    <option value="merchant">মার্চেন্ট অ্যাকাউন্ট (Payment)</option>
                    <option value="personal">পার্সোনাল নম্বর (Send Money)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#4f46e5', marginBottom: '6px' }}>
                    রকেট / উপায় নম্বর
                  </label>
                  <input
                    type="text"
                    value={platformSettings.rocketNumber || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, rocketNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#059669', marginBottom: '6px' }}>
                    অটো প্ল্যান অ্যাক্টিভেশন পলিসি
                  </label>
                  <select
                    value={platformSettings.autoActivateSubscriptions || 'true'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, autoActivateSubscriptions: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  >
                    <option value="true">ইনস্ট্যান্ট অটো অ্যাক্টিভেশন (সুপার ফাস্ট)</option>
                    <option value="false">ম্যানুয়াল অ্যাডমিন রিভিউ ও অ্যাপ্রুভাল</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    চেকআউট পেজে পেমেন্ট নির্দেশিকা টেক্সট
                  </label>
                  <textarea
                    rows={2}
                    value={platformSettings.paymentInstructions || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, paymentInstructions: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    {savingSettings ? 'সংরক্ষণ হচ্ছে...' : '✓ পেমেন্ট সেটিংস সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-TAB 3: SMS & NOTIFICATION GATEWAY */}
          {settingsSubTab === 'sms' && (
            <div className="ui-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                  📩 এসএমএস ও নোটিফিকেশন গেটওয়ে
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  কাস্টমার বকেয়া তাগাদা ও দোকান রেজিস্ট্রেশনের অটো এসএমএস গেটওয়ে প্রোভাইডার সেটিংস
                </p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    এসএমএস গেটওয়ে প্রোভাইডার
                  </label>
                  <select
                    value={platformSettings.smsGatewayProvider || 'BulkSMSBD'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, smsGatewayProvider: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  >
                    <option value="BulkSMSBD">BulkSMSBD (বাংলাদেশ)</option>
                    <option value="Greenweb">Greenweb SMS Gateway</option>
                    <option value="AlphaNet">Alpha Net SMS BD</option>
                    <option value="Elitbuzz">Elitbuzz Technologies</option>
                    <option value="Teletalk">Teletalk Govt Masking</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    এসএমএস এপিআই কি (API Secret Key)
                  </label>
                  <input
                    type="password"
                    value={platformSettings.smsApiKey || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, smsApiKey: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    এসএমএস সেন্ডার আইডি / মাস্কিং নাম
                  </label>
                  <input
                    type="text"
                    value={platformSettings.smsSenderId || 'SHOHOJ'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, smsSenderId: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    প্রতি এসএমএস প্ল্যাটফর্ম কস্ট (টাকায়)
                  </label>
                  <input
                    type="text"
                    value={platformSettings.costPerSms || '0.35'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, costPerSms: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    নতুন দোকান রেজিস্ট্রেশনের ওয়েলকাম এসএমএস মেসেজ টেমপ্লেট
                  </label>
                  <textarea
                    rows={2}
                    value={platformSettings.welcomeSmsTemplate || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, welcomeSmsTemplate: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    ডিফল্ট বকেয়া তাগাদা এসএমএস টেমপ্লেট
                  </label>
                  <textarea
                    rows={2}
                    value={platformSettings.dueSmsTemplate || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, dueSmsTemplate: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    {savingSettings ? 'সংরক্ষণ হচ্ছে...' : '✓ এসএমএস সেটিংস সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-TAB 4: BILLING & PRICING POLICY */}
          {settingsSubTab === 'billing' && (
            <div className="ui-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                  💎 প্ল্যান মূল্য ও সাবস্ক্রিপশন পলিসি
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  মাসিক সাবস্ক্রিপশন রেট, ফ্রি ট্রায়াল দিন সংখ্যা ও গ্রেস পিরিয়ড পলিসি কনফিগার করুন
                </p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    বেসিক প্ল্যান মাসিক ফি (টাকা)
                  </label>
                  <input
                    type="number"
                    value={platformSettings.basicPlanMonthly || '99'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, basicPlanMonthly: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '15px', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#059669', marginBottom: '6px' }}>
                    প্রো প্ল্যান মাসিক ফি (টাকা)
                  </label>
                  <input
                    type="number"
                    value={platformSettings.proPlanMonthly || '149'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, proPlanMonthly: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #86efac', fontSize: '15px', fontWeight: '900' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#4f46e5', marginBottom: '6px' }}>
                    এন্টারপ্রাইজ / মাল্টি-ব্রাঞ্চ মাসিক ফি (টাকা)
                  </label>
                  <input
                    type="number"
                    value={platformSettings.enterprisePlanMonthly || '299'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, enterprisePlanMonthly: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '15px', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    নতুন দোকানের ফ্রি ট্রায়াল দিন সংখ্যা
                  </label>
                  <input
                    type="number"
                    value={platformSettings.freeTrialDays || '14'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, freeTrialDays: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#b45309', marginBottom: '6px' }}>
                    মেয়াদ শেষের পর গ্রেস পিরিয়ড (গ্রেস দিন)
                  </label>
                  <input
                    type="number"
                    value={platformSettings.gracePeriodDays || '7'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, gracePeriodDays: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    বাৎসরিক সাবস্ক্রিপশনে ছাড়ের শতাংশ (%)
                  </label>
                  <input
                    type="number"
                    value={platformSettings.yearlyDiscountPercent || '20'}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, yearlyDiscountPercent: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      background: '#7c3aed',
                      color: '#ffffff',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)'
                    }}
                  >
                    {savingSettings ? 'সংরক্ষণ হচ্ছে...' : '✓ প্ল্যান ও বিলিং পলিসি সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-TAB 5: FEATURE FLAGS & NOTICE */}
          {settingsSubTab === 'features' && (
            <div className="ui-card" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                  ⚡ গ্লোবাল ফিচার ফ্ল্যাগস ও সিস্টেম নোটিশ
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  প্ল্যাটফর্ম জুড়ে বিশেষ ফিচারসমূহ এবং সার্বজনীন নোটিশ ব্যানার সক্রিয় বা নিষ্ক্রিয় করুন
                </p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {[
                    { key: 'globalVoicePOS', label: '🎙️ ভয়েস ও ক্যালকুলেটর' },
                    { key: 'globalOcrScanner', label: '📸 চালান ফটো স্ক্যানার (OCR)' },
                    { key: 'globalThermalPrint', label: '🖨️ থার্মাল রিসিপ্ট প্রিন্টিং ইঞ্জিন (ESC/POS)' },
                    { key: 'globalMultiBranch', label: '🏢 মাল্টি-ব্রাঞ্চ ও ওয়্যারহাউস স্থানান্তর' },
                    { key: 'showAnnouncementBanner', label: '📢 ড্যাশবোর্ড সার্বজনীন নোটিশ ব্যানার' },
                    { key: 'maintenanceMode', label: '🛑 মেইনটেন্যান্স মোড (Maintenance Mode)' }
                  ].map(f => (
                    <label
                      key={f.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: '#f8fafc',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={platformSettings[f.key] === 'true' || platformSettings[f.key] === true}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, [f.key]: String(e.target.checked) })}
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e293b' }}>
                        {f.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    সার্বজনীন নোটিশ বার্তা (দোকানদারদের ড্যাশবোর্ডে প্রদর্শিত হবে)
                  </label>
                  <input
                    type="text"
                    value={platformSettings.globalAnnouncementBanner || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, globalAnnouncementBanner: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#dc2626', marginBottom: '6px' }}>
                    মেইনটেন্যান্স মোড বার্তা
                  </label>
                  <input
                    type="text"
                    value={platformSettings.maintenanceNotice || ''}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceNotice: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #fecaca', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)'
                    }}
                  >
                    {savingSettings ? 'সংরক্ষণ হচ্ছে...' : '✓ ফিচার ফ্ল্যাগস সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUB-TAB 6: CLOUD BACKUP & SYSTEM DIAGNOSTICS */}
          {settingsSubTab === 'backup' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="ui-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                  💾 সম্পূর্ণ ডাটাবেজ ব্যাকআপ ও রিকভারি
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px' }}>
                  দোকান, পণ্য, কাস্টমার, সেলস ও সেটিংস সহ সম্পূর্ণ সিস্টেমের পূর্ণ ডাটাবেজ ১-ক্লিকে অফলাইনে ডাউনলোড করুন
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={handleDownloadBackup}
                    disabled={isDownloadingBackup}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: '#ffffff',
                      padding: '14px 26px',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '900',
                      fontSize: '14px',
                      cursor: isDownloadingBackup ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    <span>{isDownloadingBackup ? '⏳' : '📥'}</span>
                    <span>{isDownloadingBackup ? 'ব্যাকআপ প্রস্তুত হচ্ছে...' : 'সম্পূর্ণ ডাটাবেজ JSON ব্যাকআপ ডাউনলোড করুন'}</span>
                  </button>

                  <button
                    onClick={handleClearSystemCache}
                    disabled={isClearingCache}
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      padding: '14px 22px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: isClearingCache ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>🧹</span>
                    <span>{isClearingCache ? 'পরিষ্কার হচ্ছে...' : 'সিস্টেম ক্যাশ ক্লিয়ার করুন'}</span>
                  </button>
                </div>
              </div>

              {diagResult && (
                <div className="ui-card" style={{ padding: '20px', background: '#ecfdf5', border: '1.5px solid #a7f3d0' }}>
                  <strong style={{ fontSize: '14px', color: '#065f46', display: 'block', marginBottom: '8px' }}>
                    ✓ ডায়াগনস্টিক রিপোর্ট ও সিস্টেম স্ট্যাটাস:
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '13px' }}>
                    <div>স্ট্যাটাস: <strong style={{ color: '#059669' }}>সুস্থ (Healthy)</strong></div>
                    <div>সার্ভার আপটাইম: <strong>{diagResult.uptime}</strong></div>
                    <div>মেমরি ব্যবহার (RSS): <strong>{Math.round((diagResult.memoryUsage?.rss || 0) / 1024 / 1024)} MB</strong></div>
                    <div>হিপ মেমরি (Heap): <strong>{Math.round((diagResult.memoryUsage?.heapUsed || 0) / 1024 / 1024)} MB</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 7: LIVE AUDIT LOGS */}
          {settingsSubTab === 'audit' && (
            <div className="ui-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                    📜 রিয়েল-টাইম সিস্টেম অডিট লগ ({auditLogs.length}টি)
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    অ্যাডমিন প্যানেল ও দোকানে ঘটা সমস্ত স্পর্শকাতর কাজের পূর্ণ বিবরণ
                  </p>
                </div>
                <button
                  onClick={loadAdminData}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  🔄 রিফ্রেশ
                </button>
              </div>

              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', margin: 0 }}>
                    কোনো অডিট লগ পাওয়া যায়নি
                  </p>
                ) : (
                  auditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <span style={{
                          background: '#e0e7ff',
                          color: '#4338ca',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '11px',
                          marginRight: '8px'
                        }}>
                          {log.action}
                        </span>
                        <strong style={{ color: '#0f172a' }}>{log.user_name || 'System'}:</strong> {log.details}
                      </div>
                      <span className="num-font" style={{ color: '#94a3b8', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {log.created_at?.slice(0, 19).replace('T', ' ')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL: SMS Recharge */}
      {smsRechargeShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '400px', width: '100%', padding: '26px', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>📩 SMS ব্যালেন্স রিচার্জ</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              <strong>{smsRechargeShop.shopName}</strong> এ এসএমএস ব্যালেন্স যোগ করুন
            </p>
            <form onSubmit={handleSmsRecharge} style={{ display: 'grid', gap: '14px' }}>
              {/* Quick Select Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['50', '100', '200', '500', '1000'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSmsCountInput(val)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: smsCountInput === val ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      background: smsCountInput === val ? '#eff6ff' : '#f8fafc',
                      color: smsCountInput === val ? '#1d4ed8' : '#475569',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    +{val} SMS
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={smsCountInput}
                onChange={(e) => setSmsCountInput(e.target.value)}
                placeholder="এসএমএস সংখ্যা (যেমন: ১০০)"
                style={{ padding: '11px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                required
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', border: 'none', padding: '11px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                  রিচার্জ নিশ্চিত করুন
                </button>
                <button type="button" onClick={() => setSmsRechargeShop(null)} style={{ padding: '11px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Coupon */}
      {showCouponModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '440px', width: '100%', padding: '26px', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>🎟️ নতুন প্রোমো কুপন তৈরি</h3>
            <form onSubmit={handleCreateCoupon} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>কুপন কোড</label>
                <input
                  type="text"
                  placeholder="যেমন: EID2026, SUMMER20"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', textTransform: 'uppercase', fontSize: '14px', fontWeight: '800' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>ডিসকাউন্ট ধরন</label>
                  <select
                    value={couponDiscountType}
                    onChange={(e) => setCouponDiscountType(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700' }}
                  >
                    <option value="percentage">শতাংশ (%)</option>
                    <option value="fixed">টাকা (৳)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>ডিসকাউন্ট পরিমাণ</label>
                  <input
                    type="number"
                    value={couponDiscountValue}
                    onChange={(e) => setCouponDiscountValue(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>সর্বোচ্চ ব্যবহার</label>
                  <input
                    type="number"
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মেয়াদ শেষ</label>
                  <input
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#fff', border: 'none', padding: '11px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
                  কুপন সেভ করুন
                </button>
                <button type="button" onClick={() => setShowCouponModal(false)} style={{ padding: '11px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Feature Toggles */}
      {featureModalShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '520px', width: '100%', padding: '26px', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              ⚙️ বিশেষ ফিচার পারমিশন: {featureModalShop.shopName}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              এই দোকানের জন্য প্রয়োজনীয় বিশেষ ফিচারগুলো সক্রিয় অথবা নিষ্ক্রিয় করুন
            </p>

            <form onSubmit={handleSaveShopFeatures} style={{ display: 'grid', gap: '10px' }}>
              {[
                { key: 'enableMultiBranch', label: 'মাল্টি-ব্রাঞ্চ (Multi-Branch Support)' },
                { key: 'enableChallanOcr', label: 'চালান ক্যামেরা স্ক্যানার (OCR Memo Reader)' },
                { key: 'enableInstallments', label: 'বাকির কিস্তি সুবিধা' },
                { key: 'enableExpiryTracker', label: 'মেয়াদ রাডার (Expiry Date Tracker)' },
                { key: 'enableBarcodePrinter', label: 'বারকোড ও স্টিকার প্রিন্টার' },
                { key: 'enableDealerKhata', label: 'ডিলার ও মহাজন খাতা' },
                { key: 'enableWholesale', label: 'পাইকারি রেট ও হোলসেল সেল' },
                { key: 'enableSMS', label: 'অটো এসএমএস রিমাইন্ডার' },
                { key: 'enableSoundbox', label: 'ডিজিটাল সাউন্ডবক্স ভয়েস' }
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: '700', padding: '6px 0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(shopFeatures[f.key])}
                    onChange={(e) => setShopFeatures({ ...shopFeatures, [f.key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                  />
                  <span>{f.label}</span>
                </label>
              ))}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#fff', border: 'none', padding: '11px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)' }}>
                  সংরক্ষণ করুন
                </button>
                <button type="button" onClick={() => setFeatureModalShop(null)} style={{ padding: '11px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reset PIN */}
      {resetPinShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '400px', width: '100%', padding: '26px', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>🔑 পিন রিসেট করুন</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              <strong>{resetPinShop.shopName}</strong> এর নতুন ৪-ডিজিটের গোপন পিন দিন
            </p>
            <form onSubmit={handleResetPin} style={{ display: 'grid', gap: '14px' }}>
              <input
                type="text"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="নতুন পিন (যেমন: 5678)"
                maxLength={6}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #cbd5e1', textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: '900' }}
                required
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', border: 'none', padding: '11px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)' }}>
                  পিন পরিবর্তন নিশ্চিত করুন
                </button>
                <button type="button" onClick={() => setResetPinShop(null)} style={{ padding: '11px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Shop Details */}
      {editModalShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '540px', width: '100%', padding: '26px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>✏️</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  দোকানের তথ্য সম্পাদনা
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalShop(null)}
                style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', color: '#64748b', display: 'grid', placeItems: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditShop} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>দোকানের নাম</label>
                <input
                  type="text"
                  value={editModalShop.shopName || ''}
                  onChange={(e) => setEditModalShop({ ...editModalShop, shopName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মালিকের নাম</label>
                <input
                  type="text"
                  value={editModalShop.ownerName || ''}
                  onChange={(e) => setEditModalShop({ ...editModalShop, ownerName: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={editModalShop.phone || ''}
                    onChange={(e) => setEditModalShop({ ...editModalShop, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>৪-ডিজিট পিন</label>
                  <input
                    type="text"
                    value={editModalShop.pin || ''}
                    onChange={(e) => setEditModalShop({ ...editModalShop, pin: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', textAlign: 'center', fontSize: '16px', fontWeight: '900', letterSpacing: '2px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>বাজার / লোকেশন</label>
                  <input
                    type="text"
                    value={editModalShop.location || ''}
                    onChange={(e) => setEditModalShop({ ...editModalShop, location: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>ব্যবসার ধরন</label>
                  <select
                    value={editModalShop.industryId || editModalShop.industryCategoryId || 'cat-grocery'}
                    onChange={(e) => setEditModalShop({ ...editModalShop, industryId: e.target.value, industryCategoryId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '13.5px' }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '📦'} {c.banglaName || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>প্ল্যান</label>
                  <select
                    value={editModalShop.planId || 'plan-pro'}
                    onChange={(e) => setEditModalShop({ ...editModalShop, planId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '13px' }}
                  >
                    <option value="plan-basic">বেসিক দোকান (৳৯৯)</option>
                    <option value="plan-pro">প্রো শপ (৳১৪৯)</option>
                    <option value="plan-enterprise">মাল্টি-ব্রাঞ্চ Enterprise (৳২৯৯)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>প্যাকেজ / সাইকেল</label>
                  <select
                    value={editModalShop.billingCycle || 'monthly'}
                    onChange={(e) => setEditModalShop({ ...editModalShop, billingCycle: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '13px' }}
                  >
                    <option value="trial">🎁 ৭ দিনের ফ্রি ট্রায়াল</option>
                    <option value="monthly">🌟 মাসিক প্যাকেজ</option>
                    <option value="yearly">🚀 বাৎসরিক প্যাকেজ</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মেয়াদ শেষ (Paid Till)</label>
                  <input
                    type="date"
                    value={editModalShop.paidTill || ''}
                    onChange={(e) => setEditModalShop({ ...editModalShop, paidTill: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মাসিক ফি (৳)</label>
                  <input
                    type="number"
                    value={editModalShop.monthlyFee ?? 149}
                    onChange={(e) => setEditModalShop({ ...editModalShop, monthlyFee: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>স্ট্যাটাস</label>
                  <select
                    value={editModalShop.status || 'active'}
                    onChange={(e) => setEditModalShop({ ...editModalShop, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '13.5px' }}
                  >
                    <option value="active">✅ সক্রিয় (Active)</option>
                    <option value="trial">🎁 ফ্রি ট্রায়াল (Trial)</option>
                    <option value="pending_approval">⏳ অনুমোদনের অপেক্ষায় (Pending)</option>
                    <option value="suspended">⏸ স্থগিত (Suspended)</option>
                    <option value="expired">⚠️ মেয়াদোত্তীর্ণ (Expired)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>SMS ব্যালেন্স</label>
                  <input
                    type="number"
                    value={editModalShop.smsBalance ?? 50}
                    onChange={(e) => setEditModalShop({ ...editModalShop, smsBalance: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  ✓ তথ্য সংরক্ষণ করুন
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalShop(null)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    background: '#fff',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create New Shop */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '480px', width: '100%', padding: '26px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>➕ নতুন দোকান তৈরি ও সক্রিয়করণ</h3>
            <form onSubmit={handleCreateShop} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>দোকানের নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: ভাই ভাই স্টোর"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মালিকের নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>৪-ডিজিট পিন</label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', textAlign: 'center', fontSize: '16px', fontWeight: '900', letterSpacing: '2px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>ব্যবসার ধরন</label>
                  <select
                    value={industryCategoryId}
                    onChange={(e) => setIndustryCategoryId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '13.5px' }}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon || '📦'} {c.banglaName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '4px' }}>প্ল্যান ও সাবস্ক্রিপশন</label>
                  <select
                    value={selectedBillingOption}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setSelectedBillingOption(val);
                      if (val === 'trial') {
                        setSelectedPlanId('plan-pro');
                        setMonthlyFee('0');
                      } else if (val === 'monthly_pro') {
                        setSelectedPlanId('plan-pro');
                        setMonthlyFee('149');
                      } else if (val === 'yearly_pro') {
                        setSelectedPlanId('plan-pro');
                        setMonthlyFee('1499');
                      } else if (val === 'basic') {
                        setSelectedPlanId('plan-basic');
                        setMonthlyFee('99');
                      } else if (val === 'enterprise') {
                        setSelectedPlanId('plan-enterprise');
                        setMonthlyFee('299');
                      }
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: '700', fontSize: '13px' }}
                  >
                    <option value="trial">🎁 ৭ দিনের ফ্রি ট্রায়াল (৳০ • ৭ দিন ফ্রি)</option>
                    <option value="monthly_pro">🌟 প্রো শপ - মাসিক (৳১৪৯ • ৩০ দিন)</option>
                    <option value="yearly_pro">🚀 প্রো শপ - বাৎসরিক (৳১৪৯৯ • ৩৬৫ দিন)</option>
                    <option value="basic">📦 বেসিক দোকান - মাসিক (৳৯৯ • ৩০ দিন)</option>
                    <option value="enterprise">🏢 মাল্টি-ব্রাঞ্চ - মাসিক (৳২৯৯ • ৩০ দিন)</option>
                  </select>
                </div>
              </div>

              {selectedBillingOption === 'trial' && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎁</span>
                  <span>দোকানটি তৈরি হলে <strong>৭ দিন সম্পূর্ণ ফ্রিতে</strong> সব প্রো ফিচার ব্যবহার করতে পারবে। ৭ দিন পর রিনিউ না করলে একাউন্ট বন্ধ হবে।</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  {submitting ? 'তৈরি হচ্ছে...' : 'দোকান সক্রিয় করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '12px 20px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: '800', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspect Shop */}
      {inspectShop && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="ui-card" style={{ maxWidth: '540px', width: '100%', padding: '26px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              🔍 দোকানের বিস্তারিত মনিটরিং
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              {inspectShop.shopName} ({inspectShop.phone})
            </p>

            {inspectData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '13px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px' }}>প্ল্যান:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{inspectData.planName}</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px' }}>মেয়াদ বাকি:</span>
                  <strong style={{ fontSize: '14px', color: '#059669' }}>{inspectData.daysRemaining} দিন</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px' }}>পণ্য সংখ্যা:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{inspectData.limits?.currentProducts || 0} টি</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px' }}>শাখা সংখ্যা:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{inspectData.limits?.currentBranches || 1} টি</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px' }}>স্টাফ সংখ্যা:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{inspectData.limits?.currentStaff || 0} জন</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '11.5px' }}>এসএমএস ব্যালেন্স:</span>
                  <strong style={{ fontSize: '14px', color: '#2563eb' }}>{inspectData.smsBalance || 0}</strong>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>লোড হচ্ছে...</div>
            )}

            <div style={{ marginTop: '18px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setInspectShop(null)}
                style={{ padding: '10px 22px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: '800', cursor: 'pointer' }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
