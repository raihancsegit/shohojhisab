'use client';
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

function LoginFormContent() {
  const { userRole, tenant, loginShop, loginAdmin, triggerHaptic } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialRole = searchParams.get('role') === 'admin' || searchParams.get('admin') === 'true' ? 'admin' : 'shop';
  const [tab, setTab] = useState<'shop' | 'admin'>(initialRole);
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

  useEffect(() => {
    if (searchParams.get('role') === 'admin' || searchParams.get('admin') === 'true') {
      setTab('admin');
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
        router.push('/');
      } else {
        setError(res.error || 'মোবাইল নাম্বার বা পিন ভুল হয়েছে!');
      }
    } else {
      const res = await loginAdmin(adminPasscode);
      if (res.success) {
        router.push('/admin');
      } else {
        setError(res.error || 'ভুল অ্যাডমিন পাসকোড!');
      }
    }
    setLoading(false);
  };

  const fillDemoLogin = (demoPhone: string, demoPin: string[]) => {
    triggerHaptic('light');
    setPhone(demoPhone);
    setPinDigits(demoPin);
    setError('');
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

        {tab === 'shop' ? (
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
