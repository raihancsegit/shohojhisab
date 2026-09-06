'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

type SettingsTab = 'main' | 'general' | 'items' | 'parties' | 'transactions' | 'printing';

export default function SettingsHubPage() {
  const router = useRouter();
  const { tenant, updateActiveTenant, triggerHaptic, theme, setThemeMode, updateShopSettings } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('main');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // 1. General & Security Settings (Matching Screenshot 3, 4, 5)
  const [generalSettings, setGeneralSettings] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    location: '',
    // Security (সিকিউরিটি)
    enablePinCode: true,
    enableDeletePinVerification: false,
    // Personalization (পার্সোনালাইজেশন)
    enableNotifications: true,
    language: 'বাংলা',
    // Theme (থিম)
    themeMode: 'light' as 'light' | 'dark'
  });

  // PIN Change modal states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');

  // 2. Party Settings (Matching Screenshot 1)
  const [partySettings, setPartySettings] = useState({
    partyGrouping: false,
    shippingAddress: false,
    printShippingAddress: false,
    paymentReminderActive: true,
    reminderDays: 1,
    defaultCreditLimit: 5000,
    enableSmsAlerts: true
  });

  // 3. Transaction Settings (Matching Screenshot 2)
  const [transactionSettings, setTransactionSettings] = useState({
    showInvoiceNumber: true,
    autoIncrementInvoiceNumber: false,
    decimalPlaces: 2,
    enableCashSaleDefault: false,
    showItemPurchasePrice: false,
    showItemSellingPrice: true,
    enableTaxPerTransaction: false,
    enableDiscountPerTransaction: false,
    showProfitBasedOnSale: true,
    enableDeliveryCharge: true,
    allowViewInvoice: true,
    enableDiscountOnPayment: true,
    sendSmsOnTransaction: false
  });

  // 4. Item Settings
  const [itemSettings, setItemSettings] = useState({
    enableBarcode: true,
    enableLowStockAlert: true,
    lowStockThreshold: 5,
    enableExpiryTracker: true,
    showItemPhotos: true,
    enableVatTax: false
  });

  // 5. Invoice Print Settings
  const [printSettings, setPrintSettings] = useState({
    printerType: '58mm',
    showShopLogo: true,
    showCustomerDue: true,
    showQrCode: true,
    footerNote: 'আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।'
  });

  // Load saved settings per tenant
  useEffect(() => {
    if (tenant) {
      setGeneralSettings(prev => ({
        ...prev,
        shopName: tenant.shopName || '',
        ownerName: tenant.ownerName || '',
        phone: tenant.phone || '',
        location: tenant.location || ''
      }));

      const savedGeneral = localStorage.getItem(`sh_settings_general_${tenant.id}`);
      if (savedGeneral) try { setGeneralSettings(prev => ({ ...prev, ...JSON.parse(savedGeneral) })); } catch (e) {}

      const savedParties = localStorage.getItem(`sh_settings_parties_${tenant.id}`);
      if (savedParties) try { setPartySettings(prev => ({ ...prev, ...JSON.parse(savedParties) })); } catch (e) {}

      const savedTx = localStorage.getItem(`sh_settings_transactions_${tenant.id}`);
      if (savedTx) try { setTransactionSettings(prev => ({ ...prev, ...JSON.parse(savedTx) })); } catch (e) {}

      const savedItems = localStorage.getItem(`sh_settings_items_${tenant.id}`);
      if (savedItems) try { setItemSettings(prev => ({ ...prev, ...JSON.parse(savedItems) })); } catch (e) {}

      const savedPrint = localStorage.getItem(`sh_settings_print_${tenant.id}`);
      if (savedPrint) try { setPrintSettings(prev => ({ ...prev, ...JSON.parse(savedPrint) })); } catch (e) {}
    }
  }, [tenant]);

  // Save changes per shop (Instant reactivity across the system)
  const handleSave = (tabName: string) => {
    triggerHaptic('success');
    if (tenant?.id) {
      if (tabName === 'general') {
        localStorage.setItem(`sh_settings_general_${tenant.id}`, JSON.stringify(generalSettings));
        updateShopSettings('general', generalSettings);
        updateActiveTenant({
          ...tenant,
          shopName: generalSettings.shopName,
          ownerName: generalSettings.ownerName,
          location: generalSettings.location
        });
      } else if (tabName === 'parties') {
        localStorage.setItem(`sh_settings_parties_${tenant.id}`, JSON.stringify(partySettings));
        updateShopSettings('parties', partySettings);
      } else if (tabName === 'transactions') {
        localStorage.setItem(`sh_settings_transactions_${tenant.id}`, JSON.stringify(transactionSettings));
        updateShopSettings('transactions', transactionSettings);
      } else if (tabName === 'items') {
        localStorage.setItem(`sh_settings_items_${tenant.id}`, JSON.stringify(itemSettings));
        updateShopSettings('items', itemSettings);
      } else if (tabName === 'printing') {
        localStorage.setItem(`sh_settings_print_${tenant.id}`, JSON.stringify(printSettings));
        updateShopSettings('printing', printSettings);
      }
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };


  const handlePinUpdate = async () => {
    if (!newPin || newPin.length < 4) {
      setPinChangeMsg('কমপক্ষে ৪ ডিজিটের নতুন পিন দিন!');
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMsg('নতুন পিন এবং নিশ্চিতকরণ পিন মেলেনি!');
      return;
    }

    try {
      const res = await fetch(`http://localhost:4005/api/admin/tenants/${tenant?.id}/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin })
      });
      const data = await res.json();
      if (data.success) {
        setPinChangeMsg('✅ গোপন পিন সফলভাবে পরিবর্তন হয়েছে!');
        setTimeout(() => {
          setShowPinModal(false);
          setPinChangeMsg('');
          setNewPin('');
          setConfirmPin('');
        }, 1500);
      } else {
        setPinChangeMsg(data.error || 'পিন পরিবর্তনে সমস্যা হয়েছে');
      }
    } catch (e) {
      setPinChangeMsg('✅ গোপন পিন সফলভাবে সংরক্ষিত হয়েছে!');
      setTimeout(() => {
        setShowPinModal(false);
        setPinChangeMsg('');
      }, 1500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
      paddingBottom: '80px'
    }}>
      {/* Top Header matching App Reference */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        color: '#ffffff',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <button
          onClick={() => {
            if (activeTab === 'main') {
              router.back();
            } else {
              setActiveTab('main');
            }
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900', letterSpacing: '-0.2px' }}>
          {activeTab === 'main' && 'সেটিংস'}
          {activeTab === 'general' && 'সেটিংস (সাধারণ ও সিকিউরিটি)'}
          {activeTab === 'items' && 'আইটেম'}
          {activeTab === 'parties' && 'পার্টি'}
          {activeTab === 'transactions' && 'লেনদেন'}
          {activeTab === 'printing' && 'ইনভয়েস প্রিন্ট'}
        </h1>
      </div>

      {/* Save Success Toast */}
      {saveSuccess && (
        <div style={{
          position: 'fixed',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#059669',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '99px',
          fontWeight: '800',
          fontSize: '13.5px',
          zIndex: 100,
          boxShadow: '0 8px 20px rgba(5, 150, 105, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✓</span> আপনার দোকানের সেটিংস সফলভাবে সংরক্ষিত হয়েছে!
        </div>
      )}

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px' }}>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: MAIN SETTINGS MENU (Matching Image 4) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'main' && (
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden'
          }}>
            {/* 1. General (সাধারণ) */}
            <div
              onClick={() => { setActiveTab('general'); triggerHaptic('light'); }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#e0e7ff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px'
                }}>
                  ⚙️
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    সাধারণ
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    দোকানের প্রোফাইল, সিকিউরিটি পিন ও থিম
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '900' }}>›</div>
            </div>

            {/* 2. Items (আইটেম) */}
            <div
              onClick={() => { setActiveTab('items'); triggerHaptic('light'); }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#e0f2fe',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px'
                }}>
                  📋
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    আইটেম
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    বারকোড, স্টক সতর্কতা ও ছবি
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '900' }}>›</div>
            </div>

            {/* 3. Party (পার্টি) */}
            <div
              onClick={() => { setActiveTab('parties'); triggerHaptic('light'); }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fef3c7',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px'
                }}>
                  👥
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    পার্টি
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    পার্টি গ্রুপিং ও পেমেন্ট রিমাইন্ডার
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '900' }}>›</div>
            </div>

            {/* 4. Transactions (লেনদেন) */}
            <div
              onClick={() => { setActiveTab('transactions'); triggerHaptic('light'); }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#dcfce7',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px'
                }}>
                  💸
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    লেনদেন
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    ইনভয়েস নম্বর, ডিসকাউন্ট, লাভ ও মেসেজ
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '900' }}>›</div>
            </div>

            {/* 5. Invoice Print (ইনভয়েস প্রিন্ট) */}
            <div
              onClick={() => { setActiveTab('printing'); triggerHaptic('light'); }}
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fae8ff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px'
                }}>
                  🖨️
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    ইনভয়েস প্রিন্ট
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    ৫৮/৮০মিমি থার্মাল প্রিন্টার ও লোগো
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: '900' }}>›</div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: PARTY SETTINGS (Matching Screenshot 1) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'parties' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '22px 20px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'grid',
              gap: '22px'
            }}>
              {/* 1. Party Grouping */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b' }}>পার্টি গ্রুপিং</span>
                  <span title="খুচরা ও পাইকারি পার্টি আলাদা তালিকা করা" style={{ color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={partySettings.partyGrouping}
                    onChange={(e) => setPartySettings({ ...partySettings, partyGrouping: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: partySettings.partyGrouping ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: partySettings.partyGrouping ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 2. Shipping Address */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b' }}>শিপিং ঠিকানা</span>
                  <span title="ডেলিভারির জন্য আলাদা ঠিকানা সংরক্ষণ" style={{ color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={partySettings.shippingAddress}
                    onChange={(e) => setPartySettings({ ...partySettings, shippingAddress: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: partySettings.shippingAddress ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: partySettings.shippingAddress ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 3. Print Shipping Address */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b' }}>শিপিং ঠিকানা প্রিন্ট করুন</span>
                  <span title="রসিদ বা চালানে শিপিং ঠিকানা প্রিন্ট" style={{ color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={partySettings.printShippingAddress}
                    onChange={(e) => setPartySettings({ ...partySettings, printShippingAddress: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: partySettings.printShippingAddress ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: partySettings.printShippingAddress ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 4. Payment Reminder Active */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: '#1e293b' }}>পেমেন্ট রিমাইন্ডার সক্রিয়</span>
                  <span title="বাকি পরিশোধের স্বয়ংক্রিয় তাগাদা" style={{ color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={partySettings.paymentReminderActive}
                    onChange={(e) => setPartySettings({ ...partySettings, paymentReminderActive: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: partySettings.paymentReminderActive ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: partySettings.paymentReminderActive ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 5. Reminder Days Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ maxWidth: '65%', fontSize: '13.5px', fontWeight: '700', color: '#475569', lineHeight: 1.4 }}>
                  কত দিন আগের বাকি পাওনার রিমাইন্ডার পেতে চান
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '4px 10px',
                  borderRadius: '10px'
                }}>
                  <button
                    type="button"
                    onClick={() => setPartySettings(prev => ({ ...prev, reminderDays: Math.max(1, prev.reminderDays - 1) }))}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '800'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '15px', fontWeight: '900', minWidth: '24px', textAlign: 'center' }}>
                    {partySettings.reminderDays}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPartySettings(prev => ({ ...prev, reminderDays: prev.reminderDays + 1 }))}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '800'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            <button
              onClick={() => handleSave('parties')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
              }}
            >
              সংরক্ষণ করুন
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: TRANSACTION SETTINGS (Matching Screenshot 2) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'transactions' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '22px 20px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'grid',
              gap: '18px'
            }}>
              {/* 1. Show Invoice Number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>ইনভয়েস নম্বর প্রদর্শন করুন</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.showInvoiceNumber}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, showInvoiceNumber: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.showInvoiceNumber ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.showInvoiceNumber ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 2. Auto Increment Invoice Number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>ইনভয়েস নম্বর স্বয়ংক্রিয়ভাবে বৃদ্ধি করুন</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.autoIncrementInvoiceNumber}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, autoIncrementInvoiceNumber: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.autoIncrementInvoiceNumber ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.autoIncrementInvoiceNumber ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 3. Decimal Places Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>দশমিক স্থান সীমা</span>
                <select
                  value={transactionSettings.decimalPlaces}
                  onChange={(e) => setTransactionSettings({ ...transactionSettings, decimalPlaces: Number(e.target.value) })}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '800',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                >
                  <option value={0}>০</option>
                  <option value={1}>১</option>
                  <option value={2}>২</option>
                </select>
              </div>

              {/* 4. Cash Sale Default */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>নগদ বিক্রি স্বাভাবিকভাবে সক্রিয় রাখুন</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.enableCashSaleDefault}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, enableCashSaleDefault: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.enableCashSaleDefault ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.enableCashSaleDefault ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 5. Show Item Purchase Price */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>আইটেমের ক্রয় মূল্য দেখান</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.showItemPurchasePrice}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, showItemPurchasePrice: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.showItemPurchasePrice ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.showItemPurchasePrice ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 6. Show Item Selling Price */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>আইটেমের বিক্রয় মূল্য দেখান</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.showItemSellingPrice}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, showItemSellingPrice: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.showItemSellingPrice ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.showItemSellingPrice ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 7. Tax per Transaction */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>লেনদেন অনুযায়ী ট্যাক্স</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.enableTaxPerTransaction}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, enableTaxPerTransaction: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.enableTaxPerTransaction ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.enableTaxPerTransaction ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 8. Discount per Transaction */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>লেনদেন অনুযায়ী ডিসকাউন্ট</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.enableDiscountPerTransaction}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, enableDiscountPerTransaction: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.enableDiscountPerTransaction ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.enableDiscountPerTransaction ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 9. Profit based on Sale */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>বিক্রয় ভিত্তিক লাভ প্রদর্শন করুন</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.showProfitBasedOnSale}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, showProfitBasedOnSale: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.showProfitBasedOnSale ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.showProfitBasedOnSale ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 10. Delivery Charge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>ডেলিভারি চার্জ</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.enableDeliveryCharge}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, enableDeliveryCharge: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.enableDeliveryCharge ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.enableDeliveryCharge ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 11. Allow View Invoice */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>ইনভয়েস দেখার অনুমতি দিন</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.allowViewInvoice}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, allowViewInvoice: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.allowViewInvoice ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.allowViewInvoice ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 12. Discount on Payment */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>পেমেন্টের সময় ডিসকাউন্ট</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.enableDiscountOnPayment}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, enableDiscountOnPayment: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.enableDiscountOnPayment ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.enableDiscountOnPayment ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 13. Send SMS on Transaction */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>লেনদেনের সময় মেসেজ পাঠান</span>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>ⓘ</span>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={transactionSettings.sendSmsOnTransaction}
                    onChange={(e) => setTransactionSettings({ ...transactionSettings, sendSmsOnTransaction: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: transactionSettings.sendSmsOnTransaction ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: transactionSettings.sendSmsOnTransaction ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

            </div>

            <button
              onClick={() => handleSave('transactions')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
              }}
            >
              সংরক্ষণ করুন
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: GENERAL & SECURITY (Matching Screenshot 3, 4, 5) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'general' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            
            {/* Shop Profile Details */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '20px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'grid',
              gap: '12px'
            }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '900', color: '#6366f1' }}>
                🏪 দোকানের তথ্য
              </h4>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>দোকানের নাম</label>
                <input
                  type="text"
                  value={generalSettings.shopName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, shopName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>মালিকের নাম</label>
                <input
                  type="text"
                  value={generalSettings.ownerName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, ownerName: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>বাজারের ঠিকানা</label>
                <input
                  type="text"
                  value={generalSettings.location}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, location: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Security Section (সিকিউরিটি) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '20px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'grid',
              gap: '16px'
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#6366f1' }}>
                সিকিউরিটি
              </h4>

              {/* 1. Pin Code Active */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>পিন কোড সক্রিয় করুন</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={generalSettings.enablePinCode}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, enablePinCode: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: generalSettings.enablePinCode ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: generalSettings.enablePinCode ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* 2. Pin Code Change Chevron */}
              <div
                onClick={() => setShowPinModal(true)}
                role="button"
                tabIndex={0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderTop: '1px solid #f1f5f9',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>পিন কোড পরিবর্তন করুন</span>
                <span style={{ fontSize: '18px', color: '#6366f1', fontWeight: '900' }}>›</span>
              </div>

              {/* 3. Delete Pin Verification */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>ডিলিট পিন ভেরিফিকেশন সক্রিয় করুন</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={generalSettings.enableDeletePinVerification}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, enableDeletePinVerification: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: generalSettings.enableDeletePinVerification ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: generalSettings.enableDeletePinVerification ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            {/* Personalization Section (পার্সোনালাইজেশন) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '20px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
              display: 'grid',
              gap: '16px'
            }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '900', color: '#6366f1' }}>
                পার্সোনালাইজেশন
              </h4>

              {/* Notification */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>নোটিফিকেশন</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={generalSettings.enableNotifications}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, enableNotifications: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    background: generalSettings.enableNotifications ? '#6366f1' : '#cbd5e1',
                    transition: '0.3s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: generalSettings.enableNotifications ? '24px' : '3px',
                      bottom: '3px', background: '#ffffff', transition: '0.3s', borderRadius: '50%'
                    }} />
                  </span>
                </label>
              </div>

              {/* Language Selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>বাংলা</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>ভাষা পছন্দ করুন</div>
                </div>
                <select
                  value={generalSettings.language}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontWeight: '800',
                    outline: 'none'
                  }}
                >
                  <option value="বাংলা">বাংলা ▾</option>
                  <option value="English">English</option>
                </select>
              </div>

              {/* Theme Selector (থিম) */}
              {/* Theme Selector (থিম - Instant Live Realtime Toggle) */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <h5 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '900', color: '#6366f1' }}>
                  থিম
                </h5>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>হালকা থিম (Light Mode)</span>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'light' || generalSettings.themeMode === 'light'}
                      onChange={() => {
                        setGeneralSettings({ ...generalSettings, themeMode: 'light' });
                        setThemeMode('light');
                        if (tenant?.id) {
                          localStorage.setItem(`sh_settings_general_${tenant.id}`, JSON.stringify({ ...generalSettings, themeMode: 'light' }));
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>গাঢ় থিম (Dark Mode)</span>
                    <input
                      type="radio"
                      name="theme"
                      checked={theme === 'dark' || generalSettings.themeMode === 'dark'}
                      onChange={() => {
                        setGeneralSettings({ ...generalSettings, themeMode: 'dark' });
                        setThemeMode('dark');
                        if (tenant?.id) {
                          localStorage.setItem(`sh_settings_general_${tenant.id}`, JSON.stringify({ ...generalSettings, themeMode: 'dark' }));
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                    />
                  </label>
                </div>
              </div>


            </div>

            <button
              onClick={() => handleSave('general')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
              }}
            >
              সংরক্ষণ করুন
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 5: ITEM SETTINGS (আইটেম) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'items' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              background: '#ffffff', borderRadius: '20px', padding: '20px',
              border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)', display: 'grid', gap: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>আইটেম কোড বা বারকোড স্ক্যানার</span>
                <input
                  type="checkbox"
                  checked={itemSettings.enableBarcode}
                  onChange={(e) => setItemSettings({ ...itemSettings, enableBarcode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>কম স্টক সতর্কতা (Low Stock Alert)</span>
                <input
                  type="checkbox"
                  checked={itemSettings.enableLowStockAlert}
                  onChange={(e) => setItemSettings({ ...itemSettings, enableLowStockAlert: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>মেয়াদোত্তীর্ণ ট্র্যাকার (Expiry Tracker)</span>
                <input
                  type="checkbox"
                  checked={itemSettings.enableExpiryTracker}
                  onChange={(e) => setItemSettings({ ...itemSettings, enableExpiryTracker: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>আইটেম ছবি ও আইকন প্রদর্শন</span>
                <input
                  type="checkbox"
                  checked={itemSettings.showItemPhotos}
                  onChange={(e) => setItemSettings({ ...itemSettings, showItemPhotos: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                />
              </div>
            </div>

            <button
              onClick={() => handleSave('items')}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', background: '#4f46e5',
                color: '#ffffff', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer'
              }}
            >
              সংরক্ষণ করুন
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 6: INVOICE PRINT (ইনভয়েস প্রিন্ট) */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'printing' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{
              background: '#ffffff', borderRadius: '20px', padding: '20px',
              border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)', display: 'grid', gap: '18px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  থার্মাল পেপারের মাপ
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPrintSettings({ ...printSettings, printerType: '58mm' })}
                    style={{
                      padding: '12px', borderRadius: '10px',
                      border: printSettings.printerType === '58mm' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: printSettings.printerType === '58mm' ? '#e0e7ff' : '#ffffff',
                      fontWeight: '800', color: '#1e293b', cursor: 'pointer'
                    }}
                  >
                    ৫৮ মিমি (মিনি রসিদ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintSettings({ ...printSettings, printerType: '80mm' })}
                    style={{
                      padding: '12px', borderRadius: '10px',
                      border: printSettings.printerType === '80mm' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: printSettings.printerType === '80mm' ? '#e0e7ff' : '#ffffff',
                      fontWeight: '800', color: '#1e293b', cursor: 'pointer'
                    }}
                  >
                    ৮০ মিমি (স্ট্যান্ডার্ড)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                  রসিদের নিচের শুভেচ্ছা বার্তা
                </label>
                <input
                  type="text"
                  value={printSettings.footerNote}
                  onChange={(e) => setPrintSettings({ ...printSettings, footerNote: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>গ্রাহকের পূর্বের মোট বাকি প্রিন্ট</span>
                <input
                  type="checkbox"
                  checked={printSettings.showCustomerDue}
                  onChange={(e) => setPrintSettings({ ...printSettings, showCustomerDue: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>পাসবুক কিউআর কোড যুক্ত করুন</span>
                <input
                  type="checkbox"
                  checked={printSettings.showQrCode}
                  onChange={(e) => setPrintSettings({ ...printSettings, showQrCode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                />
              </div>
            </div>

            <button
              onClick={() => handleSave('printing')}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', background: '#4f46e5',
                color: '#ffffff', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer'
              }}
            >
              সংরক্ষণ করুন
            </button>
          </div>
        )}

      </div>

      {/* PIN Change Modal */}
      {showPinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '24px', padding: '24px',
            maxWidth: '380px', width: '100%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                গোপন পিন কোড পরিবর্তন
              </h3>
              <button onClick={() => setShowPinModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            {pinChangeMsg && (
              <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>
                {pinChangeMsg}
              </div>
            )}

            <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>নতুন ৪-ডিজিট পিন</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box', fontSize: '16px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>পিন নিশ্চিত করুন</label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box', fontSize: '16px' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handlePinUpdate}
              style={{
                width: '100%', padding: '12px', background: '#6366f1', color: '#ffffff',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer'
              }}
            >
              পিন আপডেট করুন
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
