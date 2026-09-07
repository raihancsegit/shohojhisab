'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getIndustryTheme } from '../lib/industryConfig';
import DataLoader from '../components/DataLoader';
import { triggerFieldVoiceInput } from '../lib/voiceFieldUtils';

export default function ShopkeeperDashboard() {
  const { userRole, tenant, activeRoleMode, isLoading, isOnline, pendingSyncCount, triggerHaptic, speakAnnouncement, saveOfflineAction } = useAuth();
  const router = useRouter();
  const theme = getIndustryTheme(tenant?.industryId);

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

  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // 👑 Hisabpati-style Balance Cockpit, Dealers & Privacy Mode
  const [dealers, setDealers] = useState<any[]>([]);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

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

    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setCurrentDateString(new Date().toLocaleDateString('bn-BD', options));
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
    const text = `🧾 *${tenant?.shopName || 'সহজ হিসাব'}*\n📍 ${tenant?.location || 'বাজার'}\n📅 ${new Date().toLocaleDateString('bn-BD')}\n\n👤 কাস্টমার: ${customerName}\n🔖 বিবরণ: ${memoType} ${note ? `(${note})` : ''}\n💵 টাকা: ৳${amount.toLocaleString('en-US')}\n\nধন্যবাদ, আপনার হিসাব ডিজিটাল খাতা ও ক্লাউডে সংরক্ষিত আছে! ✨`;
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

  useEffect(() => {
    if (!isLoading && !tenant && userRole !== 'admin') {
      router.push('/login');
    }
  }, [isLoading, tenant, userRole, router]);

  const loadShopData = async () => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch real Day-End live financials for this tenant
      const repRes = await fetch(`/api/reports/day-end?tenantId=${tenant.id}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        setMetrics(repData);
      }

      // 2. Fetch products to count low stock
      const prodRes = await fetch(`/api/products?tenantId=${tenant.id}`);
      if (prodRes.ok) {
        const prods = await prodRes.json();
        setProducts(Array.isArray(prods) ? prods : []);
        const low = (prods || []).filter((p: any) => p.stock <= (p.lowStockThreshold || 5)).length;
        setLowStockCount(low);
      }

      // 3. Fetch recent sales
      const salesRes = await fetch(`/api/sales?tenantId=${tenant.id}`);
      if (salesRes.ok) {
        const sales = await salesRes.json();
        setRecentSales(Array.isArray(sales) ? sales.slice(0, 5) : []);
      }

      // 4. Fetch customers
      const custRes = await fetch(`/api/customers?tenantId=${tenant.id}`);
      if (custRes.ok) {
        const cList = await custRes.json();
        setCustomers(Array.isArray(cList) ? cList : []);
      }

      // 5. Fetch dealers (for supplier payable metric)
      const dealRes = await fetch(`/api/dealers?tenantId=${tenant.id}`);
      if (dealRes.ok) {
        const dList = await dealRes.json();
        setDealers(Array.isArray(dList) ? dList : []);
      }
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
      loadShopData();
    }
  }, [tenant?.id]);

  if (isLoading || (loading && recentSales.length === 0)) {
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

  if (!tenant) {
    return (
      <div className="app-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="ui-card" style={{ maxWidth: '440px', margin: '0 auto', padding: '36px 24px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🏪</span>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px' }}>
            দোকানে লগইন করুন
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 24px' }}>
            দোকানের দৈনিক হিসাব, বাকি খাতা ও বিক্রয় পরিচালনা করতে আপনার দোকানের মোবাইল নাম্বার ও পিন দিয়ে লগইন করুন।
          </p>
          <Link
            href="/login"
            style={{
              background: '#10b981',
              color: '#fff',
              textDecoration: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '800',
              display: 'inline-block'
            }}
          >
            🔑 দোকানদার লগইন ➔
          </Link>
        </div>
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
          color: '#4f46e5',
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
              color: isOnline ? '#059669' : '#d97706',
              background: isOnline ? '#ecfdf5' : '#fffbeb',
              border: isOnline ? '1px solid #a7f3d0' : '1px solid #fde68a',
              padding: '2px 7px',
              borderRadius: '6px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className={isOnline ? "live-dot" : ""} style={{ width: '6px', height: '6px', borderRadius: '50%', background: isOnline ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
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
            href="/pos"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '900',
              fontSize: '12.5px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            className="clickable-card"
          >
            <span>⚡ POS বিক্রি</span>
          </Link>
        </div>
      </div>

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
            {/* 👑 Royal Violet Hero Cockpit Card */}
            <div style={{
              background: 'linear-gradient(135deg, #5b50e6 0%, #4338ca 100%)',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '22px 20px',
              marginBottom: '24px',
              boxShadow: '0 12px 30px -5px rgba(91, 80, 230, 0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Top Privacy Eye Button */}
              <button
                type="button"
                onClick={togglePrivacyMode}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#ffffff',
                  fontSize: '17px',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'background 0.2s ease'
                }}
                title={privacyMode ? 'ব্যালেন্স দেখতে চাপুন' : 'ব্যালেন্স গোপন রাখতে চাপুন'}
              >
                {privacyMode ? '🙈' : '👁️'}
              </button>

              {/* Dual-Column Main Balance */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', alignItems: 'center', marginBottom: '18px' }}>
                {/* Left Column: হাতে আছে (Cash in Hand) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#c7d2fe', fontWeight: '800', marginBottom: '4px' }}>
                    <span>হাতে আছে</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.3px', color: '#ffffff' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${Math.max(0, liveCashInHand).toLocaleString('en-US')}`}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '42px', background: 'rgba(255, 255, 255, 0.25)', margin: '0 10px' }} />

                {/* Right Column: ব্যাংকে আছে (Bank / Digital) */}
                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#c7d2fe', fontWeight: '800', marginBottom: '4px' }}>
                    <span>ব্যাংকে আছে</span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.3px', color: '#ffffff' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${liveBankBalance.toLocaleString('en-US')}`}
                  </div>
                </div>
              </div>

              {/* White Sub-Pill: নগদ প্রাপ্তি (Cash in) vs নগদ প্রদান (Cash out) */}
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1fr',
                alignItems: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                {/* নগদ প্রাপ্তি ↓ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '15px',
                    fontWeight: '900'
                  }}>
                    ↓
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>নগদ প্রাপ্তি</span>
                    <strong style={{ fontSize: '15px', color: '#10b981', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••' : `৳ ${todayCashIn.toLocaleString('en-US')}`}
                    </strong>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '28px', background: '#f1f5f9' }} />

                {/* নগদ প্রদান ↑ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    color: '#ef4444',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '15px',
                    fontWeight: '900'
                  }}>
                    ↑
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>নগদ প্রদান</span>
                    <strong style={{ fontSize: '15px', color: '#ef4444', fontWeight: '900' }} className="num-font">
                      {privacyMode ? '••••' : `৳ ${todayCashOut.toLocaleString('en-US')}`}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 📊 2x2 FLOATING-BADGE KPI METRIC CARDS (Industry Tailored) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '18px 14px',
              marginBottom: '20px',
              paddingTop: '6px'
            }}>
              {/* Card 1: কাস্টমার বাকি (Customer Due) */}
              <Link
                href="/khata"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #fed7aa',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(254, 215, 170, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '88px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ffedd5',
                  color: '#ea580c',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  📒
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {theme.khataLabel || 'কাস্টমার বাকি'} <span style={{ fontSize: '10px' }}>ⓘ</span>
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#ea580c', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{privacyMode ? '••••••' : `৳ ${totalMarketDue.toLocaleString('en-US')}`}</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>

              {/* Card 2: ডিলার / মহাজন দেনা (Dealer Payable) */}
              <Link
                href="/dealers"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #bae6fd',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(186, 230, 253, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '88px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  🚚
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {theme.dealerLabel || 'ডিলার দেনা'} <span style={{ fontSize: '10px' }}>ⓘ</span>
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0284c7', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{privacyMode ? '••••••' : `৳ ${totalDealerDue.toLocaleString('en-US')}`}</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>

              {/* Card 3: পণ্য ও স্টক (Products Count) */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #99f6e4',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(153, 246, 228, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '88px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ccfbf1',
                  color: '#0d9488',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  {theme.stockIcon || '📦'}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                    {theme.stockLabel || 'পণ্য ও স্টক'}
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{products.length} আইটেম</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>

              {/* Card 4: কাস্টমার খাতা (Customer Count) */}
              <Link
                href="/khata"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #fde047',
                  borderRadius: '20px',
                  padding: '16px 14px 14px',
                  position: 'relative',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(253, 224, 71, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '88px',
                  transition: 'transform 0.15s ease'
                }}
                className="clickable-card"
              >
                {/* Floating Round Badge at Top */}
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '18px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#fef9c3',
                  color: '#ca8a04',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '15px',
                  boxShadow: '0 2px 6px rgba(202, 138, 4, 0.2)',
                  border: '2px solid #ffffff'
                }}>
                  👥
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>
                    {theme.name?.includes('ফার্মেসি') ? 'রোগী ও কাস্টমার' : theme.name?.includes('পোশাক') ? 'ফ্যাশন খদ্দের' : 'মোট কাস্টমার'}
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }} className="num-font">
                    <span>{customers.length} জন</span>
                    <span style={{ color: '#4f46e5', fontSize: '16px' }}>→</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* 📋 3 HORIZONTAL QUICK ACTION INFO BARS */}
            <div style={{ display: 'grid', gap: '10px', marginBottom: '22px' }}>
              {/* Bar 1: মোট ব্যয়/খরচ > */}
              <Link
                href="/expenses"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>💸</span>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>মোট ব্যয় / খরচ</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#e11d48', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••' : `৳ ${(metrics.expenses || 0).toLocaleString('en-US')}`}
                  </strong>
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>›</span>
                </div>
              </Link>

              {/* Bar 2: মোট স্টক > */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🛒</span>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>মোট স্টক (পিস/ইউনিট)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#059669', fontWeight: '900' }} className="num-font">
                    {totalProductStockCount.toLocaleString('en-US')} টি
                  </strong>
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>›</span>
                </div>
              </Link>

              {/* Bar 3: স্টক মূল্য > */}
              <Link
                href="/stock"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #f1f5f9',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
                className="clickable-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>🪙</span>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>স্টক মূল্য (পাইকারি মূলধন)</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '14.5px', color: '#ca8a04', fontWeight: '900' }} className="num-font">
                    {privacyMode ? '••••••' : `৳ ${totalStockWholesaleValue.toLocaleString('en-US')}`}
                  </strong>
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>›</span>
                </div>
              </Link>
            </div>
          </>
        );
      })()}

      {/* 📊 ৩-বক্সের পরিষ্কার দৈনিক হিসাব (Daily Cash, Due & Profit 3-Box Cockpit) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {/* Box 1: Today's Cash In Hand */}
        <div className="ui-card" style={{ padding: '20px', borderRadius: '18px', border: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '800' }}>আজকের নগদ ক্যাশ</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'grid', placeItems: 'center', fontSize: '16px' }}>
              💵
            </div>
          </div>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            ৳{metrics.cashSales.toLocaleString('en-US')}
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
            ক্যাশ ড্রয়ারে জমা টাকা
          </span>
        </div>

        {/* Box 2: Total Market Due */}
        <div className="ui-card" style={{ padding: '20px', borderRadius: '18px', border: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '800' }}>কাস্টমার মোট বাকি</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fff7ed', color: '#ea580c', display: 'grid', placeItems: 'center', fontSize: '16px' }}>
              📒
            </div>
          </div>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            ৳{metrics.totalMarketDue.toLocaleString('en-US')}
          </div>
          <Link href="/khata" style={{ fontSize: '11.5px', color: '#4f46e5', fontWeight: '800', textDecoration: 'none' }}>
            বাকি খাতা ও WhatsApp তাগাদা ➔
          </Link>
        </div>

        {/* Box 3: Net Profit */}
        <div className="ui-card" style={{ padding: '20px', borderRadius: '18px', border: '1.5px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13.5px', color: '#64748b', fontWeight: '800' }}>আজকের খাঁটি নিট লাভ</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#eef2ff', color: '#4f46e5', display: 'grid', placeItems: 'center', fontSize: '16px' }}>
              💹
            </div>
          </div>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            {activeRoleMode === 'owner' ? `৳${metrics.netProfit.toLocaleString('en-US')}` : '৳••••••'}
          </div>
          <span style={{ fontSize: '11.5px', color: activeRoleMode === 'owner' ? '#64748b' : '#94a3b8', fontWeight: '600' }}>
            {activeRoleMode === 'owner' ? 'সব খরচ বাদে আসল মুনাফা' : '🔒 কর্মচারী মোডে লাভ গোপন'}
          </span>
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  দোকানের প্রধান খাতা ও কার্যক্রম
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>যেখানে ক্লিক করবেন সরাসরি সেই খাতায় কাজ করতে পারবেন</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px'
            }}>
              {[
                { href: '/pos', icon: theme.posIcon, title: theme.posLabel, desc: theme.posDesc },
                { href: '/khata', icon: '📒', title: theme.khataLabel, desc: 'বকেয়া ও তাগাদা এসএমএস' },
                { href: '/stock', icon: theme.stockIcon, title: theme.stockLabel, desc: lowStockCount > 0 ? `${lowStockCount}টি কম স্টক` : 'মজুত পণ্য ও দাম' },
                { href: '/expenses', icon: '💸', title: 'দোকান খরচ', desc: 'চা, ভাড়া ও বিল' },
                { href: '/dealers', icon: '🚚', title: theme.dealerLabel, desc: 'ডিলার দেনা-পাওনা' },
                { href: '/day-end', icon: '🌙', title: 'ক্যাশ মিলানো', desc: 'রাতের ড্রয়ার হিসাব' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="ui-card launcher-card clickable-card"
                  style={{
                    textDecoration: 'none',
                    textAlign: 'center',
                    padding: '18px 14px'
                  }}
                >
                  <div className="launcher-icon-circle">
                    {action.icon}
                  </div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '3px', lineHeight: 1.2 }}>
                    {action.title}
                  </strong>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {action.desc}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="ui-card" style={{ padding: '22px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 3px' }}>
                  🧾 আজকের সাম্প্রতিক ক্যাশ মেমো ও বিক্রয়
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>ক্যাশ ও বাকি বিক্রয়ের রসিদ তালিকা</span>
              </div>
              <Link
                href="/pos"
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '800',
                  textDecoration: 'none'
                }}
              >
                + নতুন মেমো ➔
              </Link>
            </div>

            {loading ? (
              <DataLoader type="table" count={4} text="আজকের বিক্রয় ও মেমো তালিকা লোড হচ্ছে..." />
            ) : recentSales.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 14px', color: '#94a3b8' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>🧾</span>
                <strong style={{ fontSize: '14px', color: '#64748b', display: 'block' }}>আজকে এখনও কোনো মেমো কাটা হয়নি</strong>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                      <th style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>মেমো নং</th>
                      <th style={{ padding: '12px 14px' }}>ক্রেতা</th>
                      <th style={{ padding: '12px 14px' }}>মোট টাকা</th>
                      <th style={{ padding: '12px 14px' }}>পরিশোধ</th>
                      <th style={{ padding: '12px 14px' }}>বকেয়া</th>
                      <th style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0' }}>পেমেন্ট মাধ্যম</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                          #{s.invoiceNo || s.invoice_no || s.id?.slice(0, 6)}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {s.customerName || s.customer_name || 'নগদ ক্রেতা'}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', fontWeight: '900', color: '#0f172a' }}>
                          ৳{Number(s.totalAmount || s.total_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', color: '#059669', fontWeight: '800' }}>
                          ৳{Number(s.paidAmount || s.paid_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td className="num-font" style={{ padding: '12px 14px', color: Number(s.dueAmount || s.due_amount || 0) > 0 ? '#dc2626' : '#94a3b8', fontWeight: '800' }}>
                          ৳{Number(s.dueAmount || s.due_amount || 0).toLocaleString('en-US')}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
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
                  <span>{new Date(selectedInvoice.created_at || new Date()).toLocaleDateString('bn-BD')}</span>
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

    </div>
  );
}
