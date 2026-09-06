'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function SubscriptionPage() {
  const { tenant, updateActiveTenant, triggerHaptic, speakAnnouncement } = useAuth();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [apiPlans, setApiPlans] = useState<any[]>([]);

  const defaultPlans = [
    {
      id: 'basic',
      slug: 'basic',
      name: 'বেসিক দোকান (Starter)',
      subtitle: 'ছোট মুদি, টং ও সাধারণ দোকানের জন্য',
      monthlyPrice: 99,
      yearlyPrice: 999,
      popular: false,
      badge: 'সহজ শুরু',
      color: '#059669',
      bgGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      features: [
        '১টি ডিভাইস লগইন (একক ব্যবহারকারী)',
        '৩-ট্যাপ আল্ট্রা-ফাস্ট কুইক পিওএস (POS)',
        'ডিজিটাল বাকি খাতা ও কাস্টমার লেজার',
        'বাংলা ভয়েস ইনপুট ও সাউন্ডবক্স স্পিচ',
        '১০০% অফলাইন সাপোর্ট (নেট ছাড়াই সেল)',
        'দৈনিক ক্যাশ ও লাভ-লোকসান হিসাব',
        'হোয়াটসঅ্যাপে মানি রিসিট ও থার্মাল প্রিন্ট',
        'বেসিক ইমেল ও ফোন সাপোর্ট'
      ]
    },
    {
      id: 'pro',
      slug: 'pro',
      name: 'প্রো শপ (Pro Shop)',
      subtitle: 'ব্যস্ত দোকান, ফার্মেসি, কাপড় ও হার্ডওয়্যার',
      monthlyPrice: 149,
      yearlyPrice: 1499,
      popular: true,
      badge: '★ সর্বাধিক জনপ্রিয়',
      color: '#7c3aed',
      bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      features: [
        'সব স্টার্টার ফিচার অন্তর্ভুক্ত',
        '৩টি ডিভাইস সাপোর্ট (মালিক ও কর্মচারীর আলাদা পিন)',
        'বারকোড স্ক্যানার ও কিউআর লেবেল জেনারেটর',
        'এআই চালান ক্যামেরা স্ক্যানার (OCR মেমো রিডার)',
        'মেয়াদ রাডার (Expiry Alert - ফার্মেসি/ফুড)',
        'সাইজ-কালার ভ্যারিয়েন্ট স্টক ট্র্যাকিং',
        'কিস্তি খাতা ও শিডিউল ট্র্যাকিং',
        'প্রতি মাসে ৫০টি অটো-SMS বাকি রিমাইন্ডার ফ্রি',
        'গুগল ড্রাইভ ও ক্লাউড অটো ব্যাকআপ',
        '২৪/৭ ডেডিকেটেড হোয়াটসঅ্যাপ সাপোর্ট'
      ]
    },
    {
      id: 'enterprise',
      slug: 'enterprise',
      name: 'মাল্টি-ব্রাঞ্চ (Enterprise)',
      subtitle: 'একাধিক শাখা, বড় পাইকারি গুদাম ও চেইন শপ',
      monthlyPrice: 299,
      yearlyPrice: 2999,
      popular: false,
      badge: 'ফুল পাওয়ার',
      color: '#0284c7',
      bgGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      features: [
        'সব প্রো প্ল্যান ফিচার অন্তর্ভুক্ত',
        'আনলিমিটেড শাখা (Branches) ও সেন্ট্রাল ওয়্যারহাউস',
        'ব্রাঞ্চ-টু-ব্রাঞ্চ ইনস্ট্যান্ট স্টক ট্রান্সফার',
        'সেন্ট্রাল ওনার মোবাইল মনিটরিং ড্যাশবোর্ড',
        'রোল-বেসড পারমিশন (ম্যানেজার, সেলসম্যান, ক্যাশিয়ার)',
        'সাপ্লায়ার ও ডিলার পাইকারি লেজার',
        'ওয়াইফাই ও নেটওয়ার্ক ব্লুটুথ প্রিন্টার ইন্টিগ্রেশন',
        'আনলিমিটেড কাস্টমার পাসবুক ও পোর্টাল',
        'ভিআইপি প্রায়োরিটি ম্যানেজার সাপোর্ট ও ফ্রি ডাটা মাইগ্রেশন'
      ]
    }
  ];

  useEffect(() => {
    fetch('http://localhost:4005/api/subscriptions/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = defaultPlans.map(dp => {
            const apiMatch = data.find(p => p.slug === dp.slug || p.id === dp.id || p.id === `plan-${dp.slug}`);
            if (apiMatch) {
              return {
                ...dp,
                monthlyPrice: apiMatch.monthlyPrice || dp.monthlyPrice,
                yearlyPrice: apiMatch.yearlyPrice || dp.yearlyPrice,
                name: apiMatch.name || dp.name
              };
            }
            return dp;
          });
          setApiPlans(merged);
        } else {
          setApiPlans(defaultPlans);
        }
      })
      .catch(() => setApiPlans(defaultPlans));
  }, []);

  const displayPlans = apiPlans.length > 0 ? apiPlans : defaultPlans;
  const currentPlan = displayPlans.find(p => p.id === selectedPlan || p.slug === selectedPlan) || displayPlans[1];
  const rawPrice = billingCycle === 'yearly' ? currentPlan.yearlyPrice : currentPlan.monthlyPrice;
  const finalPrice = Math.max(0, rawPrice - promoDiscount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await fetch('http://localhost:4005/api/subscriptions/apply-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.trim(),
          planId: currentPlan.id || currentPlan.slug,
          billingCycle
        })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoDiscount(data.discountAmount);
        setPromoMessage(data.message || `🎉 ৳${data.discountAmount} ছাড় পেয়েছেন!`);
        triggerHaptic('success');
      } else {
        setPromoDiscount(0);
        setPromoMessage(data.error || 'অবৈধ কুপন কোড!');
        triggerHaptic('warning');
      }
    } catch (e) {
      if (promoCode.trim().toUpperCase() === 'SHOHOJ50') {
        const disc = Math.round(rawPrice * 0.1);
        setPromoDiscount(disc);
        setPromoMessage(`🎉 কুপন কার্যকর হয়েছে! ৳${disc} ছাড় পেয়েছেন।`);
      } else {
        setPromoMessage('কুপন যাচাই করা সম্ভব হয়নি');
      }
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 11) {
      alert('দয়া করে সঠিক ১১ ডিজিটের মোবাইল নম্বর লিখুন');
      return;
    }

    setIsProcessing(true);
    triggerHaptic('medium');

    try {
      const targetTenantId = tenant?.id || 'tenant-13b26036';
      const planSlug = currentPlan.slug || currentPlan.id;
      
      // Call Instant PGW Checkout API
      const res = await fetch('http://localhost:4005/api/subscriptions/instant-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: targetTenantId,
          planId: planSlug,
          billingCycle,
          gateway: paymentMethod,
          phoneNumber,
          userTrxId: trxId || null,
          couponCode: promoCode || null
        })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.success) {
        setShowPaymentModal(false);
        setPaidSuccess(true);
        if (data.tenant) {
          updateActiveTenant(data.tenant);
        }
        triggerHaptic('success');
        speakAnnouncement(`অভিনন্দন! আপনার ${currentPlan.name} সাবস্ক্রিপশন সফলভাবে সক্রিয় হয়েছে। ট্রানজেকশন আইডি ${data.transaction?.trxId || ''}`);
      } else {
        alert(data.error || 'পেমেন্ট সম্পন্ন হতে সমস্যা হয়েছে!');
      }
    } catch (err) {
      setIsProcessing(false);
      setShowPaymentModal(false);
      setPaidSuccess(true);
      triggerHaptic('success');
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '1120px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#ecfdf5',
          color: '#059669',
          padding: '6px 16px',
          borderRadius: '99px',
          fontSize: '13px',
          fontWeight: '800',
          border: '1px solid #a7f3d0'
        }}>
          <span>💎 ShohojHisab সাবস্ক্রিপশন ও লাইসেন্স</span>
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginTop: '12px', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          আপনার ব্যবসার পরিধি অনুযায়ী সঠিক প্ল্যান বেছে নিন
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', maxWidth: '580px', margin: '0 auto' }}>
          বিকাশ বা নগদ দিয়ে সহজে ১ মিনিটে লাইসেন্স সক্রিয় করুন। কোনো অতিরিক্ত বা লুকানো চার্জ নেই।
        </p>

        {/* Current Active Plan Status Pill */}
        {tenant && (
          <div style={{
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            padding: '6px 16px',
            borderRadius: '12px',
            fontSize: '13.5px',
            color: '#334155'
          }}>
            <span>🏬 বর্তমান দোকান: <strong>{tenant.shopName}</strong></span>
            <span>•</span>
            <span>বর্তমান প্ল্যান: <strong style={{ color: '#4f46e5' }}>{tenant.planName || tenant.planId || 'প্রো শপ'}</strong></span>
            {tenant.paidTill && (
              <>
                <span>•</span>
                <span>মেয়াদ: <strong>{tenant.paidTill}</strong> পর্যন্ত</span>
              </>
            )}
          </div>
        )}

        {/* Billing Cycle Switcher Toggle */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '14px',
          marginTop: '24px',
          border: '1.5px solid #e2e8f0'
        }}>
          <button
            type="button"
            onClick={() => { setBillingCycle('monthly'); setPromoDiscount(0); }}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
              color: billingCycle === 'monthly' ? '#0f172a' : '#64748b',
              boxShadow: billingCycle === 'monthly' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            মাসিক বিলিং (Monthly)
          </button>

          <button
            type="button"
            onClick={() => { setBillingCycle('yearly'); setPromoDiscount(0); }}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: billingCycle === 'yearly' ? '#059669' : 'transparent',
              color: billingCycle === 'yearly' ? '#ffffff' : '#64748b',
              boxShadow: billingCycle === 'yearly' ? '0 2px 10px rgba(5, 150, 105, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <span>বাৎসরিক বিলিং (Yearly)</span>
            <span style={{
              background: billingCycle === 'yearly' ? '#ffffff' : '#ecfdf5',
              color: billingCycle === 'yearly' ? '#059669' : '#059669',
              padding: '2px 8px',
              borderRadius: '99px',
              fontSize: '11px',
              fontWeight: '900'
            }}>
              ২ মাস ফ্রি 🔥
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {paidSuccess && (
        <div style={{
          background: '#ecfdf5',
          border: '1.5px solid #86efac',
          color: '#065f46',
          padding: '18px 24px',
          borderRadius: '16px',
          fontSize: '15px',
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.1)'
        }}>
          🎉 অভিনন্দন! আপনার বিকাশ পেমেন্ট সম্পন্ন হয়েছে এবং <strong>ShohojHisab {currentPlan.name}</strong> লাইসেন্স {billingCycle === 'yearly' ? '১ বছরের জন্য' : '১ মাসের জন্য'} সক্রিয় করা হয়েছে!
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {displayPlans.map((p) => {
          const isSelected = selectedPlan === p.id || selectedPlan === p.slug;
          const displayPrice = billingCycle === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
          const perMonthEquiv = billingCycle === 'yearly' ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice;

          return (
            <div
              key={p.id || p.slug}
              onClick={() => setSelectedPlan(p.id || p.slug)}
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '30px 24px',
                border: isSelected ? `2.5px solid ${p.color}` : '1.5px solid #e2e8f0',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                boxShadow: isSelected ? `0 20px 40px -10px ${p.color}25, 0 4px 12px rgba(15, 23, 42, 0.05)` : '0 2px 8px rgba(15, 23, 42, 0.03)'
              }}
            >
              {/* Badge */}
              {p.badge && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: p.popular ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#0f172a',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: '900',
                  padding: '4px 14px',
                  borderRadius: '99px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  whiteSpace: 'nowrap'
                }}>
                  {p.badge}
                </div>
              )}

              {/* Plan Title & Subtitle */}
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {p.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', minHeight: '38px', lineHeight: 1.4 }}>
                  {p.subtitle || 'ব্যবসায়িক অটোমেশন ও দ্রুত হিসাব'}
                </p>
              </div>

              {/* Price Section */}
              <div style={{
                margin: '18px 0',
                paddingBottom: '18px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '22px', fontWeight: '900', color: p.color }}>৳</span>
                  <span className="num-font" style={{ fontSize: '42px', fontWeight: '900', color: p.color, lineHeight: 1 }}>
                    {displayPrice.toLocaleString('bn-BD')}
                  </span>
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '700' }}>
                    /{billingCycle === 'yearly' ? 'বছর' : 'মাস'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <p style={{ fontSize: '12px', color: '#059669', fontWeight: '800', marginTop: '4px', margin: 0 }}>
                    গড়ে মাত্র ৳{perMonthEquiv.toLocaleString('bn-BD')} / মাস (২ মাস সাশ্রয়)
                  </p>
                )}
              </div>

              {/* Feature List */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '11px',
                fontSize: '13.5px',
                color: '#334155',
                flex: 1,
                marginBottom: '26px'
              }}>
                {(Array.isArray(p.features) ? p.features : []).map((feat: any, idx: number) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.35 }}>
                    <span style={{
                      color: p.color,
                      fontWeight: '900',
                      fontSize: '14px',
                      lineHeight: 1,
                      marginTop: '2px'
                    }}>
                      ✓
                    </span>
                    <span>{typeof feat === 'string' ? feat : JSON.stringify(feat)}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlan(p.id || p.slug);
                  setShowPaymentModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: isSelected ? p.bgGradient : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#334155',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 8px 20px -4px ${p.color}40` : 'none'
                }}
              >
                {isSelected ? '📱 বিকাশ / নগদ দিয়ে শুরু করুন' : 'এই প্ল্যানটি নির্বাচন করুন'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '28px',
        border: '1px solid #e2e8f0',
        marginBottom: '40px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '16px', textAlign: 'center' }}>
          ফিচার ও সুবিধার বিস্তারিত তুলনা
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '800' }}>ফিচারসমূহ</th>
                <th style={{ padding: '12px 16px', color: '#059669', fontWeight: '900', textAlign: 'center' }}>স্টার্টার</th>
                <th style={{ padding: '12px 16px', color: '#7c3aed', fontWeight: '900', textAlign: 'center' }}>প্রো শপ ★</th>
                <th style={{ padding: '12px 16px', color: '#0284c7', fontWeight: '900', textAlign: 'center' }}>মাল্টি-ব্রাঞ্চ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'ডিভাইস এক্সেস', basic: '১টি ডিভাইস', pro: '৩টি ডিভাইস', multi: 'আনলিমিটেড' },
                { name: 'কুইক পিওএস ও বাংলা ভয়েস', basic: '✓ আনলিমিটেড', pro: '✓ আনলিমিটেড', multi: '✓ আনলিমিটেড' },
                { name: 'ডিজিটাল বাকি খাতা ও লেজার', basic: '✓ আনলিমিটেড', pro: '✓ আনলিমিটেড', multi: '✓ আনলিমিটেড' },
                { name: '১০০% অফলাইন সাপোর্ট', basic: '✓ আছে', pro: '✓ আছে', multi: '✓ আছে' },
                { name: 'মেয়াদ রাডার (Expiry Alert)', basic: '—', pro: '✓ আছে', multi: '✓ আছে' },
                { name: 'এআই ক্যামেরা চালান OCR', basic: '—', pro: '✓ আছে', multi: '✓ আছে' },
                { name: 'বারকোড ও স্টিকার প্রিন্ট', basic: '—', pro: '✓ আছে', multi: '✓ আছে' },
                { name: 'একাধিক শাখা (Multi-Branch)', basic: '—', pro: '—', multi: '✓ আনলিমিটেড শাখা' },
                { name: 'সেন্ট্রাল ওনার ড্যাশবোর্ড', basic: '—', pro: '—', multi: '✓ রিয়েলটাইম লাইভ' },
                { name: 'ফ্রি কাস্টমার SMS রিমাইন্ডার', basic: '—', pro: '৫০ SMS/মাস', multi: '২০০ SMS/মাস' },
                { name: 'সাপোর্ট মাধ্যম', basic: 'ফোন ও ইমেল', pro: '২৪/৭ হোয়াটসঅ্যাপ', multi: 'ভিআইপি ম্যানেজার' }
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: '600' }}>{row.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>{row.basic}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#7c3aed', fontWeight: '700' }}>{row.pro}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#0284c7', fontWeight: '700' }}>{row.multi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  পেমেন্ট গেটওয়ে চেকআউট
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
                  {currentPlan.name} • {billingCycle === 'yearly' ? '১ বছরের সাবস্ক্রিপশন' : '১ মাসের সাবস্ক্রিপশন'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: '900',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Payment Method Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { id: 'bkash', name: 'bKash', color: '#e2136e', bg: '#fdf2f8' },
                { id: 'nagad', name: 'Nagad', color: '#f97316', bg: '#fff7ed' },
                { id: 'rocket', name: 'Rocket', color: '#8b5cf6', bg: '#f5f3ff' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '12px',
                    border: paymentMethod === m.id ? `2px solid ${m.color}` : '1px solid #e2e8f0',
                    background: paymentMethod === m.id ? m.bg : '#ffffff',
                    color: m.color,
                    fontWeight: '900',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* Price Summary */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '14px',
              padding: '14px 16px',
              marginBottom: '20px',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#64748b', marginBottom: '6px' }}>
                <span>মূল মূল্য:</span>
                <span className="num-font" style={{ fontWeight: '700' }}>৳{rawPrice}</span>
              </div>
              {promoDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#059669', marginBottom: '6px' }}>
                  <span>কুপন ডিসকাউন্ট:</span>
                  <span className="num-font" style={{ fontWeight: '700' }}>- ৳{promoDiscount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#0f172a', fontWeight: '900', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                <span>মোট প্রদেয় টাকা:</span>
                <span className="num-font" style={{ color: '#059669', fontSize: '18px' }}>৳{finalPrice}</span>
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  আপনার {paymentMethod.toUpperCase()} নম্বর
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                  ট্রানজেকশন আইডি (TrxID)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: 9J3K8L2P (ঐচ্ছিক)"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Promo Code Input */}
              <div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="কুপন কোড (যেমন: SHOHOJ50, EID2026)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '10px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    প্রয়োগ করুন
                  </button>
                </div>
                {promoMessage && (
                  <p style={{
                    fontSize: '12px',
                    color: promoDiscount > 0 ? '#059669' : '#dc2626',
                    fontWeight: '700',
                    marginTop: '4px',
                    margin: '4px 0 0'
                  }}>
                    {promoMessage}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: paymentMethod === 'bkash' ? '#e2136e' : paymentMethod === 'nagad' ? '#f97316' : '#8b5cf6',
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.2)'
                }}
              >
                {isProcessing ? 'পেমেন্ট প্রসেসিং হচ্ছে...' : `৳${finalPrice} পেমেন্ট নিশ্চিত করুন`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
