'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getIndustryTheme, normalizeIndustryId } from '../lib/industryConfig';
import DataLoader from '../components/DataLoader';
import LandingPage from '../components/LandingPage';
import SpeakerVoiceEnrollModal from '../components/SpeakerVoiceEnrollModal';
import { triggerFieldVoiceInput } from '../lib/voiceFieldUtils';
import { formatBDDateLong, formatBDDate, formatBDDateTime, formatBDTime } from '../lib/dateUtils';
import { counterSleepManager } from '../lib/counterSleepManager';

export default function ShopkeeperDashboard() {
  const { userRole, tenant, activeRoleMode, isLoading, isOnline, pendingSyncCount, triggerHaptic, speakAnnouncement, saveOfflineAction, isFeatureEnabled } = useAuth();
  const router = useRouter();
  
  const [showVoiceEnrollModal, setShowVoiceEnrollModal] = useState(false);
  const activeIndustryId = tenant?.industryId || (tenant as any)?.industry_category_id || (tenant as any)?.industryCategoryId || (tenant as any)?.category_id;
  const theme = getIndustryTheme(activeIndustryId, tenant?.shopName);

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    cashSales: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    cashInHand: 0,
    totalMarketDue: 0,
    orderCount: 0
  });

  // Date Filter & Custom Date Range States
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'yesterday' | '7days' | 'thisMonth' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('আজকের হিসাব');

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // 👑 Hisabpati-style Balance Cockpit, Dealers & Privacy Mode
  const [dealers, setDealers] = useState<any[]>([]);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(false);
  const [authMounted, setAuthMounted] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone = (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('source=pwa') ||
      localStorage.getItem('lbos_pwa_installed') === 'true'
    );
    setIsStandaloneApp(standalone);
    setAuthMounted(true);
    if (standalone) {
      localStorage.setItem('lbos_pwa_installed', 'true');
    }
  }, []);

  useEffect(() => {
    if (authMounted && isStandaloneApp && !tenant && (userRole as any) !== 'admin') {
      const hasStoredTenant = !!localStorage.getItem('lbos_active_tenant');
      if (!hasStoredTenant) {
        router.replace('/login');
      }
    }
  }, [authMounted, isStandaloneApp, tenant, userRole, router]);

  useEffect(() => {
    const savedPrivacy = localStorage.getItem('lbos_privacy_mode');
    if (savedPrivacy === 'true') setPrivacyMode(true);
  }, []);

  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    localStorage.setItem('lbos_privacy_mode', String(next));
    triggerHaptic('medium');
    if (next) {
      speakAnnouncement('প্রাইভেসি মোড চালু, টাকার অংক লুকানো হয়েছে');
    } else {
      speakAnnouncement('ব্যালেন্স দৃশ্যমান করা হয়েছে');
    }
  };

  // 🎙️ Universal Voice-to-Fill for any input field
  const startVoiceInputForField = (setter: (val: string) => void, isNumericOnly = false, label?: string) => {
    triggerFieldVoiceInput({ label, isNumeric: isNumericOnly, onResult: setter });
  };

  // Time & Greeting
  const [greeting, setGreeting] = useState('আসসালামু আলাইকুম');
  const [currentDateString, setCurrentDateString] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('শুভ সকাল');
    else if (hour >= 12 && hour < 17) setGreeting('শুভ দুপুর');
    else if (hour >= 17 && hour < 20) setGreeting('শুভ সন্ধ্যা');
    else setGreeting('শুভ রাত্রি');

    setCurrentDateString(formatBDDateLong(new Date()));
  }, []);

  // 🔄 Mobile Pull-to-Refresh Gesture Engine
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartY.current);
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.45, 90));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= 55 && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      await loadShopData();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        triggerHaptic('success');
      }, 500);
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  };

  // 📲 1-Tap WhatsApp Receipt Share
  const shareReceiptViaWhatsApp = (customerName: string, amount: number, memoType: string, note?: string) => {
    triggerHaptic('medium');
    const text = `🧾 *${tenant?.shopName || 'সহজ হিসাব'}*\n📍 ${tenant?.location || 'বাজার'}\n📅 ${formatBDDate(new Date())}\n\n👤 কাস্টমার: ${customerName}\n🔖 বিবরণ: ${memoType} ${note ? `(${note})` : ''}\n💵 টাকা: ৳${amount.toLocaleString('en-US')}\n\nধন্যবাদ, আপনার হিসাব ডিজিটাল খাতা ও ক্লাউডে সংরক্ষিত আছে! ✨`;
    const encoded = encodeURIComponent(text);
    if (navigator.share) {
      navigator.share({
        title: `${tenant?.shopName} ডিজিটাল রসিদ`,
        text: text
      }).catch(() => {
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
      });
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  // ⚡ Instant Cache Hydration: Zero-delay perceived load time
  useEffect(() => {
    if (!tenant?.id) return;
    try {
      const cacheKey = `lbos_dashboard_cache_${tenant.id}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.metrics) setMetrics(parsed.metrics);
        if (parsed.recentSales) setRecentSales(parsed.recentSales);
        if (parsed.lowStockCount !== undefined) setLowStockCount(parsed.lowStockCount);
        if (parsed.periodLabel) setPeriodLabel(parsed.periodLabel);
        setLoading(false);
      }
    } catch (e) {}
  }, [tenant?.id]);

  useEffect(() => {
    if (!isLoading) {
      if (userRole === 'admin') {
        router.push('/admin');
      }
    }
  }, [isLoading, userRole, router]);

  const loadShopData = async (periodOverride?: string, startOverride?: string, endOverride?: string) => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    const p = periodOverride !== undefined ? periodOverride : selectedPeriod;
    const sDate = startOverride !== undefined ? startOverride : customStartDate;
    const eDate = endOverride !== undefined ? endOverride : customEndDate;

    try {
      let queryUrl = `/api/reports/day-end?tenantId=${tenant.id}&period=${p}`;
      if (p === 'custom' && sDate && eDate) {
        queryUrl += `&startDate=${sDate}&endDate=${eDate}`;
      }

      // ⚡ High-Speed Parallel Execution
      const [repRes, prodRes, custRes, dealRes] = await Promise.all([
        fetch(queryUrl).catch(() => null),
        fetch(`/api/products?tenantId=${tenant.id}`).catch(() => null),
        fetch(`/api/customers?tenantId=${tenant.id}`).catch(() => null),
        fetch(`/api/dealers?tenantId=${tenant.id}`).catch(() => null),
      ]);

      let newMetrics = metrics;
      let newRecentSales = recentSales;
      let newPeriodLabel = periodLabel;
      let newLowStock = lowStockCount;

      if (repRes && repRes.ok) {
        const repData = await repRes.json();
        setMetrics(repData);
        newMetrics = repData;
        if (repData.periodLabel) {
          setPeriodLabel(repData.periodLabel);
          newPeriodLabel = repData.periodLabel;
        }
        if (repData.recentPeriodSales && Array.isArray(repData.recentPeriodSales)) {
          const recents = repData.recentPeriodSales.slice(0, 5);
          setRecentSales(recents);
          newRecentSales = recents;
        }
      }

      if (prodRes && prodRes.ok) {
        const prods = await prodRes.json();
        setProducts(Array.isArray(prods) ? prods : []);
        const low = (prods || []).filter((p: any) => p.stock <= (p.lowStockThreshold || 5)).length;
        setLowStockCount(low);
        newLowStock = low;
      }

      if (custRes && custRes.ok) {
        const cList = await custRes.json();
        setCustomers(Array.isArray(cList) ? cList : []);
      }

      if (dealRes && dealRes.ok) {
        const dList = await dealRes.json();
        setDealers(Array.isArray(dList) ? dList : []);
      }

      // Persist to local cache for instant future loads
      try {
        localStorage.setItem(`lbos_dashboard_cache_${tenant.id}`, JSON.stringify({
          metrics: newMetrics,
          recentSales: newRecentSales,
          lowStockCount: newLowStock,
          periodLabel: newPeriodLabel,
          timestamp: Date.now()
        }));
      } catch (e) {}
    } catch (e) {
      console.error('Failed to load shop data', e);
    }
    setLoading(false);
  };

  const sendWhatsAppDueReminder = (customer: any) => {
    triggerHaptic('success');
    const cleanPhone = String(customer.phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : cleanPhone.startsWith('01') ? '88' + cleanPhone : cleanPhone;
    const due = customer.totalDue || customer.total_due || 0;
    const msg = `সম্মানিত ${customer.name || 'গ্রাহক'}, ${tenant?.shopName || 'আমাদের দোকান'}-এ আপনার বকেয়া বাকি আছে ৳${due} টাকা। সুবিধামতো সময়ে পরিশোধের জন্য অনুরোধ করা হলো। ধন্যবাদ!`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  useEffect(() => {
    if (tenant?.id) {
      loadShopData(selectedPeriod, customStartDate, customEndDate);
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [tenant?.id, selectedPeriod, isLoading]);

  // If Admin visiting root, offer quick link to admin console
  if (userRole === 'admin') {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="ui-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 28px' }}>
          <span style={{ fontSize: '54px', display: 'block', marginBottom: '14px' }}>👑</span>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
            সুপার অ্যাডমিন সেশন সক্রিয়
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.5 }}>
            আপনি বর্তমানে প্ল্যাটফর্ম ওনার হিসেবে কানেক্টেড আছেন। নতুন দোকান তৈরি ও সাবস্ক্রিপশন পরিচালনা করতে অ্যাডমিন কন্ট্রোল সেন্টারে যান।
          </p>
          <Link
            href="/admin"
            style={{
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 28px',
              borderRadius: '14px',
              fontWeight: '800',
              display: 'inline-block',
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)'
            }}
          >
            👑 অ্যাডমিন কন্ট্রোল সেন্টারে যান ➔
          </Link>
        </div>
      </div>
    );
  }

  const hasSavedTenant = typeof window !== 'undefined' && (
    !!localStorage.getItem('lbos_active_tenant') ||
    !!localStorage.getItem('lbos_user_role')
  );

  // If user is super admin, redirect to super admin panel immediately
  if ((userRole as any) === 'admin') {
    if (typeof window !== 'undefined') {
      router.push('/admin');
    }
    return (
      <div className="app-container">
        <DataLoader
          type="full"
          text="সুপার অ্যাডমিন ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে..."
          subText="অনুগ্রহ করে অপেক্ষা করুন"
          icon="👑"
        />
      </div>
    );
  }

  // If a tenant session is stored in localStorage but still restoring in React state, show loader, NEVER landing page!
  if (hasSavedTenant && !tenant) {
    return (
      <div className="app-container">
        <DataLoader
          type="full"
          text="দোকানের লাইভ হিসাব ও ড্যাশবোর্ড লোড হচ্ছে..."
          subText="অনুগ্রহ করে অপেক্ষা করুন"
          icon="🏪"
        />
      </div>
    );
  }

  // If running inside installed standalone PWA app, NEVER show visitor landing page - route straight to /login
  if (isStandaloneApp && !tenant) {
    return (
      <div className="app-container">
        <DataLoader
          type="full"
          text="সহজ হিসাব অ্যাপে স্বাগতম..."
          subText="দোকান লগইন স্ক্রিনে নিয়ে যাওয়া হচ্ছে"
          icon="📱"
        />
      </div>
    );
  }

  // 1. Wait for AuthContext session restoration to complete
  if (isLoading) {
    return (
      <div className="app-container">
        <DataLoader
          type="full"
          text="দোকানের লাইভ হিসাব ও ড্যাশবোর্ড লোড হচ্ছে..."
          subText="আজকের বিক্রয়, ক্যাশ ও খতিয়ান প্রস্তুত করা হচ্ছে"
          icon="🏪"
        />
      </div>
    );
  }

  // 2. If not logged in: If inside installed app (PWA), route directly to login; in browser, show LandingPage!
  if (!tenant) {
    if (isStandaloneApp) {
      router.replace('/login');
      return (
        <div className="app-container">
          <DataLoader type="full" text="লগইন পেজে নিয়ে যাওয়া হচ্ছে..." icon="📱" />
        </div>
      );
    }
    return <LandingPage />;
  }

  if (isLoading || (loading && recentSales.length === 0 && metrics.totalSales === 0)) {
    return (
      <div className="app-container">
        <DataLoader
          type="full"
          text="দোকানের লাইভ হিসাব ও ড্যাশবোর্ড লোড হচ্ছে..."
          subText="আজকের বিক্রয়, ক্যাশ ও খতিয়ান প্রস্তুত করা হচ্ছে"
          icon="🏪"
        />
      </div>
    );
  }

  return (
    <div
      className="app-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 🔄 Mobile Pull-to-Refresh Live Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div style={{
          textAlign: 'center',
          padding: `${Math.min(pullDistance, 36)}px 0 12px`,
          transition: isRefreshing ? 'all 0.2s ease' : 'none',
          color: '#059669',
          fontWeight: '800',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span style={{
            display: 'inline-block',
            fontSize: '18px',
            transform: isRefreshing ? 'rotate(360deg)' : `rotate(${pullDistance * 4}deg)`,
            transition: isRefreshing ? 'transform 0.8s linear infinite' : 'none'
          }}>
            🔄
          </span>
          <span>{isRefreshing ? 'লাইভ হিসাব ক্লাউড থেকে সিঙ্ক হচ্ছে...' : (pullDistance >= 55 ? 'ছেড়ে দিন রিফ্রেশ করতে...' : 'নিচে টানুন রিফ্রেশ করতে...')}</span>
        </div>
      )}
      
      {/* Clean Greeting & Mode Switcher Header */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '12px 14px',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', background: theme.headerBadgeBg, color: theme.headerBadgeText, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${theme.accentBorder}` }}>
              {theme.icon} {theme.name}
            </span>
            <span style={{
              fontSize: '11px',
              color: isOnline ? '#059669' : '#059669',
              background: isOnline ? '#ecfdf5' : '#f8fafc',
              border: isOnline ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
              padding: '2px 7px',
              borderRadius: '6px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className={isOnline ? "live-dot" : ""} style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#10b981', display: 'inline-block' }}></span>
              {isOnline ? '🟢 অনলাইন' : '⚡ অফলাইন'}
              {pendingSyncCount > 0 && <span style={{ background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '99px', fontSize: '9.5px' }}>{pendingSyncCount}</span>}
            </span>
          </div>

          <h2 style={{ fontSize: 'clamp(16px, 4.2vw, 22px)', fontWeight: '800', color: '#0f172a', margin: '3px 0 1px' }}>
            {greeting}, {tenant.ownerName || 'দোকান মালিক'}!
          </h2>
          <p style={{ margin: 0, fontSize: 'clamp(11px, 3.2vw, 12.5px)', color: '#64748b' }}>
            <strong style={{ color: '#0f172a' }}>{tenant.shopName}</strong> • 📍 {tenant.location || 'বাজার'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Link
            href="/calculator"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '900',
              fontSize: '12px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <span>🔢 ক্যালকুলেটর</span>
          </Link>

          <Link
            href="/pos?voice=1"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '900',
              fontSize: '12px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <span>🎙️ ভয়েস</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowVoiceEnrollModal(true);
            }}
            style={{
              background: '#ffffff',
              color: '#059669',
              border: '1.5px solid #10b981',
              padding: '7px 11px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
            title="কণ্ঠ রেজিস্টার ও ভয়েস লক ফিল্টার"
          >
            <span>🛡️ ভয়েস লক</span>
          </button>
        </div>
      </div>

      {/* 🚀 QUICK POWER TOOLS HUB: 1-TAP INSTANT ACCESS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px',
        marginBottom: '14px'
      }}>
        <Link
          href="/calculator"
          onClick={() => triggerHaptic('light')}
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '11px 12px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.18)',
            transition: 'transform 0.15s ease',
            minWidth: 0
          }}
          className="clickable-card"
        >
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🔢</span>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: '900', fontSize: '12.5px', whiteSpace: 'nowrap' }}>ক্যালকুলেটর</div>
            <div style={{ fontSize: '10px', color: '#a7f3d0', whiteSpace: 'nowrap' }}>টাকা দিয়ে বিক্রি</div>
          </div>
        </Link>

        <Link
          href="/pos?voice=1"
          onClick={() => triggerHaptic('light')}
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '11px 12px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.18)',
            transition: 'transform 0.15s ease',
            minWidth: 0
          }}
          className="clickable-card"
        >
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🎙️</span>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: '900', fontSize: '12.5px', whiteSpace: 'nowrap' }}>ভয়েস বিলিং</div>
            <div style={{ fontSize: '10px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>মুখে বলে বিক্রি</div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowVoiceEnrollModal(true);
          }}
          style={{
            background: '#ffffff',
            border: '1.5px solid #10b981',
            color: '#065f46',
            borderRadius: '16px',
            padding: '11px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            textAlign: 'left',
            minWidth: 0
          }}
          className="clickable-card"
        >
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🛡️</span>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: '900', fontSize: '12px', whiteSpace: 'nowrap' }}>কণ্ঠ ও ভয়েস লক</div>
            <div style={{ fontSize: '10px', color: '#059669', whiteSpace: 'nowrap' }}>টিভি ও নয়েজ শিল্ড</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('success');
            counterSleepManager.enable(true);
          }}
          style={{
            background: '#0f172a',
            color: '#34d399',
            border: '1.5px solid #1e293b',
            borderRadius: '16px',
            padding: '11px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'left',
            minWidth: 0
          }}
          className="clickable-card"
        >
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🌙</span>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: '900', fontSize: '12px', color: '#ffffff', whiteSpace: 'nowrap' }}>কাউন্টার স্লিপ মোড</div>
            <div style={{ fontSize: '10px', color: '#34d399', whiteSpace: 'nowrap' }}>স্ক্রিন অফে শুনবে</div>
          </div>
        </button>
      </div>

      {/* ==========================================================================
         📅 INTERACTIVE DATE FILTER BAR & CUSTOM RANGE SELECTOR
         ========================================================================== */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '16px',
        padding: '8px 12px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'today', label: 'আজ' },
            { id: 'yesterday', label: 'গতকাল' },
            { id: '7days', label: 'গত ৭ দিন' },
            { id: 'thisMonth', label: 'এই মাস' },
            { id: 'custom', label: '📅', title: 'কাস্টম তারিখ' },
          ].map((item) => {
            const isActive = selectedPeriod === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={item.title || item.label}
                onClick={() => {
                  triggerHaptic('light');
                  if (item.id === 'custom') {
                    setShowCustomDateModal(true);
                  } else {
                    setSelectedPeriod(item.id as any);
                    loadShopData(item.id);
                  }
                }}
                style={{
                  background: isActive ? '#10b981' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#475569',
                  border: isActive ? '1px solid #10b981' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: item.id === 'custom' ? '6px 10px' : '6px 12px',
                  fontSize: '12.5px',
                  fontWeight: isActive ? '800' : '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🗓️</span>
          <span>{periodLabel}</span>
        </div>
      </div>

      {/* 📅 Custom Date Range Modal */}
      {showCustomDateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
          zIndex: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#ffffff', borderRadius: '22px', padding: '22px', width: '100%', maxWidth: '360px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                📅 কাস্টম তারিখ নির্বাচন করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomDateModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                শুরু তারিখ (From):
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                শেষ তারিখ (To):
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '10px',
                  border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              disabled={!customStartDate || !customEndDate}
              onClick={() => {
                if (customStartDate && customEndDate) {
                  triggerHaptic('success');
                  setSelectedPeriod('custom');
                  setShowCustomDateModal(false);
                  loadShopData('custom', customStartDate, customEndDate);
                }
              }}
              style={{
                width: '100%',
                background: (!customStartDate || !customEndDate) ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: (!customStartDate || !customEndDate) ? 'not-allowed' : 'pointer'
              }}
            >
              ✓ হিসাব ফিল্টার করুন
            </button>
          </div>
        </div>
      )}

      {/* ⏳ Pharmacy Smart Expiry Widget */}
      {normalizeIndustryId(activeIndustryId, tenant?.shopName) === 'cat-pharmacy' && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '12px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⏳</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: '800' }}>ফার্মেসি মেয়াদ রাডার (Expiry Tracker)</div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>মেয়াদোত্তীর্ণ হতে চলা ঔষধ ও ড্রাগ মনিটর করুন</div>
            </div>
          </div>
          <Link
            href="/expiry-tracker"
            style={{
              background: '#ffffff',
              color: '#10b981',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '800',
              textDecoration: 'none'
            }}
          >
            রাডার দেখুন →
          </Link>
        </div>
      )}

      {/* ==========================================================================
         👑 HISABPATI-STYLE HERO BALANCE COCKPIT
         ========================================================================== */}
      {(() => {
        const liveCashInHand = (metrics as any)?.cashInHand !== undefined ? Number((metrics as any).cashInHand) : ((Number(metrics.cashSales) || 0) - (Number(metrics.expenses) || 0));
        const liveBankBalance = Number((metrics as any)?.digitalSales) || 0;
        const todayCashIn = (Number(metrics.cashSales) || 0) + (Number((metrics as any)?.dueCollected) || 0);
        const todayCashOut = (Number(metrics.expenses) || 0) + (Number((metrics as any)?.dealerPaid) || 0);

        const totalMarketDue = customers.reduce((sum: number, c: any) => sum + (Number(c.totalDue || c.total_due) || 0), 0);
        const totalDealerDue = dealers.reduce((sum: number, d: any) => sum + (Number(d.payableDue || d.payable_due) || 0), 0);
        const totalProductStockCount = products.reduce((sum: number, p: any) => sum + (Number(p.stock) || 0), 0);
        const totalStockWholesaleValue = products.reduce((sum: number, p: any) => sum + ((Number(p.stock) || 0) * (Number(p.purchasePrice || p.purchase_price) || Math.round((Number(p.sellingPrice || p.selling_price) || 0) * 0.8))), 0);
        const totalPartiesCount = customers.length + dealers.length;

        return (
          <>
            {/* 👑 Master Luxury Fin-Tech Hero Balance Card */}
            <div style={{
              background: 'radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), linear-gradient(145deg, #0b1329 0%, #0f172a 50%, #064e3b 100%)',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '22px 20px',
              marginBottom: '20px',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              boxShadow: '0 16px 36px -8px rgba(6, 78, 59, 0.35), 0 4px 14px rgba(15, 23, 42, 0.25)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Row: Period Badge + Memo Count + Speech Assistant + Privacy Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '800', background: 'rgba(255, 255, 255, 0.12)', color: '#e2e8f0', padding: '3px 10px', borderRadius: '99px', border: '1px solid rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)' }}>
                    📊 {periodLabel}
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(52, 211, 153, 0.18)', color: '#34d399', fontWeight: '800', padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(52, 211, 153, 0.35)' }}>
                    {((metrics as any)?.todayOrderCount !== undefined ? (metrics as any).todayOrderCount : metrics.orderCount || 0)}টি মেমো বিক্রি
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* 🔊 Voice Assistant Speech Readout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      const totalS = Number(metrics.totalSales || 0);
                      const totalE = Number(metrics.expenses || 0);
                      const totalP = Number(metrics.netProfit || 0);
                      const liveC = Number(liveCashInHand || 0);
                      speakAnnouncement(
                        `${periodLabel} এ আপনার দোকানে মোট ${totalS.toLocaleString('en-US')} টাকা বিক্রি হয়েছে, খরচ ${totalE.toLocaleString('en-US')} টাকা এবং নিট লাভ ${totalP.toLocaleString('en-US')} টাকা। ক্যাশ জমা আছে ${liveC.toLocaleString('en-US')} টাকা।`,
                        undefined,
                        true
                      );
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '10px',
                      width: '34px',
                      height: '34px',
                      color: '#ffffff',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.2s ease'
                    }}
                    title="হিসাব শুনুন (সহকারী ভয়েস স্পিকার)"
                  >
                    🔊
                  </button>

                  <button
                    type="button"
                    onClick={togglePrivacyMode}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '10px',
                      width: '34px',
                      height: '34px',
                      color: '#ffffff',
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.2s ease'
                    }}
                    title={privacyMode ? 'ব্যালেন্স দেখতে চাপুন' : 'ব্যালেন্স গোপন রাখতে চাপুন'}
                  >
                    {privacyMode ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Centerpiece: মোট বিক্রি (Total Sales) */}
              <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                <div style={{ fontSize: '12.5px', color: '#a7f3d0', fontWeight: '800', marginBottom: '2px', letterSpacing: '0.2px' }}>
                  {periodLabel} এর মোট বিক্রি
                </div>
                <div style={{ fontSize: 'clamp(30px, 6.8vw, 40px)', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }} className="num-font">
                  {privacyMode ? '৳ ••••••' : `৳ ${((metrics as any)?.todaySales !== undefined ? (metrics as any).todaySales : metrics.totalSales || 0).toLocaleString('en-US')}`}
                </div>
              </div>

              {/* 4 Financial Sub-Pills (Cash Sales, Due Sales, Net Profit, Expense) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '9px 12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <span style={{ fontSize: '11px', color: '#a7f3d0', fontWeight: '800', display: 'block' }}>💵 নগদ বিক্রি</span>
                  <strong style={{ fontSize: '15.5px', color: '#ffffff', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••' : `৳ ${((metrics as any)?.todayCashSales !== undefined ? (metrics as any).todayCashSales : metrics.cashSales || 0).toLocaleString('en-US')}`}
                  </strong>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '9px 12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '800', display: 'block' }}>🔴 বাকি বিক্রি</span>
                  <strong style={{ fontSize: '15.5px', color: '#ffffff', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••' : `৳ ${((metrics as any)?.todayDueSales !== undefined ? (metrics as any).todayDueSales : 0).toLocaleString('en-US')}`}
                  </strong>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '9px 12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '800', display: 'block' }}>💹 {periodLabel} নিট লাভ</span>
                  <strong style={{ fontSize: '15.5px', color: '#ffffff', fontWeight: '900' }} className="num-font">
                    {activeRoleMode === 'owner' ? (privacyMode ? '••••' : `৳ ${((metrics as any)?.todayNetProfit !== undefined ? (metrics as any).todayNetProfit : metrics.netProfit || 0).toLocaleString('en-US')}`) : '🔒 মোড'}
                  </strong>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '9px 12px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                  <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '800', display: 'block' }}>💸 {periodLabel} দোকান খরচ</span>
                  <strong style={{ fontSize: '15.5px', color: '#ffffff', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••' : `৳ ${((metrics as any)?.todayExpenses !== undefined ? (metrics as any).todayExpenses : metrics.expenses || 0).toLocaleString('en-US')}`}
                  </strong>
                </div>
              </div>

              {/* Integrated Frosted Glass Bottom Sub-Pill: হাতে নগদ ক্যাশ vs ব্যাংকে ব্যালেন্স */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.24)',
                borderRadius: '16px',
                padding: '11px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1fr',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(16, 185, 129, 0.22)', color: '#34d399', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: '900', border: '1px solid rgba(52, 211, 153, 0.35)' }}>
                    💵
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>হাতে নগদ ক্যাশ</span>
                    <strong style={{ fontSize: '15px', color: '#ffffff', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••••' : `৳ ${Math.max(0, liveCashInHand).toLocaleString('en-US')}`}
                    </strong>
                  </div>
                </div>

                <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.12)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(56, 189, 248, 0.22)', color: '#38bdf8', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: '900', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                    🏦
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', display: 'block' }}>ব্যাংকে ব্যালেন্স</span>
                    <strong style={{ fontSize: '15px', color: '#ffffff', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••••' : `৳ ${liveBankBalance.toLocaleString('en-US')}`}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* ⚡ 4-Card Primary Business Cockpit */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '18px'
            }}>
              {/* Tile 1: POS / নতুন মেমো */}
              <Link
                href="/pos"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #a7f3d0',
                  borderRadius: '18px',
                  padding: '14px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '92px',
                  boxShadow: '0 4px 14px -2px rgba(16, 185, 129, 0.12)'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '18px', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
                    ⚡
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', whiteSpace: 'nowrap' }}>কাউন্টার ➔</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', fontWeight: '800', lineHeight: 1.25 }}>
                    {theme.posLabel || 'নতুন মেমো'}
                  </strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>দ্রুত বিক্রয় ও মেমো</span>
                </div>
              </Link>

              {/* Tile 2: বাকি খাতা */}
              {isFeatureEnabled('enableCustomerKhata') && (
                <Link
                  href="/khata"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '18px',
                    padding: '14px',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '92px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                  }}
                  className="clickable-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', fontSize: '18px', border: '1px solid #a7f3d0' }}>
                      📒
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', whiteSpace: 'nowrap' }}>খাতা ➔</span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', fontWeight: '800', lineHeight: 1.25 }}>
                      {theme.khataLabel || 'কাস্টমার বাকি'}
                    </strong>
                    <span className="num-font" style={{ fontSize: '13.5px', fontWeight: '900', color: '#059669' }}>
                      {privacyMode ? '••••••' : `৳ ${totalMarketDue.toLocaleString('en-US')}`}
                    </span>
                  </div>
                </Link>
              )}

              {/* Tile 3: পণ্য ও স্টক */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '14px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '92px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: '#f0f9ff', color: '#0284c7', display: 'grid', placeItems: 'center', fontSize: '18px', border: '1px solid #bae6fd' }}>
                    📦
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', whiteSpace: 'nowrap' }}>স্টক ➔</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', fontWeight: '800', lineHeight: 1.25 }}>
                    {theme.stockLabel || 'মজুত পণ্য'}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: lowStockCount > 0 ? '#dc2626' : '#64748b', fontWeight: lowStockCount > 0 ? '800' : '600' }}>
                    {products.length}টি পণ্য {lowStockCount > 0 ? `(${lowStockCount} কম)` : ''}
                  </span>
                </div>
              </Link>

              {/* Tile 4: দোকান খরচ */}
              <Link
                href="/expenses"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '14px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '92px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: '#fef2f2', color: '#ef4444', display: 'grid', placeItems: 'center', fontSize: '18px', border: '1px solid #fecaca' }}>
                    💸
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444', whiteSpace: 'nowrap' }}>খরচ ➔</span>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a', display: 'block', fontWeight: '800', lineHeight: 1.25 }}>
                    দোকান খরচ
                  </strong>
                  <span className="num-font" style={{ fontSize: '13.5px', fontWeight: '900', color: '#e11d48' }}>
                    {privacyMode ? '••••' : `৳ ${(metrics.expenses || 0).toLocaleString('en-US')}`}
                  </span>
                </div>
              </Link>
            </div>

            {/* 📋 3 Executive Summary Bars (Dealer Due, Working Capital, Day-End Drawer) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '22px' }}>
              {/* Bar 1: মহাজন / ডিলার দেনা */}
              {isFeatureEnabled('enableDealerKhata') && (
                <Link
                  href="/dealers"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  className="clickable-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f8fafc', color: '#0f172a', display: 'grid', placeItems: 'center', fontSize: '16px', border: '1px solid #e2e8f0' }}>
                      🚚
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', fontWeight: '800' }}>{theme.dealerLabel || 'মহাজন / ডিলার দেনা'}</strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>বকেয়া পরিশোধের তালিকা</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '15px', color: '#0f172a', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••••' : `৳ ${totalDealerDue.toLocaleString('en-US')}`}
                    </strong>
                    <span style={{ fontSize: '16px', color: '#cbd5e1' }}>›</span>
                  </div>
                </Link>
              )}

              {/* Bar 2: স্টক মূল্য (পাইকারি মূলধন) */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'grid', placeItems: 'center', fontSize: '16px', border: '1px solid #fde68a' }}>
                    🪙
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', fontWeight: '800' }}>স্টক পাইকারি মূলধন</strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>দোকানে ইনভেন্টরি সম্পদ</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '15px', color: '#059669', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${totalStockWholesaleValue.toLocaleString('en-US')}`}
                  </strong>
                  <span style={{ fontSize: '16px', color: '#cbd5e1' }}>›</span>
                </div>
              </Link>

              {/* Bar 3: রাতের ড্রয়ার / ক্যাশ মিলানো */}
              <Link
                href="/day-end"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: '16px', border: '1px solid #ddd6fe' }}>
                    🌙
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', fontWeight: '800' }}>ক্যাশ মিলানো (ড্রয়ার)</strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>দিনের সমাপ্তি ও হিসাব মিলান</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#7c3aed', fontWeight: '800' }}>হিসাব মেলান</span>
                  <span style={{ fontSize: '16px', color: '#cbd5e1' }}>›</span>
                </div>
              </Link>

              {/* Bar 4: কিস্তি খাতা (if enabled) */}
              {isFeatureEnabled('enableInstallments') && (
                <Link
                  href="/installments"
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  className="clickable-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', fontSize: '16px', border: '1px solid #a7f3d0' }}>
                      📅
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', fontWeight: '800' }}>কিস্তি খাতা ও আদায়</strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>গ্রাহকের মাসিক কিস্তি ট্র্যাক</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: '800' }}>কিস্তি খাতা</span>
                    <span style={{ fontSize: '16px', color: '#cbd5e1' }}>›</span>
                  </div>
                </Link>
              )}
            </div>
          </>
        );
      })()}

          {/* Recent Sales Table */}
          <div className="ui-card" style={{ padding: '18px 20px', marginBottom: '24px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                <h3 style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🧾 সাম্প্রতিক বিক্রয় ও মেমো
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>ক্যাশ ও বাকি বিক্রয়ের রসিদ তালিকা</span>
              </div>
              <Link
                href="/pos"
                className="btn-dark-action"
              >
                + নতুন মেমো ➔
              </Link>
            </div>

            {loading ? (
              <DataLoader type="table" count={4} text={`${periodLabel} এর বিক্রয় ও মেমো তালিকা লোড হচ্ছে...`} />
            ) : recentSales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 14px', color: '#94a3b8' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🧾</span>
                <strong style={{ fontSize: '14px', color: '#64748b', display: 'block' }}>{periodLabel} এ কোনো মেমো কাটা হয়নি</strong>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                      <th style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>মেমো নং</th>
                      <th style={{ padding: '12px 14px' }}>🕒 সময় ও তারিখ</th>
                      <th style={{ padding: '12px 14px' }}>👤 ক্রেতা</th>
                      <th style={{ padding: '12px 14px' }}>💰 মোট টাকা</th>
                      <th style={{ padding: '12px 14px' }}>💵 পরিশোধ</th>
                      <th style={{ padding: '12px 14px' }}>🔴 বকেয়া</th>
                      <th style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'right' }}>রসিদ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                          #{s.invoiceNo || s.invoice_no || s.id?.slice(0, 6)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🕒</span>
                            <span>{formatBDTime(s.createdAt || s.created_at || s.date || Date.now())}</span>
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                            {formatBDDate(s.createdAt || s.created_at || s.date || Date.now())}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          <strong style={{ display: 'block', color: '#0f172a' }}>{s.customerName || s.customer_name || 'নগদ ক্রেতা'}</strong>
                          {s.customerPhone && <span style={{ fontSize: '11px', color: '#64748b' }}>{s.customerPhone}</span>}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', fontWeight: '900', color: '#0f172a', fontSize: '14.5px' }}>
                          ৳{Number(s.totalAmount || s.total_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', color: '#059669', fontWeight: '800' }}>
                          ৳{Number(s.paidAmount || s.paid_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', color: Number(s.dueAmount || s.due_amount || 0) > 0 ? '#dc2626' : '#94a3b8', fontWeight: '800' }}>
                          ৳{Number(s.dueAmount || s.due_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedInvoice(s)}
                            style={{
                              background: '#f1f5f9',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              padding: '6px 12px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>🖨️</span> রসিদ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {/* Invoice Reprint Modal */}
      {selectedInvoice && (
        <div className="invoice-modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px',
          overflowY: 'auto'
        }}>
          <div className="invoice-modal-card" style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px 20px',
            width: '100%',
            maxWidth: '380px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            maxHeight: '92vh',
            overflowY: 'auto'
          }}>
            <div className="printable-receipt" style={{
              background: '#fff',
              fontFamily: 'monospace, "Hind Siliguri", sans-serif',
              fontSize: '12px',
              lineHeight: 1.4,
              color: '#000',
              borderBottom: '1px dashed #cbd5e1',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #94a3b8', paddingBottom: '8px', marginBottom: '8px' }}>
                <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '900' }}>{tenant?.shopName || 'দোকান'}</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>{tenant?.location || 'বাজার'}</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>মোবাইল: {tenant?.phone || ''}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: '#475569' }}>
                  <span>মেমো: #{selectedInvoice.invoiceNo || selectedInvoice.invoice_no || selectedInvoice.id?.slice(0, 6)}</span>
                  <span>{formatBDDate(selectedInvoice.created_at || new Date())}</span>
                </div>
                <div style={{ textAlign: 'left', fontSize: '11.5px', marginTop: '4px', fontWeight: '700' }}>
                  ক্রেতা: {selectedInvoice.customerName || selectedInvoice.customer_name || 'নগদ ক্রেতা'}
                </div>
              </div>

              {/* Items List if Available */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', marginBottom: '4px', fontSize: '11px' }}>
                    <span>বিবরণ</span>
                    <span>পরিমাণ × দর</span>
                  </div>
                  {selectedInvoice.items.map((it: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
                      <span>{it.product_name || it.productName || it.product?.banglaName || 'পণ্য'}</span>
                      <span className="num-font">
                        {it.quantity} × ৳{it.selling_price || it.sellingPrice || it.unitPrice} = ৳{it.total_price || it.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '14px', marginBottom: '4px' }}>
                  <span>মোট বিল:</span>
                  <span className="num-font">৳{selectedInvoice.totalAmount || selectedInvoice.total_amount || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: '700' }}>
                  <span>পরিশোধিত:</span>
                  <span className="num-font">৳{selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0} ({(selectedInvoice.paymentMethod || selectedInvoice.payment_method || 'CASH').toUpperCase()})</span>
                </div>
                {Number(selectedInvoice.dueAmount || selectedInvoice.due_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: '700' }}>
                    <span>বকেয়া বাকি:</span>
                    <span className="num-font">৳{selectedInvoice.dueAmount || selectedInvoice.due_amount}</span>
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                *** ধন্যবাদ, আবার আসবেন ***
              </div>
            </div>

            {/* Action Buttons (Excluded from Print) */}
            <div className="no-print" style={{ display: 'grid', gap: '8px' }}>
              <button
                onClick={() => {
                  const custName = selectedInvoice.customerName || selectedInvoice.customer_name || 'নগদ ক্রেতা';
                  const totAmt = Number(selectedInvoice.totalAmount || selectedInvoice.total_amount || 0);
                  const memoNo = selectedInvoice.invoiceNo || selectedInvoice.invoice_no || selectedInvoice.id?.slice(0, 6);
                  shareReceiptViaWhatsApp(custName, totAmt, `মেমো #${memoNo}`, `পরিশোধিত: ৳${selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0}`);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #25d366 0%, #16a34a 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <span>💬</span> WhatsApp এ রসিদ পাঠান
              </button>

              <button
                onClick={() => window.print()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>🖨️</span> থার্মাল স্লিপ প্রিন্ট করুন
              </button>

              <button
                onClick={() => setSelectedInvoice(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ Voice Profile Enrollment & Biometrics Shield Modal */}
      {showVoiceEnrollModal && (
        <SpeakerVoiceEnrollModal
          isOpen={showVoiceEnrollModal}
          onClose={() => setShowVoiceEnrollModal(false)}
        />
      )}

    </div>
  );
}
