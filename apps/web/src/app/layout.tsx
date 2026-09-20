'use client';
import './globals.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import PWAInstaller from '../components/PWAInstaller';
import GlobalShortcutsModal from '../components/GlobalShortcutsModal';
import VoiceFieldHUD from '../components/VoiceFieldHUD';
import VoiceAssistant from '../components/VoiceAssistant';
import SpeakerVoiceEnrollModal from '../components/SpeakerVoiceEnrollModal';
import CounterBlackSleepOverlay from '../components/CounterBlackSleepOverlay';
import { getIndustryTheme, normalizeIndustryId } from '../lib/industryConfig';
import { getOfflineOutbox, syncOfflineOutbox } from '../lib/offlineDataLayer';

function HeaderNav({ onOpenMenuDrawer }: { onOpenMenuDrawer: () => void }) {
  const { userRole, tenant, activeRoleMode, currentStaffUser, switchRoleMode, loginWithPin, logout, triggerHaptic, isSoundboxEnabled, toggleSoundbox, isFeatureEnabled, theme: authTheme, toggleTheme, updateActiveTenant } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [showModeModal, setShowModeModal] = useState(false);
  const [showShopSwitchModal, setShowShopSwitchModal] = useState(false);
  const [showVoiceEnrollModal, setShowVoiceEnrollModal] = useState(false);
  const [availableShops, setAvailableShops] = useState<any[]>([]);
  const [pinInput, setPinInput] = useState('');
  const [modeError, setModeError] = useState('');
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);

  // Offline network status and pending sync count
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    setPendingSyncCount(getOfflineOutbox().length);

    const handleOnline = () => {
      setIsOnline(true);
      if (tenant?.id) {
        syncOfflineOutbox(tenant.id);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleOutboxChange = (e: any) => {
      setPendingSyncCount(e.detail?.count ?? getOfflineOutbox().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-outbox-changed', handleOutboxChange);
    window.addEventListener('offline-sync-success', () => setPendingSyncCount(0));

    // Register Service Worker for offline PWA operation
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Periodic sync attempt every 30s
    const syncInterval = setInterval(() => {
      if (navigator.onLine && tenant?.id && getOfflineOutbox().length > 0) {
        syncOfflineOutbox(tenant.id);
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-outbox-changed', handleOutboxChange);
      clearInterval(syncInterval);
    };
  }, [tenant?.id]);

  const activeIndustryId = tenant?.industryId || (tenant as any)?.industry_category_id || (tenant as any)?.industryCategoryId || (tenant as any)?.category_id;
  const theme = getIndustryTheme(activeIndustryId, tenant?.shopName);

  // Load available shops for 1-click shop switching
  useEffect(() => {
    if (showShopSwitchModal) {
      const q = tenant?.phone ? `?phone=${encodeURIComponent(tenant.phone)}` : '';
      fetch(`/api/shops/list${q}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableShops(data);
        })
        .catch(() => {});
    }
  }, [showShopSwitchModal, tenant?.phone]);

  const handleSwitchShop = (targetShop: any) => {
    triggerHaptic('success');
    updateActiveTenant(targetShop);
    setShowShopSwitchModal(false);
    window.location.reload();
  };

  // Load available staff for quick switch suggestions
  useEffect(() => {
    if (tenant?.id && showModeModal) {
      fetch(`/api/staff?tenantId=${tenant.id}`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setAvailableStaff(data); })
        .catch(() => {});
    }
  }, [tenant?.id, showModeModal]);

  const handlePinSubmit = async (enteredPin: string) => {
    if (!enteredPin || enteredPin.length < 4) {
      setModeError('দয়া করে ৪-ডিজিট পিন দিন!');
      return;
    }
    const res = await loginWithPin(enteredPin);
    if (res.success) {
      setShowModeModal(false);
      setPinInput('');
      setModeError('');
    } else {
      setModeError(res.error || 'ভুল পিন নাম্বার!');
    }
  };

  const primaryTabs = [
    { href: '/', label: 'ড্যাশবোর্ড', icon: '🏠', show: true },
    { href: '/calculator', label: 'ক্যালকুলেটর', icon: '🔢', show: true },
    { href: '/pos', label: theme.posLabel, icon: theme.posIcon, show: true },
    { href: '/pos?voice=1', label: 'ভয়েস বিলিং', icon: '🎙️', show: true },
    { href: '/khata', label: theme.khataLabel, icon: '📒', show: isFeatureEnabled('enableCustomerKhata') },
    { href: '/installments', label: 'কিস্তি', icon: '📅', show: isFeatureEnabled('enableInstallments') },
    { href: '/stock', label: theme.stockLabel, icon: theme.stockIcon, show: true },
    { href: '/expiry-tracker', label: 'মেয়াদ রাডার', icon: '⏳', show: normalizeIndustryId(activeIndustryId, tenant?.shopName) === 'cat-pharmacy' || isFeatureEnabled('enableExpiryTracker') },
    { href: '/expenses', label: 'খরচ', icon: '💸', show: true },
    { href: '/dealers', label: theme.dealerLabel, icon: '🚚', show: isFeatureEnabled('enableDealerKhata') },
    { href: '/day-end', label: 'ক্যাশ মিল', icon: '🌙', show: isFeatureEnabled('enableCashDrawer') },
    { href: '/reports', label: theme.reportsLabel, icon: '📊', show: true },
  ].filter(t => t.show);

  return (
    <>
      <header style={{
        background: authTheme === 'dark'
          ? 'rgba(9, 13, 22, 0.96)'
          : 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%)',
        backdropFilter: 'blur(16px)',
        color: '#ffffff',
        borderBottom: authTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: authTheme === 'dark' ? '0 4px 24px -2px rgba(0, 0, 0, 0.65)' : '0 4px 20px -2px rgba(15, 23, 42, 0.28)'
      }}>
        {/* Offline Status & Pending Sync Indicator */}
        {(!isOnline || pendingSyncCount > 0) && (
          <div style={{
            background: !isOnline ? '#065f46' : 'linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)',
            color: '#ecfdf5',
            padding: '4px 14px',
            fontSize: '11px',
            fontWeight: '800',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: !isOnline ? '#4ade80' : '#38bdf8' }} />
              <span>{!isOnline ? '🟢 অফলাইন মোড সক্রিয় (ইন্টারনেট ছাড়াও ১০০% বিক্রয়, স্টক ও খাতা চলবে)' : '✓ অনলাইন মোড সক্রিয়'}</span>
            </div>
            {pendingSyncCount > 0 && (
              <button
                onClick={() => { if (tenant?.id) syncOfflineOutbox(tenant.id); }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                🔄 {pendingSyncCount}টি পেন্ডিং ডাটা সিঙ্ক করুন
              </button>
            )}
          </div>
        )}

        {/* Top Main Bar */}
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '7px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          {/* Left: Hamburger & Shop Name / Logo */}
          <div className="header-shop-container">
            {userRole === 'shopkeeper' && (
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); onOpenMenuDrawer(); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '11px',
                  width: '36px',
                  height: '36px',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '18px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  backdropFilter: 'blur(8px)'
                }}
                title="মেনু ড্রয়ার খুলুন"
              >
                ☰
              </button>
            )}

            {userRole === 'shopkeeper' && tenant ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => { triggerHaptic('light'); setShowShopSwitchModal(true); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    textAlign: 'left',
                    color: 'inherit'
                  }}
                  title="দোকান বা ক্যাটাগরি পরিবর্তন করতে চাপুন"
                >
                  <div style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '11px',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '19px',
                    color: '#4f46e5',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
                    flexShrink: 0
                  }}>
                    {theme.icon}
                  </div>
                  <div className="header-shop-text">
                    <h1 className="header-shop-title" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{tenant.shopName || 'সহজ হিসাব'}</span>
                      <span style={{ fontSize: '9px', opacity: 0.75, color: '#93c5fd' }}>▼</span>
                    </h1>
                    <div className="header-shop-meta">
                      <span className="header-shop-badge">
                        <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', marginRight: '4px', boxShadow: '0 0 4px #4ade80' }}></span>
                        {theme.name}
                      </span>
                      <span className="desktop-only" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                        • {tenant.location || 'বাজার'}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            ) : userRole === 'admin' ? (
              <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ background: '#ffffff', width: '36px', height: '36px', borderRadius: '11px', display: 'grid', placeItems: 'center', fontSize: '19px', color: '#e11d48', flexShrink: 0, boxShadow: '0 3px 10px rgba(0,0,0,0.18)' }}>
                  👑
                </div>
                <div className="header-shop-text">
                  <h1 className="header-shop-title">ShohojHisab</h1>
                  <p className="header-shop-meta" style={{ color: '#fecdd3' }}>সুপার অ্যাডমিন প্ল্যাটফর্ম</p>
                </div>
              </Link>
            ) : (
              <Link href="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ background: '#ffffff', width: '36px', height: '36px', borderRadius: '11px', display: 'grid', placeItems: 'center', fontSize: '19px', color: '#4f46e5', fontWeight: '900', flexShrink: 0, boxShadow: '0 3px 10px rgba(0,0,0,0.18)' }}>
                  S
                </div>
                <div className="header-shop-text">
                  <h1 className="header-shop-title">ShohojHisab</h1>
                  <p className="header-shop-meta">স্মার্ট দোকান সফটওয়্যার</p>
                </div>
              </Link>
            )}
          </div>

          {/* Right: Clean Action Controls */}
          <div className="header-controls">
            {userRole === 'shopkeeper' && (
              <>
                {/* Role Mode Badge ("মালিক" / "স্টাফ") */}
                <button
                  type="button"
                  onClick={() => {
                    setPinInput('');
                    setModeError('');
                    setShowModeModal(true);
                    triggerHaptic('light');
                  }}
                  className={`header-role-btn ${activeRoleMode === 'owner' ? 'owner-mode' : ''}`}
                  title="ক্যাশিয়ার বা ব্যবহারকারী শিফট পরিবর্তন করুন"
                >
                  <span style={{ fontSize: '13px' }}>{activeRoleMode === 'owner' ? '👑' : '👤'}</span>
                  <span>{currentStaffUser && !currentStaffUser.isOwner ? currentStaffUser.name.split(' ')[0] : (activeRoleMode === 'owner' ? 'মালিক' : 'স্টাফ')}</span>
                  <span style={{ fontSize: '8.5px', opacity: 0.8 }}>▼</span>
                </button>

                {/* Soundbox Voice Announcer Toggle */}
                <button
                  type="button"
                  onClick={toggleSoundbox}
                  className="header-icon-btn"
                  style={{
                    background: isSoundboxEnabled
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(79, 70, 229, 0.5) 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: isSoundboxEnabled
                      ? '1px solid rgba(165, 180, 252, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.16)',
                    boxShadow: isSoundboxEnabled ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none'
                  }}
                  title={isSoundboxEnabled ? 'সাউন্ডবক্স চালু (ভয়েস সক্রিয়)' : 'সাউন্ডবক্স বন্ধ'}
                >
                  {isSoundboxEnabled ? '🔊' : '🔈'}
                </button>

                {/* 🎙️ Voice Lock / Speaker Biometrics Global Modal Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowVoiceEnrollModal(true);
                  }}
                  className="header-icon-btn"
                  style={{
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(52, 211, 153, 0.45)',
                    color: '#34d399'
                  }}
                  title="কণ্ঠ রেজিস্টার ও ভয়েস লক ফিল্টার"
                >
                  🎙️
                </button>

                {/* Notification Bell */}
                <Link
                  href="/notifications"
                  className="header-icon-btn"
                  title="বিজ্ঞপ্তি"
                >
                  🔔
                  <span style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#f43f5e',
                    boxShadow: '0 0 4px #f43f5e'
                  }} />
                </Link>

                {/* Instant Dark / Light Mode Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    toggleTheme();
                  }}
                  className="header-icon-btn"
                  style={{
                    background: authTheme === 'dark' ? 'rgba(253, 224, 71, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: authTheme === 'dark' ? '1px solid rgba(253, 224, 71, 0.4)' : '1px solid rgba(255, 255, 255, 0.16)',
                    color: authTheme === 'dark' ? '#fef08a' : '#ffffff',
                  }}
                  title={authTheme === 'dark' ? 'লাইট মোডে ফিরুন (Light Mode)' : 'ডার্ক মোড চালু করুন (Dark Mode)'}
                  aria-label="Toggle Theme Mode"
                >
                  {authTheme === 'dark' ? '☀️' : '🌙'}
                </button>

                {/* Primary Fast POS Button (Desktop Only) */}
                <Link
                  href="/pos"
                  className="desktop-only"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    padding: '7px 16px',
                    borderRadius: '99px',
                    fontSize: '12.5px',
                    fontWeight: '900',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 3px 10px rgba(16, 185, 129, 0.35)',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>⚡</span> POS বিক্রি
                </Link>
              </>
            )}

            {userRole !== 'shopkeeper' && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  toggleTheme();
                }}
                className="header-icon-btn"
                style={{
                  background: authTheme === 'dark' ? 'rgba(253, 224, 71, 0.25)' : 'rgba(255, 255, 255, 0.15)',
                  color: authTheme === 'dark' ? '#fef08a' : '#ffffff',
                  fontSize: '15px'
                }}
                title={authTheme === 'dark' ? 'লাইট মোডে ফিরুন' : 'ডার্ক মোড চালু করুন'}
              >
                {authTheme === 'dark' ? '☀️' : '🌙'}
              </button>
            )}

            {userRole === 'admin' && (
              <button
                onClick={logout}
                style={{
                  background: '#fee2e2',
                  color: '#be123c',
                  border: '1px solid #fecaca',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                🚪 লগআউট
              </button>
            )}
          </div>
        </div>

        {/* Secondary Clean Horizontal Sub-Nav (Desktop/Tablet Only) */}
        {userRole === 'shopkeeper' && (
          <div className="desktop-nav-menu" style={{
            background: authTheme === 'dark' ? '#0d1424' : '#f8fafc',
            borderTop: authTheme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
            padding: '0 18px'
          }}>
            <div style={{
              maxWidth: '1280px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflowX: 'auto'
            }}>
              {primaryTabs.map(item => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      padding: '9px 14px',
                      fontSize: '13px',
                      fontWeight: active ? '800' : '600',
                      color: active ? (authTheme === 'dark' ? '#818cf8' : theme.primaryColor) : (authTheme === 'dark' ? '#94a3b8' : '#475569'),
                      textDecoration: 'none',
                      borderBottom: active ? `2.5px solid ${authTheme === 'dark' ? '#818cf8' : theme.primaryColor}` : '2.5px solid transparent',
                      background: active ? (authTheme === 'dark' ? '#131b2e' : '#ffffff') : 'transparent',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '15px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Role Mode & Fast Cashier Switch Modal (Rendered outside header to avoid backdrop-filter trapping) */}
      {showModeModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'backdropFadeIn 0.2s ease-out'
        }}>
          {/* Click outside backdrop to close */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowModeModal(false)} />

          <div style={{
            position: 'relative',
            background: authTheme === 'dark' ? '#111827' : '#ffffff',
            color: authTheme === 'dark' ? '#f8fafc' : '#0f172a',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            border: authTheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.06)',
            animation: 'modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: authTheme === 'dark' ? '#ffffff' : '#0f172a' }}>
                  🔄 ক্যাশিয়ার / স্টাফ সুইচ
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: authTheme === 'dark' ? '#94a3b8' : '#64748b' }}>
                  বর্তমান: <strong style={{ color: '#6366f1' }}>{currentStaffUser?.name || (activeRoleMode === 'owner' ? 'দোকান মালিক' : 'কর্মচারী')}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowModeModal(false)}
                style={{
                  background: authTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                  color: authTheme === 'dark' ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '14px',
                  transition: 'all 0.15s ease'
                }}
                title="বন্ধ করুন"
              >✕</button>
            </div>

            {modeError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', marginBottom: '14px', border: '1px solid #fecaca' }}>
                ⚠️ {modeError}
              </div>
            )}

            {/* 4-Digit PIN Input for Instant Switch */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: authTheme === 'dark' ? '#cbd5e1' : '#334155', marginBottom: '6px' }}>
                মালিক বা কর্মচারীর ৪-ডিজিট পিন (PIN) দিন:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="num-font"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: authTheme === 'dark' ? '1.5px solid #374151' : '1.5px solid #cbd5e1',
                    fontSize: '18px',
                    letterSpacing: '4px',
                    outline: 'none',
                    background: authTheme === 'dark' ? '#1f2937' : '#f8fafc',
                    color: authTheme === 'dark' ? '#ffffff' : '#0f172a',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePinSubmit(pinInput);
                  }}
                />
                <button
                  onClick={() => handlePinSubmit(pinInput)}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '0 18px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
                  }}
                >
                  প্রবেশ
                </button>
              </div>
            </div>

            {/* Quick Staff Shift Switcher List */}
            {availableStaff.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: '800', color: authTheme === 'dark' ? '#94a3b8' : '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ ১-ক্লিকে শিফট পরিবর্তন:
                </div>
                <div style={{ display: 'grid', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
                  {/* Owner Option */}
                  <button
                    onClick={() => handlePinSubmit('1234')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: activeRoleMode === 'owner'
                        ? (authTheme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#eef2ff')
                        : (authTheme === 'dark' ? '#1f2937' : '#f8fafc'),
                      border: activeRoleMode === 'owner'
                        ? '1.5px solid #6366f1'
                        : (authTheme === 'dark' ? '1px solid #374151' : '1px solid #e2e8f0'),
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>👑</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: authTheme === 'dark' ? '#ffffff' : '#0f172a' }}>দোকান মালিক (Owner)</div>
                        <div style={{ fontSize: '11px', color: authTheme === 'dark' ? '#94a3b8' : '#64748b' }}>সম্পূর্ণ এক্সেস ও নিট লাভ</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#6366f1' }}>PIN: 1234</span>
                  </button>

                  {/* Registered Staff Members */}
                  {availableStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => handlePinSubmit(staff.pin)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: currentStaffUser?.id === staff.id
                          ? (authTheme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7')
                          : (authTheme === 'dark' ? '#1f2937' : '#f8fafc'),
                        border: currentStaffUser?.id === staff.id
                          ? '1.5px solid #16a34a'
                          : (authTheme === 'dark' ? '1px solid #374151' : '1px solid #e2e8f0'),
                        borderRadius: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>
                          {staff.role === 'cashier' ? '🛒' : staff.role === 'manager' ? '💼' : staff.role === 'pharmacist' ? '💊' : '👔'}
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: authTheme === 'dark' ? '#ffffff' : '#0f172a' }}>{staff.name}</div>
                          <div style={{ fontSize: '11px', color: authTheme === 'dark' ? '#94a3b8' : '#64748b' }}>
                            {staff.role === 'cashier' ? 'ক্যাশিয়ার' : staff.role === 'manager' ? 'ম্যানেজার' : staff.role === 'pharmacist' ? 'ফার্মাসিস্ট' : 'সেলসম্যান'}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#16a34a' }} className="num-font">PIN: {staff.pin}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Link to Staff Management */}
            <Link
              href="/staff"
              onClick={() => setShowModeModal(false)}
              style={{
                display: 'block',
                textAlign: 'center',
                background: authTheme === 'dark' ? '#1f2937' : '#f1f5f9',
                color: authTheme === 'dark' ? '#818cf8' : '#4f46e5',
                padding: '11px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: '800',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
            >
              👥 সকল কর্মচারী ও পারমিশন ম্যানেজ করুন →
            </Link>
          </div>
        </div>
      )}

      {/* 🏬 Multi-Shop Instant Switcher Modal */}
      {showShopSwitchModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          animation: 'backdropFadeIn 0.2s ease-out'
        }}>
          {/* Backdrop click outside to close */}
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowShopSwitchModal(false)} />

          <div style={{
            position: 'relative',
            background: authTheme === 'dark' ? '#1e293b' : '#ffffff',
            color: authTheme === 'dark' ? '#ffffff' : '#0f172a',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            border: authTheme === 'dark' ? '1px solid #334155' : '1px solid rgba(0, 0, 0, 0.06)',
            animation: 'modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>
                  🏬 দোকান ও ক্যাটাগরি সুইচ
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  বর্তমান: <strong style={{ color: '#6366f1' }}>{tenant?.shopName}</strong> ({theme.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShopSwitchModal(false)}
                style={{
                  background: authTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'inherit',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px', maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
              {availableShops.map((s) => {
                const sTheme = getIndustryTheme(s.industryId, s.shopName);
                const isCurrent = s.id === tenant?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSwitchShop(s)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      background: isCurrent
                        ? (authTheme === 'dark' ? 'rgba(99, 102, 241, 0.25)' : '#eef2ff')
                        : (authTheme === 'dark' ? '#0f172a' : '#f8fafc'),
                      border: isCurrent
                        ? '1.5px solid #6366f1'
                        : (authTheme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0'),
                      borderRadius: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'inherit',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>{sTheme.icon}</span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800' }}>{s.shopName}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {sTheme.name} • {s.location || 'বাজার'}
                        </div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span style={{ fontSize: '11px', background: '#4f46e5', color: '#fff', padding: '3px 8px', borderRadius: '99px', fontWeight: '800' }}>
                        সক্রিয়
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        সুইচ →
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                href="/settings"
                onClick={() => setShowShopSwitchModal(false)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4f46e5',
                  padding: '9px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '800',
                  textDecoration: 'none'
                }}
              >
                ⚙️ ক্যাটাগরি বদলান
              </Link>
              <Link
                href="/setup"
                onClick={() => setShowShopSwitchModal(false)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: '#4f46e5',
                  color: '#fff',
                  padding: '9px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '800',
                  textDecoration: 'none'
                }}
              >
                ➕ নতুন দোকান
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 🎙️ Global Speaker Voice Enroll & TV Noise Shield Modal */}
      {showVoiceEnrollModal && (
        <SpeakerVoiceEnrollModal
          isOpen={showVoiceEnrollModal}
          onClose={() => setShowVoiceEnrollModal(false)}
        />
      )}
    </>
  );
}

function ScreenLockOverlay() {
  const { isScreenLocked, unlockScreen, triggerHaptic } = useAuth();
  const [pinDigits, setPinDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isScreenLocked) return null;

  const handleDigit = (digit: string) => {
    triggerHaptic('light');
    if (pinDigits.length < 6) {
      const next = pinDigits + digit;
      setPinDigits(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (unlockScreen(next)) {
            setPinDigits('');
            setErrorMsg('');
          } else {
            setErrorMsg('ভুল পিন!');
            setPinDigits('');
          }
        }, 150);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#0f172a',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      color: '#fff'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '28px',
          margin: '0 auto 12px'
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px' }}>কাউন্টার লক করা</h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>৪-ডিজিটের পিন দিয়ে আনলক করুন</p>

        {/* PIN Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: pinDigits.length > i ? '#10b981' : 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.4)',
              transition: 'background 0.15s ease'
            }} />
          ))}
        </div>

        {errorMsg && (
          <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>
            {errorMsg}
          </div>
        )}

        {/* Keypad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(btn => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') {
                  setPinDigits('');
                  setErrorMsg('');
                } else if (btn === '⌫') {
                  setPinDigits(prev => prev.slice(0, -1));
                } else {
                  handleDigit(btn);
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                fontSize: '20px',
                fontWeight: '700',
                padding: '14px',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Full Menu Drawer (Clean Categorized Grid) */
/* ==========================================================================
   HISABPATI-STYLE SIDE MENU DRAWER (Left Slide-in matching Screenshot 1)
   ========================================================================== */
function SideMenuDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { tenant, isFeatureEnabled, logout, theme: authTheme } = useAuth();
  const pathname = usePathname();
  const theme = getIndustryTheme(tenant?.industryId);

  if (!isOpen) return null;

  const menuItems = [
    { href: '/calculator', label: 'ক্যালকুলেটর কুইক সেল', icon: '🔢', iconBg: '#ecfdf5', iconColor: '#059669', badge: 'হট' },
    { href: '/pos?voice=1', label: 'ভয়েস মেমো ও বিলিং', icon: '🎙️', iconBg: '#eff6ff', iconColor: '#2563eb', badge: 'স্মার্ট' },
    { href: '/pos', label: 'বিক্রয় (POS কাউন্টার)', icon: '🛒', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/khata', label: 'বাকির হিসাব (গ্রাহক খাতা)', icon: '📒', iconBg: '#ffedd5', iconColor: '#ea580c', badge: 'জরুরি', show: isFeatureEnabled('enableCustomerKhata') },
    { href: '/installments', label: 'বাকির কিস্তি', icon: '📅', iconBg: '#e0e7ff', iconColor: '#4338ca', badge: 'কিস্তি', show: isFeatureEnabled('enableInstallments') },
    { href: '/dealers', label: 'ক্রয় (ডিলার চালান)', icon: '🛍️', iconBg: '#eef2ff', iconColor: '#4f46e5', show: isFeatureEnabled('enableDealerKhata') },
    { href: '/expenses', label: 'ব্যয় / দৈনিক খরচ', icon: '💸', iconBg: '#fef2f2', iconColor: '#dc2626' },
    { href: '/stock', label: 'পণ্য (স্টক ইনভেন্টরি)', icon: '📦', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/day-end', label: 'ক্যাশ মিলানো ও ড্রয়ার', icon: '🌙', iconBg: '#f0fdf4', iconColor: '#16a34a', show: isFeatureEnabled('enableCashDrawer') },
    { href: '/staff', label: 'কর্মচারী ও পারমিশন (Staff)', icon: '👥', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'টিম' },
    { href: '/branches', label: 'দোকানের শাখা (Branches)', icon: '🏢', iconBg: '#eef2ff', iconColor: '#4f46e5', show: isFeatureEnabled('enableMultiBranch') },
    { href: '/expiry-tracker', label: 'মেয়াদোত্তীর্ণ রাডার (Expiry)', icon: '⏳', iconBg: '#fee2e2', iconColor: '#b91c1c', show: normalizeIndustryId(tenant?.industryId) === 'cat-pharmacy' || isFeatureEnabled('enableExpiryTracker') },
    { href: '/reports', label: 'রিপোর্টস ও লাভ-ক্ষতি', icon: '📊', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/subscription', label: 'প্যাকেজ ও সাবস্ক্রিপশন', icon: '💳', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'প্যাকেজ' },
    { href: '/settings', label: 'দোকানের সেটিংস', icon: '⚙️', iconBg: '#f1f5f9', iconColor: '#475569' },
    { href: '/support', label: 'হেল্প এন্ড সাপোর্ট', icon: '🎧', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/tutorials', label: 'টিউটোরিয়াল ভিডিও', icon: '🎬', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'ভিডিও' },
    { href: '/voice-guide', label: 'ভয়েস নির্দেশিকা (কমান্ড গাইড)', icon: '🎙️', iconBg: '#ecfdf5', iconColor: '#059669', badge: 'এআই' },
  ];


  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 150,
      display: 'flex',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Click outside backdrop to close */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Left Drawer Container */}
      <div style={{
        position: 'relative',
        width: '310px',
        maxWidth: '85vw',
        height: '100%',
        background: authTheme === 'dark' ? '#090d16' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: authTheme === 'dark' ? '8px 0 30px rgba(0,0,0,0.6)' : '8px 0 30px rgba(0,0,0,0.25)',
        zIndex: 2,
        overflowY: 'auto'
      }}>
        {/* Modern Glassmorphic Indigo Header */}
        <div style={{
          background: authTheme === 'dark'
            ? 'linear-gradient(145deg, #090d16 0%, #111827 50%, #1e1b4b 100%)'
            : 'linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          padding: '20px 18px 16px',
          textAlign: 'center',
          position: 'relative',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Frosted Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              color: '#ffffff',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 0.15s ease'
            }}
            title="মেনু বন্ধ করুন"
          >
            ✕
          </button>

          {/* Avatar with Edit Badge */}
          <div style={{ position: 'relative', width: '52px', height: '52px', margin: '0 auto 10px' }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: '2px solid rgba(255, 255, 255, 0.35)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px',
              color: '#ffffff',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)'
            }}>
              🏪
            </div>
            <Link
              href="/settings"
              onClick={onClose}
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                background: '#ffffff',
                color: '#4f46e5',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '10px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                textDecoration: 'none'
              }}
              title="দোকান প্রোফাইল এডিট"
            >
              ✏️
            </Link>
          </div>

          <h3 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.2px' }}>
            {tenant?.shopName || 'আমার ডিজিটাল দোকান'}
          </h3>
          <p style={{ margin: '0 0 8px', fontSize: '11.5px', color: '#c7d2fe', fontWeight: '600' }}>
            📱 {tenant?.phone || '০১৯৮৬২৩৩২৩৪'}
          </p>

          {/* Shop Switcher Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255, 255, 255, 0.16)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: '99px',
            fontSize: '11px',
            fontWeight: '800'
          }}>
            <span>{tenant?.shopName || 'মূল দোকান শাখা'}</span>
            <span style={{ fontSize: '9px', opacity: 0.8 }}>▼</span>
          </div>
        </div>

        {/* Scrollable Menu Items (Tighter, Ergonomic Spacing) */}
        <div style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {menuItems.filter(item => item.show !== false).map((item, idx) => {
            const active = pathname === item.href;
            return (
              <Link
                key={idx}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  background: active ? (authTheme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#f5f3ff') : 'transparent',
                  border: active ? '1px solid #c7d2fe' : '1px solid transparent',
                  transition: 'all 0.12s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: item.iconBg,
                    color: item.iconColor,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '15px',
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: active ? '800' : '650', color: active ? '#4f46e5' : (authTheme === 'dark' ? '#f1f5f9' : '#1e293b') }}>
                    {item.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {item.badge && (
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: '800',
                      padding: '1px 6px',
                      borderRadius: '5px',
                      background: item.badge === 'নতুন' ? '#ecfdf5' : '#fee2e2',
                      color: item.badge === 'নতুন' ? '#059669' : '#dc2626'
                    }}>
                      {item.badge}
                    </span>
                  )}
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>›</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Sticky Drawer Footer with Subscription & App Version */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>বর্তমান প্যাকেজ</span>
              <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>⚡ Pro / লাইফটাইম</strong>
            </div>
            <Link
              href="/settings"
              onClick={onClose}
              style={{
                background: '#5b50e6',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(91, 80, 230, 0.3)'
              }}
            >
              সাবস্ক্রাইব
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#94a3b8', marginBottom: '10px' }}>
            <strong style={{ color: '#059669' }}>ShohojHisab (সহজ হিসাব)</strong>
            <span>v1.0 • অফলাইন ফার্স্ট</span>
          </div>

          <button
            onClick={() => { onClose(); logout(); }}
            style={{
              width: '100%',
              padding: '9px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12.5px',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            🚪 লগআউট
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   HISABPATI-STYLE BOTTOM ACTION SHEET (Slide-up Action Center matching Screenshot 3)
   ========================================================================== */
function ActionSheetModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { triggerHaptic, isFeatureEnabled } = useAuth();
  const router = useRouter();

  if (!isOpen) return null;

  const handleAction = (href: string) => {
    triggerHaptic('medium');
    onClose();
    router.push(href);
  };

  const handleTriggerVoice = () => {
    triggerHaptic('medium');
    onClose();
    // Dispatch event to activate voice assistant
    window.dispatchEvent(new CustomEvent('trigger-voice-assistant'));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 140,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Click backdrop to close */}
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />

      {/* Bottom Sheet Modal Body */}
      <div style={{
        position: 'relative',
        background: '#ffffff',
        borderTopLeftRadius: '28px',
        borderTopRightRadius: '28px',
        padding: '16px 20px 32px',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.25)',
        zIndex: 2,
        animation: 'slideUp 0.25s ease-out'
      }}>
        {/* Top Drag Pill */}
        <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: '#cbd5e1', margin: '0 auto 20px' }} />

        {/* Section 1: বিক্রয় */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
            <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#5b50e6', letterSpacing: '0.3px' }}>
              বিক্রয়
            </span>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            {/* 1. ক্যালকুলেটর সেল */}
            <button
              onClick={() => handleAction('/calculator')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)'
              }}>
                🔢
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ক্যালকুলেটর</span>
            </button>

            {/* 2. ভয়েস মেমো */}
            <button
              onClick={() => handleAction('/pos?voice=1')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#eff6ff',
                color: '#4f46e5',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)'
              }}>
                🎙️
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ভয়েস</span>
            </button>

            {/* 3. ক্যাটালগ POS */}
            <button
              onClick={() => handleAction('/pos')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#f8fafc',
                color: '#3b82f6',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.12)'
              }}>
                📦
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ক্যাটালগ</span>
            </button>

            {/* 2. বিক্রি রিটার্ন */}
            <button
              onClick={() => handleAction('/reports')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#fdf2f8',
                color: '#ec4899',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.12)'
              }}>
                🛍️
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>রিটার্ন</span>
            </button>

            {/* 3. বাকি আদায় */}
            {isFeatureEnabled('enableCustomerKhata') && (
              <button
                onClick={() => handleAction('/khata')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                className="clickable-card"
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: '#fff7ed',
                  color: '#ea580c',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '24px',
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.12)'
                }}>
                  🤲
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>বাকি আদায়</span>
              </button>
            )}

            {/* 4. কিস্তি আদায় */}
            {isFeatureEnabled('enableInstallments') && (
              <button
                onClick={() => handleAction('/installments')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                className="clickable-card"
              >
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '24px',
                  boxShadow: '0 2px 8px rgba(67, 56, 202, 0.12)'
                }}>
                  📅
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>বাকির কিস্তি</span>
              </button>
            )}
          </div>
        </div>

        {/* Section 2: ক্রয় */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
            <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#5b50e6', letterSpacing: '0.3px' }}>
              ক্রয়
            </span>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            {/* 1. ক্রয় */}
            <button
              onClick={() => handleAction('/dealers')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)'
              }}>
                🛒
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ক্রয়</span>
            </button>

            {/* 2. ক্রয় রিটার্ন */}
            <button
              onClick={() => handleAction('/dealers')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#ecfdf5',
                color: '#059669',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.12)'
              }}>
                🔄
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ক্রয় রিটার্ন</span>
            </button>

            {/* 3. বাকি পরিশোধ */}
            <button
              onClick={() => handleAction('/dealers')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.12)'
              }}>
                💸
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>বাকি পরিশোধ</span>
            </button>
          </div>
        </div>

        {/* Section 3: অর্ডার */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
            <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#5b50e6', letterSpacing: '0.3px' }}>
              অর্ডার
            </span>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            {/* 1. বিক্রয় অর্ডার */}
            <button
              onClick={() => handleAction('/pos')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#eff6ff',
                color: '#3b82f6',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.12)'
              }}>
                📋
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>বিক্রয় অর্ডার</span>
            </button>

            {/* 2. ক্রয় অর্ডার */}
            <button
              onClick={() => handleAction('/dealers')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#fefce8',
                color: '#ca8a04',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(202, 138, 4, 0.12)'
              }}>
                📝
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ক্রয় অর্ডার</span>
            </button>

            {/* 3. খালি বা স্টক তালিকা */}
            <button
              onClick={() => handleAction('/stock')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#f8fafc',
                color: '#64748b',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px'
              }}>
                🏷️
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>স্টক ফর্দ</span>
            </button>
          </div>
        </div>

        {/* Section 4: অন্যান্য */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
            <span style={{ fontSize: '13.5px', fontWeight: '900', color: '#5b50e6', letterSpacing: '0.3px' }}>
              অন্যান্য
            </span>
            <div style={{ flex: 1, borderBottom: '1.5px dotted #c7d2fe' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            {/* 1. লাভ/ক্ষতি */}
            <button
              onClick={() => handleAction('/reports')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#eff6ff',
                color: '#4f46e5',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.12)'
              }}>
                📊
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>লাভ/ক্ষতি</span>
            </button>

            {/* 2. ক্যাশ মিলাই */}
            <button
              onClick={() => handleAction('/day-end')}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.12)'
              }}>
                ⚖️
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>ক্যাশ মিলাই</span>
            </button>

            {/* 3. ভয়েস হিসাব */}
            <button
              onClick={handleTriggerVoice}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '4px'
              }}
              className="clickable-card"
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
              }}>
                🎙️
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626' }}>ভয়েস হিসাব</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ==========================================================================
   SMART 5-TAB MOBILE BOTTOM DOCK (Clean SVG Icons & Crisp Contrast)
   ========================================================================== */
function BottomMobileNav({ onOpenActionSheet }: { onOpenActionSheet: () => void }) {
  const { userRole, triggerHaptic, theme: authTheme, isFeatureEnabled } = useAuth();
  const pathname = usePathname();
  if (userRole !== 'shopkeeper') return null;

  const isDark = authTheme === 'dark';
  const showKhata = isFeatureEnabled('enableCustomerKhata');
  const showInstallments = isFeatureEnabled('enableInstallments');

  // Second Tab destination based on active modules
  const tab2 = showKhata ? {
    href: '/khata',
    label: 'খাতা',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/khata' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  } : (showInstallments ? {
    href: '/installments',
    label: 'কিস্তি',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/installments' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  } : {
    href: '/expenses',
    label: 'খরচ',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/expenses' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    )
  });

  return (
    <nav className="mobile-bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: isDark ? '#131b2e' : '#ffffff',
      borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 6px 12px',
      zIndex: 90,
      boxShadow: isDark ? '0 -4px 20px rgba(0,0,0,0.5)' : '0 -4px 20px rgba(0,0,0,0.06)'
    }}>
      {/* 1. Home */}
      <Link
        href="/"
        onClick={() => triggerHaptic('light')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          textDecoration: 'none',
          padding: '4px 10px',
          color: pathname === '/' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: pathname === '/' ? '900' : '700' }}>হোম</span>
      </Link>

      {/* 2. Khata or Installments */}
      <Link
        href={tab2.href}
        onClick={() => triggerHaptic('light')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          textDecoration: 'none',
          padding: '4px 10px',
          color: pathname === tab2.href ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')
        }}
      >
        {tab2.icon}
        <span style={{ fontSize: '11px', fontWeight: pathname === tab2.href ? '900' : '700' }}>{tab2.label}</span>
      </Link>

      {/* 3. Center Elevated Plus Button */}
      <button
        type="button"
        onClick={() => { triggerHaptic('medium'); onOpenActionSheet(); }}
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          border: isDark ? '3px solid #131b2e' : '3px solid #ffffff',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          marginTop: '-24px',
          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.45)',
          flexShrink: 0
        }}
        title="নতুন হিসাব বা বিক্রি যুক্ত করুন"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* 4. Stock */}
      <Link
        href="/stock"
        onClick={() => triggerHaptic('light')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          textDecoration: 'none',
          padding: '4px 10px',
          color: pathname === '/stock' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/stock' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: pathname === '/stock' ? '900' : '700' }}>স্টক</span>
      </Link>

      {/* 5. POS Sale */}
      <Link
        href="/pos"
        onClick={() => triggerHaptic('light')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          textDecoration: 'none',
          padding: '4px 10px',
          color: pathname === '/pos' ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b')
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/pos' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: pathname === '/pos' ? '900' : '700' }}>বিক্রি</span>
      </Link>
    </nav>
  );
}

function BackendHealthBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (e) {
      setIsOffline(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 12000);
    window.addEventListener('focus', checkHealth);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkHealth);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
      color: '#fff',
      padding: '8px 16px',
      fontSize: '13px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      zIndex: 99999,
      position: 'sticky',
      top: 0,
      boxShadow: '0 2px 10px rgba(220, 38, 38, 0.4)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span>
          <strong>ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে!</strong> খাতা থেকে কাস্টমার ডিলিট বা স্টকে নতুন মাল তোলার জন্য টার্মিনালে <code>npm run dev</code> বা <code>npm run dev:api</code> চালু রাখুন।
        </span>
      </div>
      <button
        type="button"
        onClick={checkHealth}
        disabled={checking}
        style={{
          background: '#fff',
          color: '#b91c1c',
          border: 'none',
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: '800',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {checking ? 'চেক হচ্ছে...' : '🔄 পুনরায় চেক'}
      </button>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const dummy = new AudioCtx();
          if (dummy.state === 'suspended') dummy.resume().catch(() => {});
        }
        if ('speechSynthesis' in window) {
          window.speechSynthesis.getVoices();
        }
      } catch (e) {}
    };

    window.addEventListener('click', unlockAudio, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  }, []);

  return (
    <html lang="bn">
      <head>
        <title>ShohojHisab (সহজ হিসাব) - স্মার্ট দোকান ও ব্যবসা সফটওয়্যার</title>
        <meta name="description" content="দোকানদারদের জন্য সহজ, দ্রুত ও নির্ভরযোগ্য ডিজিটাল হিসাব খাতা এবং POS সফটওয়্যার।" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#059669" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ShohojHisab" />
      </head>
      <body style={{ margin: 0, fontFamily: 'var(--font-sans)' }}>
        <AuthProvider>
          <BackendHealthBanner />
          <PWAInstaller />
          <ScreenLockOverlay />
          <HeaderNav onOpenMenuDrawer={() => setIsMenuDrawerOpen(true)} />
          <main style={{ minHeight: 'calc(100vh - 130px)', paddingBottom: '80px' }}>
            {children}
          </main>
          <GlobalShortcutsModal />
          <BottomMobileNav onOpenActionSheet={() => setIsActionSheetOpen(true)} />
          <SideMenuDrawer isOpen={isMenuDrawerOpen} onClose={() => setIsMenuDrawerOpen(false)} />
          <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setIsActionSheetOpen(false)} />
          <VoiceFieldHUD />
          <VoiceAssistant />
          <CounterBlackSleepOverlay />
        </AuthProvider>
      </body>
    </html>
  );
}
