'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatBDDate, formatBDDateTime } from '../../lib/dateUtils';
import DataLoader from '../../components/DataLoader';
import { playSuccessChime } from '../../lib/audioFeedbackUtils';

interface SupplyItem {
  productId?: string;
  productName: string;
  category?: string;
  quantity: number | string;
  unit: string;
  purchasePrice: number | string;
  sellingPrice: number | string;
}

export default function DealerPortalPage() {
  const router = useRouter();

  // Dealer Auth State
  const [dealer, setDealer] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login Form States (if not logged in)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Portal States
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'deliver' | 'history' | 'profile'>('deliver');

  // Supply Form State
  const [challanNo, setChallanNo] = useState('');
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([
    { productName: '', quantity: '', unit: 'পিস', purchasePrice: '', sellingPrice: '' }
  ]);
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [supplyNote, setSupplyNote] = useState('');
  const [supplySubmitting, setSupplySubmitting] = useState(false);
  const [supplySuccessModal, setSupplySuccessModal] = useState<any | null>(null);
  const [notice, setNotice] = useState('');

  // Selected Challan Detail View Modal
  const [viewingChallan, setViewingChallan] = useState<any | null>(null);

  // PIN Change Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // 1. Restore Dealer Session from localStorage
  useEffect(() => {
    try {
      const savedDealer = localStorage.getItem('lbos_active_dealer');
      if (savedDealer) {
        const parsed = JSON.parse(savedDealer);
        setDealer(parsed);
        if (parsed.tenantId) {
          setSelectedShopId(parsed.tenantId);
        }
      }
    } catch (e) {
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Generate random Challan No on mount or reset
  const generateNewChallanNo = () => {
    const num = Math.floor(10000 + Math.random() * 90000);
    setChallanNo(`CH-${num}`);
  };

  useEffect(() => {
    generateNewChallanNo();
  }, []);

  // 2. Fetch Shops & Supply History when dealer is active
  const loadPortalData = async (dealerId: string, shopId?: string) => {
    setLoadingData(true);
    try {
      // Fetch shops
      const shopsRes = await fetch(`/api/dealer/shops?dealerId=${dealerId}`);
      if (shopsRes.ok) {
        const shopsData = await shopsRes.json();
        setShops(Array.isArray(shopsData) ? shopsData : []);
        if (!shopId && shopsData.length > 0) {
          const primary = shopsData.find((s: any) => s.isPrimary) || shopsData[0];
          setSelectedShopId(primary.id);
          shopId = primary.id;
        }
      }

      // Fetch supplies history
      const supRes = await fetch(`/api/dealer/supplies?dealerId=${dealerId}${shopId ? `&tenantId=${shopId}` : ''}`);
      if (supRes.ok) {
        const supData = await supRes.json();
        setSupplies(Array.isArray(supData) ? supData : []);
      }

      // Fetch shop products for autocomplete
      if (shopId) {
        const prodRes = await fetch(`/api/products?tenantId=${shopId}`);
        if (prodRes.ok) {
          const prods = await prodRes.json();
          setShopProducts(Array.isArray(prods) ? prods : []);
        }
      }
    } catch (e) {
      console.error('Failed to load dealer data', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (dealer?.id) {
      loadPortalData(dealer.id, selectedShopId || dealer.tenantId);
    }
  }, [dealer?.id, selectedShopId]);

  // Handle Dealer Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginPhone || !loginPin) {
      setLoginError('দয়া করে মোবাইল নম্বর ও ৪-ডিজিটের পিন দিন');
      return;
    }
    setLoginSubmitting(true);
    try {
      const res = await fetch('/api/dealer/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, pin: loginPin })
      });
      const data = await res.json();
      if (res.ok && data.success && data.dealer) {
        setDealer(data.dealer);
        setSelectedShopId(data.dealer.tenantId || (data.shops?.[0]?.id ?? ''));
        setShops(data.shops || []);
        localStorage.setItem('lbos_active_dealer', JSON.stringify(data.dealer));
        playSuccessChime();
      } else {
        setLoginError(data.error || 'মোবাইল নম্বর বা পিন সঠিক নয়!');
      }
    } catch (err: any) {
      setLoginError('সার্ভারে যোগাযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('lbos_active_dealer');
    setDealer(null);
    setSupplies([]);
    setShopProducts([]);
    setLoginPhone('');
    setLoginPin('');
  };


  // Handle Adding Item Row
  const addItemRow = () => {
    setSupplyItems(prev => [
      ...prev,
      { productName: '', quantity: '', unit: 'পিস', purchasePrice: '', sellingPrice: '' }
    ]);
  };

  // Handle Removing Item Row
  const removeItemRow = (index: number) => {
    if (supplyItems.length <= 1) return;
    setSupplyItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Updating Item
  const updateItem = (index: number, field: keyof SupplyItem, value: any) => {
    setSupplyItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If user selected an existing shop product from suggestions
      if (field === 'productName' && value) {
        const found = shopProducts.find((p: any) => 
          (p.banglaName || p.name || '').toLowerCase() === String(value).toLowerCase() ||
          p.barcode === String(value)
        );
        if (found) {
          updated[index].productId = found.id;
          updated[index].category = found.category || 'সাধারণ';
          if (!updated[index].purchasePrice && found.purchasePrice) {
            updated[index].purchasePrice = found.purchasePrice;
          }
          if (!updated[index].sellingPrice && found.sellingPrice) {
            updated[index].sellingPrice = found.sellingPrice;
          }
          if (found.unit) {
            updated[index].unit = found.unit;
          }
        }
      }
      return updated;
    });
  };

  // Calculations for current challan
  const totalChallanBill = supplyItems.reduce((acc, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.purchasePrice) || 0;
    return acc + (q * p);
  }, 0);

  const numPaid = Number(paidAmount) || 0;
  const remainingDue = Math.max(0, totalChallanBill - numPaid);

  // Submit Supply directly to shop stock
  const handleSupplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer?.id || !selectedShopId) {
      alert('ডিলার ও দোকান নির্বাচন আবশ্যক');
      return;
    }

    const validItems = supplyItems.filter(it => it.productName.trim() && Number(it.quantity) > 0 && Number(it.purchasePrice) >= 0);
    if (validItems.length === 0) {
      alert('দয়া করে অন্তত একটি বৈধ পণ্যের নাম, পরিমাণ ও রেট দিন!');
      return;
    }

    setSupplySubmitting(true);
    try {
      const payload = {
        dealerId: dealer.id,
        dealerName: dealer.companyName || dealer.representativeName,
        dealerPhone: dealer.phone,
        tenantId: selectedShopId,
        challanNo: challanNo.trim(),
        items: validItems.map(it => ({
          productId: it.productId,
          productName: it.productName.trim(),
          category: it.category || 'সাধারণ',
          quantity: Number(it.quantity),
          unit: it.unit || 'পিস',
          purchasePrice: Number(it.purchasePrice),
          sellingPrice: it.sellingPrice ? Number(it.sellingPrice) : Math.round(Number(it.purchasePrice) * 1.25)
        })),
        paidAmount: numPaid,
        dueAmount: remainingDue,
        paymentMethod: 'cash',
        note: supplyNote.trim()
      };

      const res = await fetch('/api/dealer/supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playSuccessChime();
        setSupplySuccessModal({
          challanNo: data.challanNo,
          totalAmount: data.totalAmount,
          paidAmount: data.paidAmount,
          dueAmount: data.dueAmount,
          items: data.products || validItems,
          shopName: shops.find(s => s.id === selectedShopId)?.shopName || dealer.shopName || 'দোকান',
          createdAt: new Date().toISOString()
        });

        // Reset form
        generateNewChallanNo();
        setSupplyItems([{ productName: '', quantity: '', unit: 'পিস', purchasePrice: '', sellingPrice: '' }]);
        setPaidAmount('0');
        setSupplyNote('');

        // Reload data
        loadPortalData(dealer.id, selectedShopId);
      } else {
        alert(data.error || 'চালান সেভ করতে সমস্যা হয়েছে!');
      }
    } catch (err: any) {
      alert('সার্ভার এরর: ' + err.message);
    } finally {
      setSupplySubmitting(false);
    }
  };

  // Handle PIN Update
  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');
    if (!newPinInput || newPinInput.length < 4) {
      setPinError('কমপক্ষে ৪ ডিজিটের নতুন পিন দিন!');
      return;
    }
    try {
      const res = await fetch('/api/dealer/auth/update-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: dealer.id,
          currentPin: currentPinInput,
          newPin: newPinInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPinSuccess('✓ পিন সফলভাবে পরিবর্তন হয়েছে!');
        setDealer((prev: any) => ({ ...prev, pin: newPinInput }));
        setTimeout(() => {
          setShowPinModal(false);
          setPinSuccess('');
          setCurrentPinInput('');
          setNewPinInput('');
        }, 1500);
      } else {
        setPinError(data.error || 'পিন পরিবর্তন ব্যর্থ হয়েছে!');
      }
    } catch (e: any) {
      setPinError('সার্ভারে সমস্যা হয়েছে');
    }
  };

  // WhatsApp Challan Share
  const shareChallanViaWhatsApp = (receipt: any) => {
    const lines = (receipt.items || []).map((it: any, i: number) => 
      `${i + 1}. ${it.name || it.productName}: ${it.qty || it.quantity} ${it.unit || 'পিস'} x ৳${it.purchasePrice || it.unitCost} = ৳${(Number(it.qty || it.quantity) * Number(it.purchasePrice || it.unitCost)).toLocaleString('en-US')}`
    ).join('\n');

    const text = `🚚 *ডিলার সরবরাহ চালান রসিদ*\n🏢 কোম্পানি: *${dealer?.companyName || 'ডিলার'}*\n👤 প্রতিনিধি: ${dealer?.representativeName} (${dealer?.phone})\n🏪 দোকান: *${receipt.shopName}*\n🔖 চালান নম্বর: *${receipt.challanNo}*\n📅 তারিখ: ${formatBDDateTime(receipt.createdAt)}\n\n📦 *পণ্যের বিবরণ:*\n${lines}\n\n━━━━━━━━━━━━━━\n💵 মোট চালান মূল্য: ৳${Number(receipt.totalAmount).toLocaleString('en-US')}\n✅ পরিশোধিত: ৳${Number(receipt.paidAmount).toLocaleString('en-US')}\n⏳ বকেয়া পাওনা: ৳${Number(receipt.dueAmount).toLocaleString('en-US')}\n\nধন্যবাদ, পণ্য সফলভাবে দোকানে ডেলিভারি ও স্টকে যুক্ত করা হয়েছে! ✨`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ----------------------------------------------------
  // RENDER: Loading Screen
  // ----------------------------------------------------
  if (authLoading) {
    return (
      <div className="app-container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <DataLoader type="full" text="ডিলার পোর্টাল প্রস্তুত হচ্ছে..." />
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Dealer Login Screen
  // ----------------------------------------------------
  if (!dealer) {
    return (
      <div className="app-container" style={{ maxWidth: '480px', margin: '40px auto', padding: '0 16px' }}>
        <div className="ui-card" style={{ padding: '32px 24px', borderRadius: '24px', boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}>
          {/* Logo & Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.3)'
            }}>
              🚚
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px' }}>
              ডিলার ও সাপ্লায়ার পোর্টাল
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              দোকানে সরাসরি পণ্য ডেলিভারি দিন ও লাইভ স্টকে যোগ করুন
            </p>
          </div>

          {loginError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                📱 ডিলারের মোবাইল নম্বর
              </label>
              <input
                type="tel"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                placeholder="যেমন: 01711223344"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                🔑 ৪-ডিজিটের লগইন পিন
              </label>
              <input
                type="password"
                maxLength={8}
                value={loginPin}
                onChange={e => setLoginPin(e.target.value)}
                placeholder="৪-ডিজিটের পিন কোড দিন"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '16px',
                  letterSpacing: '4px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '800',
                border: 'none',
                cursor: loginSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(2, 132, 199, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loginSubmitting ? 'লগইন হচ্ছে...' : 'লগইন করুন ➔'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link href="/login" style={{ fontSize: '13px', color: '#0284c7', textDecoration: 'none', fontWeight: '600' }}>
              ← দোকানদার বা অ্যাডমিন লগইন পেজে ফিরুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Authenticated Dealer Portal
  // ----------------------------------------------------
  const currentShop = shops.find(s => s.id === selectedShopId) || { shopName: dealer.shopName || 'দোকান' };

  return (
    <div className="app-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '16px' }}>
      
      {/* Top Header Card */}
      <div className="ui-card" style={{
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#fff',
        padding: '24px 20px',
        borderRadius: '24px',
        marginBottom: '20px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>🚚</span>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#fff' }}>
                  {dealer.companyName || 'ডিলার কোম্পানি'}
                </h1>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                  প্রতিনিধি: <strong>{dealer.representativeName}</strong> · 📱 {dealer.phone}
                </div>
              </div>
            </div>
            
            {/* Target Shop Selector */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '6px 14px',
              borderRadius: '12px',
              marginTop: '4px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ fontSize: '14px' }}>🏪</span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>দোকান:</span>
              {shops.length > 1 ? (
                <select
                  value={selectedShopId}
                  onChange={e => setSelectedShopId(e.target.value)}
                  style={{
                    background: 'transparent',
                    color: '#fff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {shops.map(s => (
                    <option key={s.id} value={s.id} style={{ color: '#0f172a' }}>
                      {s.shopName} ({s.location || 'বাজার'})
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8' }}>
                  {currentShop.shopName}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowPinModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🔑 পিন বদলান
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 14px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              লগআউট
            </button>
          </div>
        </div>

        {/* Financial Stat Tiles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '20px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '14px 18px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              💰 দোকানের কাছে বর্তমান পাওনা (বকেয়া)
            </span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>
              ৳{(Number(dealer.payableDue) || 0).toLocaleString('en-US')}
            </span>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '14px 18px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              📦 মোট সম্পন্ন চালান
            </span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#38bdf8' }}>
              {supplies.length} টি
            </span>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '14px 18px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              🚚 ডেলিভারি সূচি
            </span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
              {dealer.deliveryDay || 'প্রতি মঙ্গলবার'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        background: '#f1f5f9',
        padding: '6px',
        borderRadius: '16px'
      }}>
        <button
          onClick={() => setActiveTab('deliver')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            background: activeTab === 'deliver' ? '#0284c7' : 'transparent',
            color: activeTab === 'deliver' ? '#fff' : '#64748b',
            boxShadow: activeTab === 'deliver' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🚚</span>
          <span>দোকানে নতুন চালান দিন</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            background: activeTab === 'history' ? '#0284c7' : 'transparent',
            color: activeTab === 'history' ? '#fff' : '#64748b',
            boxShadow: activeTab === 'history' ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>📜</span>
          <span>চালান ও ডেলিভারি হিস্ট্রি ({supplies.length})</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: SUPPLY PRODUCTS TO SHOP (NEW CHALLAN) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'deliver' && (
        <div className="ui-card" style={{ padding: '28px 20px', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#0f172a' }}>
                দোকানে সরাসরি পণ্য ডেলিভারি চালান এন্ট্রি
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                পণ্য সাবমিট করার সাথে সাথে {currentShop.shopName}-এর ইনভেন্টরি স্টকে যোগ হবে
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>চালান নং:</span>
              <input
                type="text"
                value={challanNo}
                onChange={e => setChallanNo(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '700',
                  width: '120px',
                  color: '#0284c7'
                }}
              />
            </div>
          </div>

          <form onSubmit={handleSupplySubmit}>
            {/* Line Items Table */}
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>#</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', minWidth: '180px' }}>পণ্যের নাম</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '90px' }}>পরিমাণ</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '90px' }}>একক</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '110px' }}>পাইকারি দর (৳)</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '110px' }}>খুচরা দর (৳)</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '100px' }}>মোট টাকা</th>
                    <th style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#475569', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {supplyItems.map((item, index) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="text"
                            list={`prod-suggestions-${index}`}
                            value={item.productName}
                            onChange={e => updateItem(index, 'productName', e.target.value)}
                            placeholder="যেমন: মিনিকেট চাল ৫০ কেজি"
                            required
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          />
                          <datalist id={`prod-suggestions-${index}`}>
                            {shopProducts.map((p: any) => (
                              <option key={p.id} value={p.banglaName || p.name}>
                                {p.banglaName || p.name} (বর্তমান স্টক: {p.stock} {p.unit})
                              </option>
                            ))}
                          </datalist>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={item.quantity}
                            onChange={e => updateItem(index, 'quantity', e.target.value)}
                            placeholder="১০"
                            required
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              textAlign: 'center'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <select
                            value={item.unit}
                            onChange={e => updateItem(index, 'unit', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 6px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px'
                            }}
                          >
                            <option value="পিস">পিস</option>
                            <option value="কেজি">কেজি</option>
                            <option value="লিটার">লিটার</option>
                            <option value="কার্টুন">কার্টুন</option>
                            <option value="বক্স">বক্স</option>
                            <option value="প্যাকেট">প্যাকেট</option>
                            <option value="ডজন">ডজন</option>
                            <option value="বস্তা">বস্তা</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.purchasePrice}
                            onChange={e => updateItem(index, 'purchasePrice', e.target.value)}
                            placeholder="৳২৫০"
                            required
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.sellingPrice}
                            onChange={e => updateItem(index, 'sellingPrice', e.target.value)}
                            placeholder="৳৩০০"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              textAlign: 'right'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '14px', fontWeight: '800', color: '#0f172a', textAlign: 'right' }}>
                          ৳{lineTotal.toLocaleString('en-US')}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {supplyItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              style={{
                                background: '#fee2e2',
                                color: '#ef4444',
                                border: 'none',
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: '800'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={addItemRow}
              style={{
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1.5px dashed #86efac',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                marginBottom: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>+</span>
              <span>আরও পণ্য যোগ করুন</span>
            </button>

            {/* Payment & Summary Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '20px',
              borderRadius: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    মোট চালান বিল:
                  </span>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
                    ৳{totalChallanBill.toLocaleString('en-US')}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    💵 দোকানদার নগদ কত টাকা দিয়েছেন?
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    placeholder="০"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '16px',
                      fontWeight: '800',
                      color: '#16a34a'
                    }}
                  />
                </div>

                <div>
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                    ⏳ বাকি রইল (ডিলারের পাওনা):
                  </span>
                  <span style={{ fontSize: '26px', fontWeight: '800', color: '#ea580c' }}>
                    ৳{remainingDue.toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <input
                  type="text"
                  value={supplyNote}
                  onChange={e => setSupplyNote(e.target.value)}
                  placeholder="কোনো বিশেষ মন্তব্য বা ড্রাইভারের নোট (ঐচ্ছিক)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={supplySubmitting || totalChallanBill <= 0}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: '16px',
                background: totalChallanBill > 0 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#94a3b8',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '800',
                border: 'none',
                cursor: supplySubmitting || totalChallanBill <= 0 ? 'not-allowed' : 'pointer',
                boxShadow: totalChallanBill > 0 ? '0 8px 24px rgba(22, 163, 74, 0.35)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <span>✓</span>
              <span>{supplySubmitting ? 'স্টকে যোগ হচ্ছে...' : `চালান #${challanNo} নিশ্চিত করুন ও দোকানে স্টকে যোগ করুন`}</span>
            </button>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: SUPPLY & DELIVERY HISTORY */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="ui-card" style={{ padding: '24px 20px', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 16px', color: '#0f172a' }}>
            📜 চালান ও ডেলিভারি হিস্ট্রি
          </h2>

          {loadingData ? (
            <DataLoader text="চালান ইতিহাস লোড হচ্ছে..." />
          ) : supplies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>📦</span>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px', color: '#334155' }}>
                এখনো কোনো ডেলিভারি চালান এন্ট্রি করা হয়নি
              </h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                &ldquo;দোকানে নতুন চালান দিন&rdquo; ট্যাব থেকে প্রথম ডেলিভারিটি সম্পন্ন করুন।
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {supplies.map((s: any) => (
                <div
                  key={s.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '800', fontSize: '16px', color: '#0284c7' }}>
                        #{s.challanNo}
                      </span>
                      <span style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        ✓ স্টকে ডেলিভার্ড
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600', marginBottom: '2px' }}>
                      দোকান: {s.shopName}
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      📅 {formatBDDateTime(s.createdAt)} · 📦 {s.items?.length || 1}টি পণ্য
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                      ৳{Number(s.totalAmount).toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                      নগদ: ৳{Number(s.paidAmount).toLocaleString('en-US')}
                      {Number(s.dueAmount) > 0 && (
                        <span style={{ color: '#ea580c', marginLeft: '6px' }}>
                          (বাকি: ৳{Number(s.dueAmount).toLocaleString('en-US')})
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setViewingChallan(s)}
                        style={{
                          background: '#e0f2fe',
                          color: '#0284c7',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        বিস্তারিত রসিদ ➔
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUCCESS CONFIRMATION MODAL & DIGITAL CHALLAN SLIP */}
      {/* ---------------------------------------------------- */}
      {supplySuccessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px 24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                fontSize: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                পণ্য সফলভাবে দোকানে স্টকে যোগ হয়েছে!
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                চালান নং: <strong>{supplySuccessModal.challanNo}</strong> · দোকান: <strong>{supplySuccessModal.shopName}</strong>
              </p>
            </div>

            {/* Itemized Table */}
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>পণ্য</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>পরিমাণ</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>দর</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplySuccessModal.items || []).map((it: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', fontWeight: '600' }}>{it.name || it.productName}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>{it.qty || it.quantity} {it.unit}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>৳{it.purchasePrice || it.unitCost}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '700' }}>
                        ৳{(Number(it.qty || it.quantity) * Number(it.purchasePrice || it.unitCost)).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>
                  <span>মোট বিল:</span>
                  <span>৳{Number(supplySuccessModal.totalAmount).toLocaleString('en-US')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16a34a' }}>
                  <span>নগদ গ্রহণ:</span>
                  <span>৳{Number(supplySuccessModal.paidAmount).toLocaleString('en-US')}</span>
                </div>
                {Number(supplySuccessModal.dueAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: '#ea580c', marginTop: '4px' }}>
                    <span>দোকানের বাকি (ডিলারের পাওনা):</span>
                    <span>৳{Number(supplySuccessModal.dueAmount).toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => shareChallanViaWhatsApp(supplySuccessModal)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#25d366',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>💬</span>
                <span>WhatsApp রসিদ</span>
              </button>

              <button
                onClick={() => setSupplySuccessModal(null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                ঠিক আছে বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW CHALLAN DETAIL MODAL */}
      {/* ---------------------------------------------------- */}
      {viewingChallan && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                  চালান #{viewingChallan.challanNo}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  দোকান: {viewingChallan.shopName} · {formatBDDateTime(viewingChallan.createdAt)}
                </span>
              </div>
              <button
                onClick={() => setViewingChallan(null)}
                style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 0' }}>পণ্য</th>
                    <th style={{ padding: '6px 0', textAlign: 'center' }}>পরিমাণ</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>দর</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>মোট</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingChallan.items || []).map((it: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', fontWeight: '600' }}>{it.productName || it.name}</td>
                      <td style={{ padding: '8px 0', textAlign: 'center' }}>{it.quantity || it.qty} {it.unit}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right' }}>৳{it.purchasePrice || it.unitCost}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '700' }}>
                        ৳{Number(it.totalPrice || (Number(it.quantity) * Number(it.purchasePrice))).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700' }}>
                  <span>মোট বিল:</span>
                  <span>৳{Number(viewingChallan.totalAmount).toLocaleString('en-US')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16a34a', marginTop: '4px' }}>
                  <span>নগদ পরিশোধ:</span>
                  <span>৳{Number(viewingChallan.paidAmount).toLocaleString('en-US')}</span>
                </div>
                {Number(viewingChallan.dueAmount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: '#ea580c', marginTop: '4px' }}>
                    <span>বকেয়া পাওনা:</span>
                    <span>৳{Number(viewingChallan.dueAmount).toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => shareChallanViaWhatsApp(viewingChallan)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: '#25d366',
                color: '#fff',
                border: 'none',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              💬 WhatsApp-এ চালান শেয়ার করুন
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PIN CHANGE MODAL */}
      {/* ---------------------------------------------------- */}
      {showPinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>
              🔑 ডিলার লগইন পিন পরিবর্তন
            </h3>

            {pinError && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px' }}>
                ⚠️ {pinError}
              </div>
            )}
            {pinSuccess && (
              <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px' }}>
                {pinSuccess}
              </div>
            )}

            <form onSubmit={handlePinUpdate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  বর্তমান পিন (ডিফল্ট: 1234)
                </label>
                <input
                  type="password"
                  value={currentPinInput}
                  onChange={e => setCurrentPinInput(e.target.value)}
                  placeholder="বর্তমান পিন"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  নতুন ৪-ডিজিটের পিন
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={newPinInput}
                  onChange={e => setNewPinInput(e.target.value)}
                  placeholder="নতুন পিন"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '700' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer', fontWeight: '800' }}
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
