'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getIndustryTheme, normalizeIndustryId } from '../lib/industryConfig';

interface DesktopAdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenShiftModal?: () => void;
  onOpenShopSwitchModal?: () => void;
}

export default function DesktopAdminSidebar({
  isCollapsed,
  onToggleCollapse,
  onOpenShiftModal,
  onOpenShopSwitchModal
}: DesktopAdminSidebarProps) {
  const pathname = usePathname();
  const {
    userRole,
    tenant,
    activeRoleMode,
    currentStaffUser,
    logout,
    triggerHaptic,
    isFeatureEnabled,
    theme: authTheme,
    toggleTheme,
    isSoundboxEnabled,
    toggleSoundbox
  } = useAuth();

  const isDark = authTheme === 'dark';
  const activeIndustryId = tenant?.industryId || (tenant as any)?.industry_category_id || (tenant as any)?.industryCategoryId;
  const industryTheme = getIndustryTheme(activeIndustryId, tenant?.shopName);

  const handleOpenShift = () => {
    triggerHaptic('light');
    if (onOpenShiftModal) onOpenShiftModal();
    else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lbos-open-mode-modal'));
  };

  const handleOpenShopSwitch = () => {
    triggerHaptic('light');
    if (onOpenShopSwitchModal) onOpenShopSwitchModal();
    else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('lbos-open-shop-switch-modal'));
  };

  // Dynamic subscription status calculation
  const subInfo = (() => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const toBn = (val: string | number) => String(val).replace(/\d/g, d => bnDigits[Number(d)] || d);

    if (!tenant?.paidTill) {
      return { daysLeft: 30, text: 'সক্রিয় ট্রায়াল', isExpired: false, badgeColor: '#10b981' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(tenant.paidTill);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = diffDays <= 0;

    let text = '';
    let badgeColor = '#10b981';
    if (isExpired) {
      text = 'মেয়াদ শেষ';
      badgeColor = '#ef4444';
    } else if (diffDays <= 3) {
      text = `আর ${toBn(diffDays)} দিন বাকি`;
      badgeColor = '#f59e0b';
    } else {
      text = `আর ${toBn(diffDays)} দিন`;
      badgeColor = '#10b981';
    }

    return { daysLeft: diffDays, text, isExpired, badgeColor };
  })();

  // Categorized Navigation Groups for Clean SaaS Admin Experience
  const navSections = [
    {
      title: 'বিক্রয় ও কাউন্টার',
      items: [
        { href: '/', label: 'ড্যাশবোর্ড', icon: '🏠', show: true },
        { href: '/pos', label: industryTheme.posLabel || 'POS কাউন্টার (বিক্রি)', icon: '🛒', show: true, badge: 'হট', badgeColor: '#ef4444' },
        { href: '/calculator', label: 'ক্যালকুলেটর কুইক সেল', icon: '🔢', show: true },
        { href: '/pos?voice=1', label: 'ভয়েস মেমো ও বিলিং', icon: '🎙️', show: true, badge: 'এআই', badgeColor: '#6366f1' },
      ]
    },
    {
      title: 'খাতা ও লেনদেন',
      items: [
        { href: '/khata', label: industryTheme.khataLabel || 'বাকির হিসাব (খাতা)', icon: '📒', show: isFeatureEnabled('enableCustomerKhata'), badge: 'জরুরি', badgeColor: '#ea580c' },
        { href: '/installments', label: 'বাকির কিস্তি কালেকশন', icon: '📅', show: isFeatureEnabled('enableInstallments'), badge: 'কিস্তি', badgeColor: '#4338ca' },
        { href: '/expenses', label: 'ব্যয় / দৈনিক খরচ', icon: '💸', show: true },
        { href: '/day-end', label: 'ক্যাশ ড্রয়ার ও ক্লোজিং', icon: '🌙', show: isFeatureEnabled('enableCashDrawer') },
      ]
    },
    {
      title: 'ইনভেন্টরি ও ক্রয়',
      items: [
        { href: '/stock', label: industryTheme.stockLabel || 'পণ্য (স্টক ইনভেন্টরি)', icon: '📦', show: true },
        { href: '/dealers', label: industryTheme.dealerLabel || 'ক্রয় (ডিলার চালান)', icon: '🛍️', show: isFeatureEnabled('enableDealerKhata') },
        { href: '/dealer-portal', label: 'ডিলার পোর্টাল (সরাসরি চালান)', icon: '🚚', show: isFeatureEnabled('enableDealerKhata'), badge: 'পোর্টাল', badgeColor: '#0284c7' },
        { href: '/expiry-tracker', label: 'মেয়াদোত্তীর্ণ রাডার (Expiry)', icon: '⏳', show: normalizeIndustryId(activeIndustryId, tenant?.shopName) === 'cat-pharmacy' || isFeatureEnabled('enableExpiryTracker') },
      ]
    },
    {
      title: 'রিপোর্ট ও বিশ্লেষণ',
      items: [
        { href: '/reports', label: industryTheme.reportsLabel || 'লাভ-ক্ষতি ও রিপোর্টস', icon: '📊', show: true },
      ]
    },
    {
      title: 'ব্যবসা প্রশাসন',
      items: [
        { href: '/staff', label: 'কর্মচারী ও পারমিশন', icon: '👥', show: true, badge: 'টিম', badgeColor: '#8b5cf6' },
        { href: '/branches', label: 'দোকানের শাখা (Branches)', icon: '🏢', show: isFeatureEnabled('enableMultiBranch') },
        { href: '/subscription', label: 'প্যাকেজ ও লাইসেন্স', icon: '💳', show: true },
        { href: '/notifications', label: 'বিজ্ঞপ্তি ও অ্যালার্ট', icon: '🔔', show: true, badge: 'নোটিশ', badgeColor: '#f43f5e' },
        { href: '/settings', label: 'দোকানের সেটিংস', icon: '⚙️', show: true },
      ]
    },
    {
      title: 'সহায়তা ও নির্দেশিকা',
      items: [
        { href: '/support', label: 'হেল্প এন্ড সাপোর্ট', icon: '🎧', show: true },
        { href: '/tutorials', label: 'টিউটোরিয়াল ভিডিও', icon: '🎬', show: true, badge: 'ভিডিও', badgeColor: '#10b981' },
        { href: '/voice-guide', label: 'ভয়েস কমান্ড গাইড', icon: '🎙️', show: true },
      ]
    }
  ];

  if (userRole !== 'shopkeeper') {
    return null; // Admin has dedicated console, not shopkeeper sidebar
  }

  return (
    <aside
      className={`admin-desktop-sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: isCollapsed ? '78px' : '275px',
        backgroundColor: isDark ? '#090d16' : '#ffffff',
        borderRight: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease',
        boxShadow: isDark ? '4px 0 24px -2px rgba(0, 0, 0, 0.7)' : '4px 0 20px -4px rgba(15, 23, 42, 0.05)',
        userSelect: 'none'
      }}
    >
      {/* 1. Header: Shop Identity & Collapse Toggle */}
      <div
        style={{
          padding: isCollapsed ? '16px 10px' : '16px 14px',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: '10px',
          background: isDark
            ? 'linear-gradient(180deg, #101626 0%, #090d16 100%)'
            : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          minHeight: '70px',
          boxSizing: 'border-box'
        }}
      >
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={handleOpenShopSwitch}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#ffffff',
                border: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '18px',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 3px 10px rgba(79, 70, 229, 0.35)',
                transition: 'transform 0.15s ease'
              }}
              title="দোকান বা ক্যাটাগরি সুইচ করুন"
            >
              {industryTheme.icon || '🏪'}
            </button>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '14.5px',
                    fontWeight: '900',
                    color: isDark ? '#ffffff' : '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.2px'
                  }}
                  title={tenant?.shopName || 'সহজ হিসাব'}
                >
                  {tenant?.shopName || 'সহজ হিসাব'}
                </h2>
                <button
                  type="button"
                  onClick={handleOpenShopSwitch}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontSize: '9px',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                  title="দোকান বদলান"
                >
                  ▼
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: isDark ? '#4ade80' : '#059669',
                    background: isDark ? 'rgba(74, 222, 128, 0.12)' : '#ecfdf5',
                    padding: '1px 6px',
                    borderRadius: '99px',
                    border: isDark ? '1px solid rgba(74, 222, 128, 0.25)' : '1px solid #a7f3d0'
                  }}
                >
                  ● {industryTheme.name}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              border: 'none',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(79, 70, 229, 0.35)'
            }}
            title="সাইডবার বড় করুন (Expand)"
          >
            {industryTheme.icon || '🏪'}
          </button>
        )}

        {/* Toggle Collapse Button */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
              color: isDark ? '#cbd5e1' : '#64748b',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: '12px',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
            title="সাইডবার ছোট করুন (Collapse)"
          >
            ◀
          </button>
        )}
      </div>

      {/* 2. Fast POS Action CTA Button */}
      <div style={{ padding: isCollapsed ? '12px 10px 8px' : '12px 12px 6px' }}>
        <Link
          href="/pos"
          onClick={() => triggerHaptic('light')}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '12px',
            padding: isCollapsed ? '10px 0' : '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '8px',
            fontWeight: '900',
            fontSize: '13px',
            boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          className="clickable-card"
          title="নতুন বিক্রি শুরু করুন (POS Counter)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: isCollapsed ? '18px' : '16px' }}>⚡</span>
            {!isCollapsed && <span>নতুন বিক্রি (POS)</span>}
          </div>
          {!isCollapsed && (
            <span
              style={{
                fontSize: '10px',
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: '800'
              }}
            >
              F2
            </span>
          )}
        </Link>
      </div>

      {/* 3. Navigation Links List (Scrollable Area) */}
      <div
        className="admin-sidebar-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isCollapsed ? '8px 8px 16px' : '6px 10px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: isCollapsed ? '14px' : '18px'
        }}
      >
        {navSections.map((sec, sIdx) => {
          const visibleItems = sec.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={sIdx}>
              {/* Group Section Header */}
              {!isCollapsed ? (
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: isDark ? '#64748b' : '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    padding: '4px 10px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{sec.title}</span>
                </div>
              ) : (
                <div
                  style={{
                    height: '1px',
                    background: isDark ? '#1e293b' : '#f1f5f9',
                    margin: '4px 4px 8px'
                  }}
                />
              )}

              {/* Items in Group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {visibleItems.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => triggerHaptic('light')}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'space-between',
                        gap: '10px',
                        padding: isCollapsed ? '10px 0' : '9px 12px',
                        borderRadius: '11px',
                        textDecoration: 'none',
                        color: isActive
                          ? (isDark ? '#818cf8' : '#4338ca')
                          : (isDark ? '#cbd5e1' : '#334155'),
                        backgroundColor: isActive
                          ? (isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff')
                          : 'transparent',
                        fontWeight: isActive ? '900' : '700',
                        fontSize: '12.5px',
                        transition: 'all 0.15s ease',
                        borderLeft: isActive
                          ? `3px solid ${isDark ? '#818cf8' : '#4f46e5'}`
                          : '3px solid transparent'
                      }}
                      className="admin-sidebar-nav-link"
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '16px',
                            display: 'grid',
                            placeItems: 'center',
                            width: '20px',
                            flexShrink: 0
                          }}
                        >
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: '900',
                            padding: '1px 6px',
                            borderRadius: '99px',
                            color: '#ffffff',
                            backgroundColor: item.badgeColor || '#6366f1',
                            flexShrink: 0
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Footer: Active User / Cashier Switch & Quick Actions */}
      <div
        style={{
          borderTop: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          padding: isCollapsed ? '10px 6px' : '12px 12px',
          background: isDark
            ? 'linear-gradient(180deg, #090d16 0%, #0e1526 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* User / Cashier Profile Card */}
        <div
          onClick={handleOpenShift}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '8px',
            padding: isCollapsed ? '6px' : '8px 10px',
            borderRadius: '12px',
            background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          title="ক্যাশিয়ার বা ব্যবহারকারী শিফট বদলান"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: activeRoleMode === 'owner'
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '14px',
                fontWeight: '900',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            >
              {activeRoleMode === 'owner' ? '👑' : '👤'}
            </div>
            {!isCollapsed && (
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    fontWeight: '900',
                    color: isDark ? '#ffffff' : '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {currentStaffUser?.name || (activeRoleMode === 'owner' ? (tenant?.ownerName || 'দোকান মালিক') : 'স্টাফ ক্যাশিয়ার')}
                </p>
                <p
                  style={{
                    margin: '1px 0 0',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: activeRoleMode === 'owner' ? '#f59e0b' : '#818cf8'
                  }}
                >
                  {activeRoleMode === 'owner' ? 'মালিক মোড (সকল পারমিশন)' : 'স্টাফ মোড'}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <span style={{ fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b' }}>
              🔄
            </span>
          )}
        </div>

        {/* Action Utility Buttons Row */}
        {!isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
            {/* Quick Settings: Theme & Voice */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => { triggerHaptic('light'); toggleTheme(); }}
                style={{
                  padding: '7px 8px',
                  borderRadius: '8px',
                  background: isDark ? 'rgba(253, 224, 71, 0.12)' : '#f1f5f9',
                  border: isDark ? '1px solid rgba(253, 224, 71, 0.25)' : '1px solid #e2e8f0',
                  color: isDark ? '#fef08a' : '#475569',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                title={isDark ? 'লাইট মোডে যান' : 'ডার্ক মোড চালু করুন'}
              >
                <span>{isDark ? '☀️ লাইট' : '🌙 ডার্ক'}</span>
              </button>

              <button
                type="button"
                onClick={() => { triggerHaptic('light'); toggleSoundbox(); }}
                style={{
                  padding: '7px 8px',
                  borderRadius: '8px',
                  background: isSoundboxEnabled
                    ? (isDark ? 'rgba(99, 102, 241, 0.25)' : '#e0e7ff')
                    : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'),
                  border: isSoundboxEnabled ? '1px solid #818cf8' : (isDark ? '1px solid #1e293b' : '1px solid #e2e8f0'),
                  color: isSoundboxEnabled ? (isDark ? '#818cf8' : '#3730a3') : (isDark ? '#94a3b8' : '#64748b'),
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                title={isSoundboxEnabled ? 'সাউন্ডবক্স ভয়েস সক্রিয়' : 'সাউন্ডবক্স বন্ধ'}
              >
                <span>{isSoundboxEnabled ? '🔊 ভয়েস' : '🔈 সাউন্ড'}</span>
              </button>
            </div>

            {/* Clear, Full-Width Logout Button */}
            <button
              type="button"
              onClick={() => { triggerHaptic('medium'); logout(); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
                border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecaca',
                color: isDark ? '#fca5a5' : '#b91c1c',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              title="দোকান থেকে সম্পূর্ণ লগআউট করুন"
            >
              <span style={{ fontSize: '13px' }}>🚪</span>
              <span>লগআউট করুন</span>
            </button>
          </div>
        )}

        {/* Collapsed State Logout Button */}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => { triggerHaptic('medium'); logout(); }}
            style={{
              width: '100%',
              marginTop: '6px',
              padding: '8px 4px',
              borderRadius: '8px',
              background: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #fecaca',
              color: '#ef4444',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="দোকান থেকে লগআউট"
          >
            🚪
          </button>
        )}
      </div>
    </aside>
  );
}
