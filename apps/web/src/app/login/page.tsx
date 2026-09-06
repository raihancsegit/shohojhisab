'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { userRole, tenant, loginShop, loginAdmin, triggerHaptic } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'shop' | 'admin'>('shop');
  const [step, setStep] = useState<'phone' | 'pin'>('pin');
  const [phone, setPhone] = useState('01986233234');
  
  // 4-box PIN states (Matching Image 1)
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

  const handleQuickDemo = (type: 'shop' | 'admin') => {
    triggerHaptic('light');
    setTab(type);
    setError('');
    if (type === 'shop') {
      setPhone('01986233234');
      setPinDigits(['1', '2', '3', '4']);
      setStep('pin');
    } else {
      setAdminPasscode('admin');
    }
  };

  return (
    <div style={{
      minHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px 40px',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
    }}>
      
      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#ffffff',
        borderRadius: '28px',
        padding: '32px 24px',
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
        border: '1.5px solid #e2e8f0',
        position: 'relative'
      }}>

        {/* Tab Selection (Shopkeeper vs Super Admin) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          background: '#f1f5f9',
          padding: '5px',
          borderRadius: '16px',
          marginBottom: '24px',
          border: '1px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => { setTab('shop'); setError(''); triggerHaptic('light'); }}
            style={{
              padding: '9px 12px',
              borderRadius: '12px',
              border: 'none',
              background: tab === 'shop' ? '#ffffff' : 'transparent',
              color: tab === 'shop' ? '#4f46e5' : '#64748b',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: tab === 'shop' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            🏪 দোকানদার
          </button>
          <button
            type="button"
            onClick={() => { setTab('admin'); setError(''); triggerHaptic('light'); }}
            style={{
              padding: '9px 12px',
              borderRadius: '12px',
              border: 'none',
              background: tab === 'admin' ? '#ffffff' : 'transparent',
              color: tab === 'admin' ? '#be123c' : '#64748b',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: tab === 'admin' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            👑 অ্যাডমিন
          </button>
        </div>

        {tab === 'shop' ? (
          <>
            {/* Top Illustration Graphic (Matching Image 1) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Phone & Lock Representation */}
                <div style={{
                  width: '64px',
                  height: '92px',
                  background: '#1e1b4b',
                  borderRadius: '14px',
                  border: '3px solid #ffffff',
                  boxShadow: '0 8px 16px rgba(30, 27, 75, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '6px 4px',
                  position: 'relative'
                }}>
                  {/* Lock Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '-10px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    border: '2px solid #ffffff',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}>
                    🔒
                  </div>

                  {/* Pin grid preview inside illustration */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', width: '100%', marginTop: '16px' }}>
                    {[...Array(9)].map((_, i) => (
                      <div key={i} style={{ width: '10px', height: '10px', background: i === 4 ? '#818cf8' : 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: 'auto' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Title Matching Image 1 */}
              <h2 style={{
                fontSize: '20px',
                fontWeight: '900',
                color: '#475569',
                margin: '18px 0 6px',
                textAlign: 'center',
                letterSpacing: '-0.3px'
              }}>
                আপনার পিন কোড টাইপ করুন
              </h2>
              
              <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700' }}>
                দোকান মোবাইল: <strong>{phone}</strong>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: '700',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* 4 Interactive PIN Input Boxes (Matching Image 1) */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '14px',
              margin: '16px 0 24px'
            }}>
              {pinDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={pinInputRefs[idx]}
                  type="password"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  autoFocus={idx === 0}
                  className="num-font"
                  style={{
                    width: '60px',
                    height: '64px',
                    borderRadius: '16px',
                    border: digit ? '2px solid #6366f1' : '2px solid #e2e8f0',
                    background: digit ? '#f5f7ff' : '#ffffff',
                    fontSize: '28px',
                    textAlign: 'center',
                    fontWeight: '900',
                    color: '#312e81',
                    outline: 'none',
                    boxShadow: digit ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>

            {/* "নিশ্চিত করুন" Button (Matching Image 1) */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '900',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px -4px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'যাচাই করা হচ্ছে...' : 'নিশ্চিত করুন'}
            </button>

            {/* "আপনার পিন ভুলে গেছেন?" Link (Matching Image 1) */}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                আপনার পিন ভুলে গেছেন?
              </button>
            </div>
          </>
        ) : (
          /* Admin Form */
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👑</div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                সুপার অ্যাডমিন পাসকোড
              </h2>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: '10px', fontSize: '12.5px', fontWeight: '700', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div>
              <input
                type="password"
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder="অ্যাডমিন পাসকোড (admin)"
                required
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px', border: '1.5px solid #cbd5e1',
                  fontSize: '15px', fontWeight: '700', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', background: '#be123c',
                color: '#ffffff', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer'
              }}
            >
              {loading ? 'লগইন হচ্ছে...' : 'অ্যাডমিন পোর্টালে প্রবেশ'}
            </button>
          </form>
        )}

        {/* Quick Demo Footer Action */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase' }}>
            ⚡ টেস্ট ডেমো লগইন (১-ক্লিক):
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTab('shop');
                setPhone('01986233234');
                setPinDigits(['1', '2', '3', '4']);
                setError('');
              }}
              style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                padding: '5px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                color: '#4338ca',
                cursor: 'pointer'
              }}
              title="মালিক মোড (PIN: 1234)"
            >
              👑 মালিক (1234)
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTab('shop');
                setPhone('01986233234');
                setPinDigits(['2', '2', '2', '2']);
                setError('');
              }}
              style={{
                background: '#dcfce7',
                border: '1px solid #bbf7d0',
                padding: '5px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                color: '#15803d',
                cursor: 'pointer'
              }}
              title="ক্যাশিয়ার মোড (PIN: 2222)"
            >
              🛒 ক্যাশিয়ার (2222)
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTab('shop');
                setPhone('01986233234');
                setPinDigits(['3', '3', '3', '3']);
                setError('');
              }}
              style={{
                background: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '5px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                color: '#b45309',
                cursor: 'pointer'
              }}
              title="ম্যানেজার মোড (PIN: 3333)"
            >
              💼 ম্যানেজার (3333)
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setTab('shop');
                setPhone('01986233234');
                setPinDigits(['4', '4', '4', '4']);
                setError('');
              }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: '5px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                color: '#334155',
                cursor: 'pointer'
              }}
              title="ফার্মাসিস্ট / সেলসম্যান (PIN: 4444)"
            >
              💊 ফার্মাসিস্ট (4444)
            </button>
          </div>
        </div>

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
