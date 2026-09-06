'use client';
import './globals.css';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import PWAInstaller from '../components/PWAInstaller';
import GlobalShortcutsModal from '../components/GlobalShortcutsModal';
import { getIndustryTheme } from '../lib/industryConfig';

function HeaderNav({ onOpenMenuDrawer }: { onOpenMenuDrawer: () => void }) {
  const { userRole, tenant, activeRoleMode, currentStaffUser, switchRoleMode, loginWithPin, logout, triggerHaptic, isSoundboxEnabled, toggleSoundbox, isFeatureEnabled } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [showModeModal, setShowModeModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [modeError, setModeError] = useState('');
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);

  const theme = getIndustryTheme(tenant?.industryId);

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
    { href: '/pos', label: theme.posLabel, icon: theme.posIcon, show: true },
    { href: '/khata', label: theme.khataLabel, icon: '📒', show: true },
    { href: '/stock', label: theme.stockLabel, icon: theme.stockIcon, show: true },
    { href: '/expiry-tracker', label: 'মেয়াদ রাডার', icon: '⏳', show: tenant?.industryId === 'cat-pharmacy' || isFeatureEnabled('enableExpiryTracker') },
    { href: '/expenses', label: 'দোকান খরচ', icon: '💸', show: true },
    { href: '/installments', label: 'কিস্তি খাতা', icon: '📅', show: isFeatureEnabled('enableInstallments') },
    { href: '/dealers', label: theme.dealerLabel, icon: '🚚', show: isFeatureEnabled('enableDealerKhata') },
    { href: '/day-end', label: 'ক্যাশ মিলানো', icon: '🌙', show: isFeatureEnabled('enableCashDrawer') },
    { href: '/reports', label: theme.reportsLabel, icon: '📊', show: true },
  ].filter(t => t.show);

  return (
    <header style={{
      background: 'linear-gradient(135deg, #5b50e6 0%, #4338ca 100%)',
      color: '#ffffff',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 2px 10px rgba(91, 80, 230, 0.2)'
    }}>
      {/* Top Main Bar */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Left: Hamburger & Shop Name / Logo */}
        <div className="header-shop-container">
          {userRole === 'shopkeeper' && (
            <button
              type="button"
              onClick={() => { triggerHaptic('light'); onOpenMenuDrawer(); }}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '19px',
                color: '#ffffff',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s ease'
              }}
              title="মেনু ড্রয়ার খুলুন"
            >
              ☰
            </button>
          )}

          {userRole === 'shopkeeper' && tenant ? (
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                background: '#ffffff',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '18px',
                color: '#4f46e5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                {theme.icon}
              </div>
              <div className="header-shop-text">
                <h1 className="header-shop-title">
                  {tenant.shopName || 'সহজ হিসাব'}
                </h1>
                <p className="header-shop-meta">
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700', marginRight: '3px' }}>
                    {theme.name}
                  </span>
                  <span className="desktop-only">• {tenant.location || 'বাজার'}</span>
                </p>
              </div>
            </Link>
          ) : userRole === 'admin' ? (
            <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ background: '#ffffff', width: '34px', height: '34px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontSize: '18px', color: '#e11d48', flexShrink: 0 }}>
                👑
              </div>
              <div className="header-shop-text">
                <h1 className="header-shop-title">ShohojHisab</h1>
                <p className="header-shop-meta" style={{ color: '#fecdd3' }}>সুপার অ্যাডমিন প্ল্যাটফর্ম</p>
              </div>
            </Link>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <div style={{ background: '#ffffff', width: '34px', height: '34px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontSize: '18px', color: '#4f46e5', fontWeight: '900', flexShrink: 0 }}>
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
              {/* Role Mode Badge */}
              <button
                onClick={() => {
                  setPinInput('');
                  setModeError('');
                  setShowModeModal(true);
                  triggerHaptic('light');
                }}
                className="header-role-btn"
                style={{
                  background: activeRoleMode === 'owner' ? 'rgba(255, 255, 255, 0.22)' : '#fef3c7',
                  color: activeRoleMode === 'owner' ? '#ffffff' : '#92400e',
                }}
                title="ক্যাশিয়ার বা ব্যবহারকারী শিফট পরিবর্তন করুন"
              >
                <span>{activeRoleMode === 'owner' ? '👑' : '👤'}</span>
                <span>{currentStaffUser && !currentStaffUser.isOwner ? currentStaffUser.name.split(' ')[0] : (activeRoleMode === 'owner' ? 'মালিক' : 'স্টাফ')}</span>
                <span style={{ fontSize: '9px', opacity: 0.8 }}>▼</span>
              </button>

              {/* Soundbox Voice Announcer Toggle */}
              <button
                onClick={toggleSoundbox}
                className="header-icon-btn"
                style={{
                  background: isSoundboxEnabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.12)',
                }}
                title={isSoundboxEnabled ? 'সাউন্ডবক্স চালু' : 'সাউন্ডবক্স বন্ধ'}
              >
                {isSoundboxEnabled ? '🔊' : '🔈'}
              </button>

              {/* Notification Bell */}
              <Link
                href="/notifications"
                className="header-icon-btn"
                title="বিজ্ঞপ্তি"
              >
                🔔
              </Link>

              {/* Primary Fast POS Button (Desktop Only) */}
              <Link
                href="/pos"
                className="desktop-only"
                style={{
                  background: '#ffffff',
                  color: '#4f46e5',
                  padding: '6px 14px',
                  borderRadius: '99px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  flexShrink: 0
                }}
              >
                <span>⚡</span> POS বিক্রি
              </Link>
            </>
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
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
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
                    color: active ? theme.primaryColor : '#475569',
                    textDecoration: 'none',
                    borderBottom: active ? `2.5px solid ${theme.primaryColor}` : '2.5px solid transparent',
                    background: active ? '#ffffff' : 'transparent',
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

      {/* Role Mode & Fast Cashier Switch Modal */}
      {showModeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                  🔄 ক্যাশিয়ার / স্টাফ সুইচ
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                  বর্তমান: <strong style={{ color: '#4f46e5' }}>{currentStaffUser?.name || (activeRoleMode === 'owner' ? 'দোকান মালিক' : 'কর্মচারী')}</strong>
                </p>
              </div>
              <button onClick={() => setShowModeModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            {modeError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>
                ⚠️ {modeError}
              </div>
            )}

            {/* 4-Digit PIN Input for Instant Switch */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
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
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '18px',
                    letterSpacing: '4px',
                    outline: 'none',
                    background: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePinSubmit(pinInput);
                  }}
                />
                <button
                  onClick={() => handlePinSubmit(pinInput)}
                  style={{
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    padding: '0 16px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  প্রবেশ
                </button>
              </div>
            </div>

            {/* Quick Staff Shift Switcher List */}
            {availableStaff.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                  ⚡ ১-ক্লিকে শিফট পরিবর্তন:
                </div>
                <div style={{ display: 'grid', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {/* Owner Option */}
                  <button
                    onClick={() => handlePinSubmit('1234')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: activeRoleMode === 'owner' ? '#eef2ff' : '#f8fafc',
                      border: activeRoleMode === 'owner' ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>👑</span>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>দোকান মালিক (Owner)</div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>সম্পূর্ণ এক্সেস ও নিট লাভ</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5' }}>PIN: 1234</span>
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
                        padding: '8px 12px',
                        background: currentStaffUser?.id === staff.id ? '#dcfce7' : '#f8fafc',
                        border: currentStaffUser?.id === staff.id ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>
                          {staff.role === 'cashier' ? '🛒' : staff.role === 'manager' ? '💼' : staff.role === 'pharmacist' ? '💊' : '👔'}
                        </span>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>{staff.name}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {staff.role === 'cashier' ? 'ক্যাশিয়ার' : staff.role === 'manager' ? 'ম্যানেজার' : staff.role === 'pharmacist' ? 'ফার্মাসিস্ট' : 'সেলসম্যান'}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a' }} className="num-font">PIN: {staff.pin}</span>
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
                background: '#f1f5f9',
                color: '#4f46e5',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: '800',
                textDecoration: 'none'
              }}
            >
              👥 সকল কর্মচারী ও পারমিশন ম্যানেজ করুন →
            </Link>
          </div>
        </div>
      )}
    </header>
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
  const { tenant, isFeatureEnabled, logout } = useAuth();
  const pathname = usePathname();
  const theme = getIndustryTheme(tenant?.industryId);

  if (!isOpen) return null;

  const menuItems = [
    { href: '/pos', label: 'বিক্রয় (POS কাউন্টার)', icon: '🛒', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'হট' },
    { href: '/dealers', label: 'ক্রয় (ডিলার চালান)', icon: '🛍️', iconBg: '#eef2ff', iconColor: '#4f46e5', show: isFeatureEnabled('enableDealerKhata') },
    { href: '/khata', label: 'বাকির হিসাব (গ্রাহক খাতা)', icon: '📒', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'জরুরি' },
    { href: '/expenses', label: 'ব্যয় / দৈনিক খরচ', icon: '💸', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/stock', label: 'পণ্য (স্টক ইনভেন্টরি)', icon: '📦', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/staff', label: 'কর্মচারী ও পারমিশন (Staff)', icon: '👥', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'টিম' },
    { href: '/branches', label: 'দোকানের শাখা (Branches)', icon: '🏢', iconBg: '#eef2ff', iconColor: '#4f46e5', show: isFeatureEnabled('enableMultiBranch') },
    { href: '/expiry-tracker', label: 'মেয়াদোত্তীর্ণ রাডার (Expiry)', icon: '⏳', iconBg: '#eef2ff', iconColor: '#4f46e5', show: tenant?.industryId === 'cat-pharmacy' || isFeatureEnabled('enableExpiryTracker') },
    { href: '/reports', label: 'রিপোর্টস ও লাভ-ক্ষতি', icon: '📊', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/subscription', label: 'প্যাকেজ ও সাবস্ক্রিপশন', icon: '💳', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'প্যাকেজ' },
    { href: '/settings', label: 'দোকানের সেটিংস', icon: '⚙️', iconBg: '#f1f5f9', iconColor: '#475569' },
    { href: '/support', label: 'হেল্প এন্ড সাপোর্ট', icon: '🎧', iconBg: '#eef2ff', iconColor: '#4f46e5' },
    { href: '/tutorials', label: 'টিউটোরিয়াল ভিডিও', icon: '🎬', iconBg: '#eef2ff', iconColor: '#4f46e5', badge: 'ভিডিও' },
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
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '8px 0 30px rgba(0,0,0,0.25)',
        zIndex: 2,
        overflowY: 'auto'
      }}>
        {/* Solid Royal Violet Header (Matching Hisabpati Screenshot 1) */}
        <div style={{
          background: 'linear-gradient(135deg, #5b50e6 0%, #4f46e5 100%)',
          color: '#ffffff',
          padding: '30px 20px 22px',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
        }}>
          {/* Close button inside header */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            ✕
          </button>

          {/* Avatar with Edit Badge */}
          <div style={{ position: 'relative', width: '64px', height: '64px', margin: '0 auto 12px' }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#818cf8',
              display: 'grid',
              placeItems: 'center',
              fontSize: '30px',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              🏪
            </div>
            <Link
              href="/settings"
              onClick={onClose}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#ffffff',
                color: '#4f46e5',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                textDecoration: 'none'
              }}
              title="প্রোফাইল এডিট"
            >
              ✏️
            </Link>
          </div>

          <h3 style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.3px' }}>
            {tenant?.shopName || 'আমার ডিজিটাল দোকান'}
          </h3>
          <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#c7d2fe', fontWeight: '600' }}>
            📱 {tenant?.phone || '০১৯৮৬২৩৩২৩৪'}
          </p>

          {/* Shop Switcher Pill Dropdown */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            color: '#4f46e5',
            padding: '5px 14px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: '900',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
          }}>
            <span>{tenant?.shopName || 'মূল দোকান শাখা'}</span>
            <span style={{ fontSize: '10px' }}>▼</span>
          </div>
        </div>

        {/* Scrollable Menu Items */}
        <div style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                  padding: '11px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  background: active ? '#f5f3ff' : 'transparent',
                  border: active ? '1px solid #e0e7ff' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: item.iconBg,
                    color: item.iconColor,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '18px'
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: active ? '800' : '700', color: active ? '#4f46e5' : '#1e293b' }}>
                    {item.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {item.badge && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: item.badge === 'নতুন' ? '#ecfdf5' : '#fee2e2',
                      color: item.badge === 'নতুন' ? '#059669' : '#dc2626'
                    }}>
                      {item.badge}
                    </span>
                  )}
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>›</span>
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
  const { triggerHaptic } = useAuth();
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
            {/* 1. বিক্রয় */}
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
                📦
              </div>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>বিক্রয়</span>
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
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>বিক্রি রিটার্ন</span>
            </button>

            {/* 3. বাকি আদায় */}
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
  const { userRole, triggerHaptic } = useAuth();
  const pathname = usePathname();
  if (userRole !== 'shopkeeper') return null;

  return (
    <nav className="mobile-bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 6px 12px',
      zIndex: 90,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.06)'
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
          color: pathname === '/' ? '#4f46e5' : '#64748b'
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: pathname === '/' ? '900' : '700' }}>হোম</span>
      </Link>

      {/* 2. Khata */}
      <Link
        href="/khata"
        onClick={() => triggerHaptic('light')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          textDecoration: 'none',
          padding: '4px 10px',
          color: pathname === '/khata' ? '#4f46e5' : '#64748b'
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === '/khata' ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: pathname === '/khata' ? '900' : '700' }}>খাতা</span>
      </Link>

      {/* 3. Center Elevated Plus Button */}
      <button
        type="button"
        onClick={() => { triggerHaptic('medium'); onOpenActionSheet(); }}
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          border: '3px solid #ffffff',
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
          color: pathname === '/stock' ? '#4f46e5' : '#64748b'
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
          color: pathname === '/pos' ? '#4f46e5' : '#64748b'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

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
      <body style={{ background: '#f8fafc', color: '#0f172a', margin: 0, fontFamily: 'var(--font-sans)' }}>
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}
