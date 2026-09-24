'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../lib/config';
import Link from 'next/link';

function LoginFormContent() {
  const { userRole, tenant, loginShop, loginAdmin, triggerHaptic } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = searchParams.get('role') === 'admin' || searchParams.get('admin') === 'true' 
    ? 'admin' 
    : searchParams.get('role') === 'dealer' || searchParams.get('dealer') === 'true'
    ? 'dealer'
    : searchParams.get('tab') === 'register' || searchParams.get('register') === 'true'
    ? 'register'
    : 'shop';
  const [tab, setTab] = useState<'shop' | 'register' | 'admin' | 'dealer'>(initialRole);
  const [phone, setPhone] = useState('01986233234');
  
  // 4-box PIN states
  const [pinDigits, setPinDigits] = useState(['1', '2', '3', '4']);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const [adminPasscode, setAdminPasscode] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // New Registration State
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regCategory, setRegCategory] = useState('cat-grocery');
  const [regBillingCycle, setRegBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [regPin, setRegPin] = useState('');
  const [isApprovalPendingNotice, setIsApprovalPendingNotice] = useState(false);
  const [pendingShopDetails, setPendingShopDetails] = useState<{
    shopName: string;
    phone: string;
    billingCycle: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get('role') === 'admin' || searchParams.get('admin') === 'true') {
      setTab('admin');
    } else if (searchParams.get('role') === 'dealer' || searchParams.get('dealer') === 'true') {
      setTab('dealer');
      setPhone('01899112233');
    } else if (searchParams.get('tab') === 'register' || searchParams.get('register') === 'true') {
      setTab('register');
    }
  }, [searchParams]);

  // Handle individual PIN box typing & auto-focus jump
  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);
    triggerHaptic('light');

    if (digit && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        const newDigits = [...pinDigits];
        newDigits[index - 1] = '';
        setPinDigits(newDigits);
        pinInputRefs[index - 1].current?.focus();
      } else {
        const newDigits = [...pinDigits];
        newDigits[index] = '';
        setPinDigits(newDigits);
      }
    }
  };

  const fullPin = pinDigits.join('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    triggerHaptic('medium');

    if (tab === 'shop') {
      if (!phone.trim()) {
        setError('দয়া করে মোবাইল নাম্বার অথবা ইউজার আইডি দিন!');
        setLoading(false);
        return;
      }
      if (fullPin.length < 4) {
        setError('দয়া করে ৪-ডিজিটের পিন কোড সম্পূর্ণ লিখুন!');
        setLoading(false);
        return;
      }
      const res = await loginShop(phone, fullPin);
      if (res.success) {
        window.location.href = '/pos';
      } else {
        if (res.isPendingApproval) {
          setPendingShopDetails({
            shopName: 'আপনার দোকান',
            phone: phone.trim(),
            billingCycle: 'monthly',
            message: res.error
          });
          setIsApprovalPendingNotice(true);
        }
        setError(res.error || 'মোবাইল নাম্বার বা পিন ভুল হয়েছে!');
      }
    } else if (tab === 'dealer') {
      if (!phone.trim()) {
        setError('দয়া করে ডিলারের মোবাইল নাম্বার দিন!');
        setLoading(false);
        return;
      }
      if (fullPin.length < 4) {
        setError('দয়া করে ৪-ডিজিটের পিন কোড সম্পূর্ণ লিখুন!');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/dealer/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, pin: fullPin })
        });
        const data = await res.json();
        if (res.ok && data.dealer) {
          localStorage.setItem('lbos_dealer_session', JSON.stringify(data));
          window.location.href = '/dealer-portal';
        } else {
          setError(data.error || 'ভুল মোবাইল নাম্বার বা পিন!');
        }
      } catch (e) {
        setError('সার্ভারে যোগাযোগ করা যায়নি');
      }
    } else {
      const res = await loginAdmin(adminPasscode);
      if (res.success) {
        window.location.href = '/admin';
      } else {
        setError(res.error || 'ভুল অ্যাডমিন পাসকোড!');
      }
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!regShopName.trim()) {
      setError('দয়া করে দোকানের নাম লিখুন!');
      triggerHaptic('warning');
      return;
    }
    if (!regOwnerName.trim()) {
      setError('দয়া করে দোকানদারের নাম লিখুন!');
      triggerHaptic('warning');
      return;
    }
    if (!regPhone.trim() || regPhone.trim().length < 11) {
      setError('দয়া করে ১১-ডিজিটের সঠিক মোবাইল নাম্বার দিন!');
      triggerHaptic('warning');
      return;
    }
    if (regPin.trim().length !== 4) {
      setError('দয়া করে ঠিক ৪-ডিজিটের গোপনীয় পিন কোড দিন!');
      triggerHaptic('warning');
      return;
    }

    setLoading(true);
    triggerHaptic('medium');
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: regShopName.trim(),
          ownerName: regOwnerName.trim(),
          phone: regPhone.trim(),
          location: regLocation.trim() || 'স্থানীয় বাজার',
          industryCategoryId: regCategory,
          billingCycle: regBillingCycle,
          pin: regPin.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerHaptic('success');
        setPendingShopDetails({
          shopName: regShopName.trim(),
          phone: regPhone.trim(),
          billingCycle: regBillingCycle,
          message: data.message
        });
        setIsApprovalPendingNotice(true);
        setPhone(regPhone.trim());
        setPinDigits(regPin.trim().split(''));
      } else {
        triggerHaptic('warning');
        setError(data.error || 'রেজিস্ট্রেশন সম্পন্ন করা সম্ভব হয়নি!');
      }
    } catch (err) {
      triggerHaptic('warning');
      setError('সার্ভারে যোগাযোগ করা যায়নি। ইন্টারনেট কানেকশন চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoPhone: string, demoPin: string[]) => {
    triggerHaptic('medium');
    setPhone(demoPhone);
    setPinDigits(demoPin);
    setError('');
    setLoading(true);
    const pinStr = demoPin.join('');
    const res = await loginShop(demoPhone, pinStr);
    if (res.success) {
      window.location.href = '/pos';
    } else {
      setError(res.error || 'মোবাইল নাম্বার বা পিন ভুল হয়েছে!');
      setLoading(false);
    }
  };

  const fillDemoLogin = (demoPhone: string, demoPin: string[]) => {
    handleQuickDemoLogin(demoPhone, demoPin);
  };

  return (
    <div style={{
      minHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 12px 36px',
      width: '100%',
      maxWidth: '100vw',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
    }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px', maxWidth: '100%' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          padding: '6px 14px',
          borderRadius: '99px',
          boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
          marginBottom: '6px'
        }}>
          <span style={{ fontSize: '18px' }}>🏪</span>
          <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '-0.3px' }}>ShohojHisab</span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
          স্মার্ট দোকান ও ব্যবসা সফটওয়্যার
        </p>
      </div>

      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px 18px',
        boxShadow: '0 16px 36px -8px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
        border: '1.5px solid #e2e8f0',
        boxSizing: 'border-box',
        position: 'relative'
      }}>

        {/* Role Tabs Switcher */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '12px',
          marginBottom: '16px',
          boxSizing: 'border-box',
          gap: '2px'
        }}>
          <button
            type="button"
            onClick={() => { setTab('shop'); setIsApprovalPendingNotice(false); setError(''); triggerHaptic('light'); }}
            style={{
              flex: 1,
              padding: '7px 2px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'shop' && !isApprovalPendingNotice ? '#ffffff' : 'transparent',
              color: tab === 'shop' && !isApprovalPendingNotice ? '#0f172a' : '#64748b',
              fontWeight: tab === 'shop' && !isApprovalPendingNotice ? '900' : '700',
              fontSize: '11.5px',
              cursor: 'pointer',
              boxShadow: tab === 'shop' && !isApprovalPendingNotice ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            🏬 লগইন
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setIsApprovalPendingNotice(false); setError(''); triggerHaptic('light'); }}
            style={{
              flex: 1.15,
              padding: '7px 2px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'register' && !isApprovalPendingNotice ? '#ffffff' : 'transparent',
              color: tab === 'register' && !isApprovalPendingNotice ? '#4f46e5' : '#64748b',
              fontWeight: tab === 'register' && !isApprovalPendingNotice ? '900' : '700',
              fontSize: '11.5px',
              cursor: 'pointer',
              boxShadow: tab === 'register' && !isApprovalPendingNotice ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            📝 রেজিস্ট্রেশন
          </button>
          <button
            type="button"
            onClick={() => { setTab('dealer'); setIsApprovalPendingNotice(false); setError(''); setPhone('01899112233'); triggerHaptic('light'); }}
            style={{
              flex: 0.9,
              padding: '7px 2px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'dealer' && !isApprovalPendingNotice ? '#ffffff' : 'transparent',
              color: tab === 'dealer' && !isApprovalPendingNotice ? '#0284c7' : '#64748b',
              fontWeight: tab === 'dealer' && !isApprovalPendingNotice ? '900' : '700',
              fontSize: '11.5px',
              cursor: 'pointer',
              boxShadow: tab === 'dealer' && !isApprovalPendingNotice ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            🚚 ডিলার
          </button>
          <button
            type="button"
            onClick={() => { setTab('admin'); setIsApprovalPendingNotice(false); setError(''); triggerHaptic('light'); }}
            style={{
              flex: 0.85,
              padding: '7px 2px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'admin' && !isApprovalPendingNotice ? '#ffffff' : 'transparent',
              color: tab === 'admin' && !isApprovalPendingNotice ? '#be123c' : '#64748b',
              fontWeight: tab === 'admin' && !isApprovalPendingNotice ? '900' : '700',
              fontSize: '11.5px',
              cursor: 'pointer',
              boxShadow: tab === 'admin' && !isApprovalPendingNotice ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            👑 অ্যাডমিন
          </button>
        </div>

        {/* Approval Pending Screen Notice */}
        {isApprovalPendingNotice ? (
          <div style={{ textAlign: 'center', padding: '10px 4px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '30px',
              margin: '0 auto 12px',
              boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)',
              border: '2px solid #fcd34d'
            }}>
              ⏳
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#92400e', margin: '0 0 6px' }}>
              অ্যাকাউন্টটি অ্যাডমিন অনুমোদনের অপেক্ষায়
            </h2>
            <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.5, margin: '0 0 14px' }}>
              {pendingShopDetails?.message || 'আপনার রেজিস্ট্রেশন সফল হয়েছে। নিরাপত্তার স্বার্থে অ্যাডমিন অনুমোদন দেওয়ার পর আপনি সরাসরি লগইন করতে পারবেন।'}
            </p>

            {/* Shop Details Card */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '700' }}>দোকান:</span>
                <strong style={{ color: '#0f172a' }}>{pendingShopDetails?.shopName || phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '700' }}>মোবাইল:</span>
                <strong style={{ color: '#0f172a' }}>{pendingShopDetails?.phone || phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b', fontWeight: '700' }}>নির্বাচিত প্যাকেজ:</span>
                <span style={{
                  background: '#e0e7ff',
                  color: '#4338ca',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '11px'
                }}>
                  {pendingShopDetails?.billingCycle === 'yearly' ? '🚀 বাৎসরিক প্ল্যান (১ বছর / ৩৬৫ দিন)' : '🌟 মাসিক প্ল্যান (৩০ দিন)'}
                </span>
              </div>
            </div>

            {/* Helpline Actions */}
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              <a
                href="tel:01986233234"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '12.5px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                }}
              >
                <span>📞 দ্রুত অনুমোদনের জন্য কল: ০১৯৮৬২৩৩২৩৪</span>
              </a>
              <a
                href="https://wa.me/8801986233234?text=সালাম,%20সহজহিসাব%20এ%20দোকান%20রেজিস্ট্রেশন%20করেছি,%20অনুমোদন%20চাই।"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#25D366',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '12.5px',
                  textDecoration: 'none'
                }}
              >
                <span>💬 হোয়াটসঅ্যাপে জানান</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsApprovalPendingNotice(false);
                setTab('shop');
                setError('');
              }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '9px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              ← লগইন পেজে ফিরে যান
            </button>
          </div>
        ) : tab === 'register' ? (
          <>
            {/* Register Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#0f172a',
                margin: '0 0 4px'
              }}>
                নতুন দোকান রেজিস্ট্রেশন
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.4
              }}>
                দোকানের তথ্য দিয়ে রেজিস্ট্রেশন করুন ও ফ্রি ট্রায়াল পান
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px',
                textAlign: 'center',
                border: '1px solid #fecaca'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'grid', gap: '11px', width: '100%', boxSizing: 'border-box' }}>
              {/* Shop Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  🏪 দোকানের নাম:
                </label>
                <input
                  type="text"
                  value={regShopName}
                  onChange={(e) => setRegShopName(e.target.value)}
                  placeholder="যেমন: আল-মদিনা জেনারেল স্টোর"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '11px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Owner Name */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  👤 মালিকের নাম:
                </label>
                <input
                  type="text"
                  value={regOwnerName}
                  onChange={(e) => setRegOwnerName(e.target.value)}
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '11px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  📱 মোবাইল নাম্বার (১১ ডিজিট):
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '11px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  📍 বাজারের নাম / এলাকা:
                </label>
                <input
                  type="text"
                  value={regLocation}
                  onChange={(e) => setRegLocation(e.target.value)}
                  placeholder="যেমন: নিউ মার্কেট, ঢাকা"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '11px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Business Category */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  🏷️ ব্যবসার ধরন / ক্যাটাগরি:
                </label>
                <select
                  value={regCategory}
                  onChange={(e) => setRegCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '11px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: '800',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    color: '#0f172a'
                  }}
                >
                  <option value="cat-grocery">🛒 মুদি ও ডিপার্টমেন্টাল স্টোর</option>
                  <option value="cat-pharmacy">💊 ফার্মেসি ও ওষুধ</option>
                  <option value="cat-electronics">📱 মোবাইল ও ইলেকট্রনিক্স</option>
                  <option value="cat-fashion">👗 বস্ত্র ও ফ্যাশন</option>
                  <option value="cat-hardware">🔧 হার্ডওয়্যার ও স্যানিটারি</option>
                  <option value="cat-restaurant">☕ রেস্তোরাঁ ও ক্যাফে</option>
                  <option value="cat-stationery">📚 বই ও স্টেশনারি</option>
                  <option value="cat-wholesale">📦 পাইকারি ও এজেন্সি</option>
                  <option value="cat-general">🏪 সাধারণ ব্যবসা</option>
                </select>
              </div>

              {/* Subscription Cycle Choice (Monthly vs 1-Year) */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '5px' }}>
                  💳 সাবস্ক্রিপশন প্যাকেজ নির্বাচন:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Monthly Option */}
                  <div
                    onClick={() => { setRegBillingCycle('monthly'); triggerHaptic('light'); }}
                    style={{
                      border: regBillingCycle === 'monthly' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                      background: regBillingCycle === 'monthly' ? '#eef2ff' : '#ffffff',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '900', color: regBillingCycle === 'monthly' ? '#4338ca' : '#0f172a' }}>
                      🌟 মাসিক প্ল্যান
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#059669', margin: '2px 0' }}>
                      ৳১৪৯ / মাস
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                      ৩০ দিন মেয়াদ
                    </div>
                  </div>

                  {/* 1-Year Option */}
                  <div
                    onClick={() => { setRegBillingCycle('yearly'); triggerHaptic('light'); }}
                    style={{
                      border: regBillingCycle === 'yearly' ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                      background: regBillingCycle === 'yearly' ? '#ecfdf5' : '#ffffff',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '6px',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: '8.5px',
                      fontWeight: '900',
                      padding: '1px 5px',
                      borderRadius: '99px'
                    }}>
                      অফার 🔥
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: regBillingCycle === 'yearly' ? '#065f46' : '#0f172a' }}>
                      🚀 ১ বছরের প্ল্যান
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#059669', margin: '2px 0' }}>
                      ৳১৪৯৯ / বছর
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                      ৩৬৫ দিন মেয়াদ
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Digit Security PIN */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  🔒 ৪-ডিজিটের সিকিউরিটি পিন:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="৪ সংখ্যার পিন দিন (যেমন: 1234)"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '11px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: '900',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                />
              </div>

              {/* Submit Registration */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                  transition: 'transform 0.1s ease',
                  marginTop: '4px',
                  boxSizing: 'border-box'
                }}
              >
                {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : '📝 নতুন দোকান রেজিস্টার করুন'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => { setTab('shop'); setError(''); triggerHaptic('light'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                ← ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
              </button>
            </div>
          </>
        ) : tab === 'shop' ? (
          <>
            {/* Top Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '900',
                color: '#0f172a',
                margin: '0 0 4px'
              }}>
                দোকান ও কর্মচারী লগইন
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                margin: 0,
                lineHeight: 1.4
              }}>
                মালিক অথবা কর্মচারীর মোবাইল ও ৪-ডিজিট পিন দিন
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px',
                textAlign: 'center',
                border: '1px solid #fecaca'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
              
              {/* Step 1: Mobile / User ID Input */}
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '5px' }}>
                  📱 মোবাইল নাম্বার / ইউজার আইডি:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  style={{
                    width: '100%',
                    minWidth: 0,
                    maxWidth: '100%',
                    padding: '11px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc',
                    transition: 'border 0.2s ease'
                  }}
                />
              </div>

              {/* Step 2: 4-Box PIN Input */}
              <div style={{ width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>
                    🔒 ৪-ডিজিট পিন কোড:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    পিন ভুলে গেছেন?
                  </button>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '8px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {pinDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={pinInputRefs[index]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        maxWidth: '100%',
                        height: '48px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: '900',
                        color: '#0f172a',
                        borderRadius: '12px',
                        border: digit ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                        background: digit ? '#eef2ff' : '#f8fafc',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        padding: 0
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '900',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                  transition: 'transform 0.1s ease',
                  marginTop: '2px',
                  boxSizing: 'border-box'
                }}
              >
                {loading ? 'লগইন হচ্ছে...' : 'দোকানে প্রবেশ করুন →'}
              </button>

              {/* Quick register trigger */}
              <button
                type="button"
                onClick={() => { setTab('register'); setError(''); triggerHaptic('light'); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  background: '#eef2ff',
                  border: '1.5px solid #c7d2fe',
                  color: '#4338ca',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                  marginTop: '4px'
                }}
              >
                ✨ নতুন দোকান? ফ্রি রেজিস্ট্রেশন করুন →
              </button>
            </form>

            {/* Quick Multi-Category Demo Logins */}
            <div style={{
              marginTop: '18px',
              paddingTop: '14px',
              borderTop: '1px dashed #e2e8f0',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#94a3b8', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase' }}>
                ⚡ ১-ক্লিকে যেকোনো দোকান টেস্ট করুন:
              </div>

              {/* Category Pills */}
              <div style={{ display: 'grid', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                {/* 1. Grocery Shop */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '5px 8px',
                  borderRadius: '10px',
                  gap: '4px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px' }}>🛒</span>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>মুদি শপ</div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => fillDemoLogin('01986233234', ['1', '2', '3', '4'])}
                      style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      মালিক (1234)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoLogin('01986233234', ['2', '2', '2', '2'])}
                      style={{ background: '#dcfce7', color: '#15803d', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      স্টাফ (2222)
                    </button>
                  </div>
                </div>

                {/* 2. Pharmacy */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '5px 8px',
                  borderRadius: '10px',
                  gap: '4px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px' }}>💊</span>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>ফার্মেসি</div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => fillDemoLogin('01711223344', ['1', '2', '3', '4'])}
                      style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      মালিক (1234)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoLogin('01711223344', ['4', '4', '4', '4'])}
                      style={{ background: '#fef3c7', color: '#b45309', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      স্টাফ (4444)
                    </button>
                  </div>
                </div>

                {/* 3. Clothing Shop */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '5px 8px',
                  borderRadius: '10px',
                  gap: '4px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px' }}>👗</span>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>ফ্যাশন/কাপড়</div>
                  </div>
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => fillDemoLogin('01722334455', ['1', '2', '3', '4'])}
                      style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      মালিক (1234)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoLogin('01722334455', ['3', '3', '3', '3'])}
                      style={{ background: '#fae8ff', color: '#86198f', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      ম্যানেজার (3333)
                    </button>
                  </div>
                </div>

                {/* 4. Electronics & Hardware */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '5px 8px',
                  borderRadius: '10px',
                  gap: '4px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '14px' }}>⚡</span>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap' }}>হার্ডওয়্যার</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fillDemoLogin('01733445566', ['1', '2', '3', '4'])}
                    style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '3px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', flexShrink: 0 }}
                  >
                    মালিক (1234)
                  </button>
                </div>
              </div>
            </div>

            {/* Subtle Footer Admin Portal Link */}
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                type="button"
                onClick={() => { setTab('admin'); setError(''); triggerHaptic('light'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                🔐 সুপার অ্যাডমিন প্রবেশ
              </button>
            </div>
          </>
        ) : tab === 'dealer' ? (
          <>
            {/* Dealer Portal Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 10px',
                fontSize: '26px'
              }}>
                🚚
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                ডিলার ও সাপ্লায়ার পোর্টাল
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                সরাসরি দোকানে পণ্য সরবরাহ ও চালানের হিসাবের জন্য মোবাইল ও পিন দিন
              </p>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '14px',
                textAlign: 'center',
                border: '1px solid #fecaca'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '5px' }}>
                  📱 ডিলারের মোবাইল নাম্বার:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f8fafc'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  🔒 ৪-ডিজিট ডিলার পিন কোড:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {pinDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={pinInputRefs[index]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      style={{
                        height: '46px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: '900',
                        borderRadius: '12px',
                        border: digit ? '2px solid #0284c7' : '1.5px solid #cbd5e1',
                        background: digit ? '#f0f9ff' : '#ffffff',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '900',
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                  marginTop: '4px'
                }}
              >
                {loading ? 'লগইন হচ্ছে...' : '🚚 ডিলার পোর্টালে প্রবেশ'}
              </button>
            </form>

            {/* Quick Demo Dealer Login */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '10px 12px',
              marginTop: '16px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>
                ⚡ ডেমো ডিলার দিয়ে এক ক্লিকে টেস্ট করুন:
              </span>
              <div style={{ display: 'grid', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPhone('01711998877');
                    setPinDigits(['1', '2', '3', '4']);
                    triggerHaptic('light');
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#0f172a'
                  }}
                >
                  <span>🏢 মেঘনা গ্রুপ (01711998877)</span>
                  <span style={{ color: '#0284c7', fontWeight: '800' }}>পিন: 1234</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhone('01933776655');
                    setPinDigits(['1', '2', '3', '4']);
                    triggerHaptic('light');
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#0f172a'
                  }}
                >
                  <span>🏢 স্কয়ার ফার্মা (01933776655)</span>
                  <span style={{ color: '#0284c7', fontWeight: '800' }}>পিন: 1234</span>
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <Link
                href="/dealer-portal"
                style={{
                  color: '#0284c7',
                  fontSize: '12px',
                  fontWeight: '800',
                  textDecoration: 'none'
                }}
              >
                🌐 সরাসরি ডিলার পোর্টাল পেজে যান →
              </Link>
            </div>
          </>
        ) : (
          /* Super Admin Passcode Screen */
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px',
                fontSize: '28px',
                color: '#be123c'
              }}>
                👑
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
                সুপার অ্যাডমিন পাসকোড
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                প্ল্যাটফর্ম মালিক ও সিস্টেম কনট্রোল প্যানেল
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '7px' }}>
                পাসকোড (Passcode):
              </label>
              <input
                type="password"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder="অ্যাডমিন পাসকোড (admin)"
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '15px',
                  fontWeight: '700',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: '#be123c',
                color: '#ffffff',
                border: 'none',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(190, 18, 60, 0.3)'
              }}
            >
              {loading ? 'লগইন হচ্ছে...' : 'অ্যাডমিন পোর্টালে প্রবেশ'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setTab('shop'); setError(''); triggerHaptic('light'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                ← সাধারণ দোকান লগইনে ফিরুন
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Forgot PIN Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '24px',
            maxWidth: '380px', width: '100%', textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔐</div>
            <h3 style={{ fontSize: '18px', fontWeight: '900', margin: '0 0 8px', color: '#0f172a' }}>
              পিন ভুলে গেছেন?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 18px' }}>
              নিরাপত্তার স্বার্থে পিন রিসেটের জন্য আপনার রেজিস্টার্ড মোবাইল থেকে আমাদের হেল্পলাইনে যোগাযোগ করুন অথবা ডিফল্ট পিন <strong>1234</strong> ব্যবহার করুন।
            </p>

            <div style={{ display: 'grid', gap: '10px' }}>
              <a
                href="tel:09613660100"
                style={{
                  display: 'block', padding: '12px', borderRadius: '12px',
                  background: '#6366f1', color: '#ffffff', fontWeight: '800', fontSize: '14px', textDecoration: 'none'
                }}
              >
                📞 কল করুন: ০৯৬১৩৬৬০১০০
              </a>
              <button
                onClick={() => {
                  setPinDigits(['1', '2', '3', '4']);
                  setShowForgotModal(false);
                }}
                style={{
                  padding: '12px', borderRadius: '12px', background: '#f1f5f9',
                  color: '#334155', border: 'none', fontWeight: '800', fontSize: '13.5px', cursor: 'pointer'
                }}
              >
                ডিফল্ট পিন (1234) দিয়ে চেষ্টা করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>লোড হচ্ছে...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
