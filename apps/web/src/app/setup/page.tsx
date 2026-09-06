'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function SetupWizardPage() {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState<'grocery' | 'pharmacy' | 'clothing' | 'hardware' | 'electronics'>('grocery');
  const [shopName, setShopName] = useState('জননী ফার্মেসি');
  const [ownerName, setOwnerName] = useState('ডাঃ মোঃ আরিফুল ইসলাম');
  const [phone, setPhone] = useState('01711223344');
  const [address, setAddress] = useState('কলেজ গেট, ধামরাই, ঢাকা');
  const [printerSize, setPrinterSize] = useState<'58mm' | '80mm'>('58mm');
  const [importPreseededCatalog, setImportPreseededCatalog] = useState(true);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const industryProfiles = [
    {
      id: 'grocery',
      name: 'মুদি ও ডিপার্টমেন্টাল স্টোর',
      icon: '🛒',
      color: '#7c3aed',
      desc: 'চাল, ডাল, তেল, চিনি ও সাবান সহ ৫,০০০+ রেডিমেড মুদি পণ্যের বারকোড ক্যাটালগ',
      features: ['বারকোড অটো ডিটেকশন', 'কেজি/লিটার/বস্তা ইউনিট', 'দ্রুত ৩-ট্যাপ ক্যাশ মেমো']
    },
    {
      id: 'pharmacy',
      name: 'ফার্মেসি ও ড্রাগ স্টোর',
      icon: '💊',
      color: '#0284c7',
      desc: 'নাপা, সেকলো, ম্যাক্সপ্রো সহ ২০,০০০+ ওষুধের জেনেরিক নাম ও ৩০ দিন পূর্বের মেয়াদ অ্যালার্ট',
      features: ['জেনেরিক নাম সার্চ', 'পাতা/বক্স ইউনিট ও দাম', 'মেয়াদোত্তীর্ণ অ্যালার্ট']
    },
    {
      id: 'clothing',
      name: 'পোশাক ও ফ্যাশন শপ',
      icon: '👕',
      color: '#db2777',
      desc: 'পাঞ্জাবি, শার্ট, প্যান্ট ও শাড়ির সাইজ (S, M, L, XL), কালার ও ব্র্যান্ড ট্র্যাকিং',
      features: ['সাইজ ও কালার ভ্যারিয়েন্ট', 'বারকোড ট্যাগ জেনারেটর', 'সহজ সাইজ এক্সচেঞ্জ']
    },
    {
      id: 'hardware',
      name: 'হার্ডওয়্যার ও স্যানিটারি',
      icon: '🔧',
      color: '#ea580c',
      desc: 'রড, সিমেন্ট, পাইপ ও ফিটিংসের ফুট/মিটার/বস্তা ও দশমিক পরিমাপ হিসাব',
      features: ['দশমিক পরিমাপ ইউনিট', 'ডিলার ক্রয় চালান লেজার', 'ঠিকাদার বাকি খাতা']
    },
    {
      id: 'electronics',
      name: 'মোবাইল ও ইলেকট্রনিক্স',
      icon: '📱',
      color: '#4f46e5',
      desc: 'স্মার্টফোন ও গ্যাজেটের IMEI ট্র্যাকিং, ওয়ারেন্টি কার্ড ও রিপেয়ারিং জবশিট',
      features: ['IMEI/সিরিয়াল সার্চ', 'ডিজিটাল ওয়ারেন্টি কার্ড', 'সার্ভিসিং স্ট্যাটাস']
    }
  ];

  const handleCompleteSetup = async () => {
    setLoading(true);
    // Simulate industry profile configuration & database seeding
    setTimeout(() => {
      setLoading(false);
      setCompleted(true);
    }, 1500);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '30px 16px 50px' }}>
      
      {/* Wizard Step Progress */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        {[
          { num: 1, label: 'দোকানের ধরন' },
          { num: 2, label: 'দোকানের তথ্য' },
          { num: 3, label: 'ক্যাটালগ ও ফিনিশ' },
        ].map((s) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: step >= s.num ? '#4f46e5' : '#e2e8f0',
              color: step >= s.num ? '#fff' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '15px'
            }}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span style={{ fontSize: '13px', fontWeight: step === s.num ? '800' : '600', color: step === s.num ? '#1e293b' : '#94a3b8' }}>
              {s.label}
            </span>
            {s.num < 3 && <div style={{ width: '30px', height: '2px', background: step > s.num ? '#4f46e5' : '#e2e8f0', margin: '0 4px' }} />}
          </div>
        ))}
      </div>

      {/* STEP 1: SELECT INDUSTRY */}
      {step === 1 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
              🏪 আপনার দোকান কোন ধরনের?
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
              দোকানের ধরন অনুযায়ী সফটওয়্যারটি স্বয়ংক্রিয়ভাবে স্পেশালাইজড ফিচার এবং রেডিমেড ক্যাটালগ সেটআপ করবে।
            </p>
          </div>

          <div style={{ display: 'grid', gap: '14px', marginBottom: '32px' }}>
            {industryProfiles.map((ind) => {
              const isSelected = industry === ind.id;
              return (
                <div
                  key={ind.id}
                  onClick={() => {
                    setIndustry(ind.id as any);
                    if (ind.id === 'pharmacy') {
                      setShopName('জননী ফার্মেসি');
                      setOwnerName('ডাঃ মোঃ আরিফুল ইসলাম');
                    } else if (ind.id === 'grocery') {
                      setShopName('ভাই ভাই সুপার স্টোর');
                      setOwnerName('মোঃ রফিকুল ইসলাম');
                    } else if (ind.id === 'clothing') {
                      setShopName('রয়েল ফ্যাশন কালেকশন');
                      setOwnerName('আরিফ মাহমুদ');
                    }
                  }}
                  style={{
                    background: isSelected ? '#f5f3ff' : '#fff',
                    border: isSelected ? '2.5px solid #6366f1' : '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '20px 24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? '0 10px 25px rgba(99, 102, 241, 0.12)' : '0 4px 15px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <span style={{ fontSize: '36px', background: '#fff', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      {ind.icon}
                    </span>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                        {ind.name}
                      </h3>
                      <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                        {ind.desc}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {ind.features.map((f, i) => (
                          <span key={i} style={{ fontSize: '11px', background: isSelected ? '#e0e7ff' : '#f1f5f9', color: isSelected ? '#4338ca' : '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: isSelected ? '7px solid #4f46e5' : '2px solid #cbd5e1',
                    background: '#fff',
                    flexShrink: 0
                  }} />
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep(2)}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                padding: '14px 32px',
                borderRadius: '16px',
                fontWeight: '800',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(79, 70, 229, 0.35)'
              }}
            >
              পরবর্তী ধাপ (দোকানের তথ্য) ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SHOP PROFILE DETAILS */}
      {step === 2 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
              📝 দোকানের প্রোফাইল ও রসিদ সেটিংস
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
              এই তথ্যগুলো মেমো, থার্মাল রসিদ এবং কাস্টমার WhatsApp মেসেজে স্বয়ংক্রিয়ভাবে যাবে।
            </p>
          </div>

          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '28px' }}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  দোকানের নাম (ব্যানার ও ক্যাশ রসিদের শীর্ষে): *
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    মালিক / দায়িত্বপ্রাপ্ত ব্যক্তির নাম:
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                    মোবাইল নাম্বার (এসএমএস প্রেরক): *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  দোকানের ঠিকানা / বাজার লোকেশন:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  রসিদ প্রিন্টারের পেপার সাইজ:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setPrinterSize('58mm')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: printerSize === '58mm' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: printerSize === '58mm' ? '#eef2ff' : '#fff',
                      color: printerSize === '58mm' ? '#4338ca' : '#475569',
                      fontWeight: '800',
                      fontSize: '13.5px',
                      cursor: 'pointer'
                    }}
                  >
                    🖨️ 58mm ছোট ব্লুটুথ/USB POS
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinterSize('80mm')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: printerSize === '80mm' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: printerSize === '80mm' ? '#eef2ff' : '#fff',
                      color: printerSize === '80mm' ? '#4338ca' : '#475569',
                      fontWeight: '800',
                      fontSize: '13.5px',
                      cursor: 'pointer'
                    }}
                  >
                    🖨️ 80mm স্ট্যান্ডার্ড অটো-কাট POS
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(1)}
              style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '14px 24px', borderRadius: '16px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
            >
              ⬅️ পূর্ববর্তী
            </button>
            <button
              onClick={() => setStep(3)}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '16px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', boxShadow: '0 8px 25px rgba(79, 70, 229, 0.35)' }}
            >
              পরবর্তী ধাপ (ক্যাটালগ নির্বাচন) ➔
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CATALOG & FINALIZATION */}
      {step === 3 && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px' }}>
              📦 রেডিমেড ক্যাটালগ ও ডাটাবেজ ইনিশিয়ালাইজ
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
              আপনার নির্বাচিত <strong>{industry === 'pharmacy' ? 'ফার্মেসি' : (industry === 'grocery' ? 'মুদি' : 'পোশাক')}</strong> ইন্ডাস্ট্রির জন্য প্রাক-সংরক্ষিত ডাটাবেজ লোড করা হবে।
            </p>
          </div>

          <div style={{ background: '#fff', borderRadius: '24px', padding: '26px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '28px' }}>
            
            {/* Auto catalog toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#166534', display: 'block' }}>
                  ✓ রেডিমেড প্রিসিডেড {industry === 'pharmacy' ? 'ওষুধ ও জেনেরিক' : 'মুদি পণ্যের'} বারকোড ক্যাটালগ যুক্ত করুন
                </strong>
                <span style={{ fontSize: '12.5px', color: '#15803d' }}>
                  দোকানদারকে কষ্ট করে নতুন পণ্য টাইপ করতে হবে না, বারকোড স্ক্যান করলেই নাম ও দাম চলে আসবে।
                </span>
              </div>
              <input
                type="checkbox"
                checked={importPreseededCatalog}
                onChange={(e) => setImportPreseededCatalog(e.target.checked)}
                style={{ width: '22px', height: '22px', accentColor: '#16a34a' }}
              />
            </div>

            {/* Summary Review */}
            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
              সেটআপ সারসংক্ষেপ:
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px', fontSize: '13.5px' }}>
              <div><strong>দোকানের নাম:</strong> {shopName}</div>
              <div><strong>ইন্ডাস্ট্রি মোড:</strong> {industry === 'pharmacy' ? 'ফার্মেসি (ড্রাগ স্টোর)' : (industry === 'grocery' ? 'মুদি ও সুপার শপ' : 'পোশাক')}</div>
              <div><strong>মোবাইল নাম্বার:</strong> {phone}</div>
              <div><strong>প্রিন্টার সাইজ:</strong> {printerSize}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(2)}
              style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '14px 24px', borderRadius: '16px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
            >
              ⬅️ পূর্ববর্তী
            </button>
            <button
              onClick={handleCompleteSetup}
              disabled={loading}
              style={{
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                padding: '14px 36px',
                borderRadius: '16px',
                fontWeight: '900',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)'
              }}
            >
              {loading ? 'ডাটাবেজ সেটআপ হচ্ছে...' : '🚀 সম্পূর্ণ সেটআপ ও দোকান চালু করুন'}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETED SUCCESS SCREEN */}
      {completed && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '28px',
            padding: '36px 30px',
            width: '100%',
            maxWidth: '460px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
              অভিনন্দন! দোকান সফলভাবে রেডি!
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              <strong>{shopName}</strong> এর জন্য <strong>{industry === 'pharmacy' ? 'ফার্মেসি' : 'মুদি'}</strong> মোড এবং রেডিমেড ক্যাটালগ ডাটাবেজে কনফিগার করা হয়েছে।
            </p>

            <div style={{ display: 'grid', gap: '10px' }}>
              <Link
                href="/pos"
                style={{
                  background: '#22c55e',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '16px',
                  boxShadow: '0 8px 20px rgba(34, 197, 94, 0.35)'
                }}
              >
                ⚡ দ্রুত POS ক্যাশমেমো শুরু করুন
              </Link>
              <Link
                href="/"
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '12px',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '14px'
                }}
              >
                🏠 ড্যাশবোর্ডে যান
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
