'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DigitalCatalogContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') || 'tenant-1';

  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    // Load shop info
    fetch(`http://localhost:4005/api/admin/tenants/${tenantId}/full-details`)
      .then(res => res.json())
      .then(data => {
        if (data.shop) setShop(data.shop);
        if (Array.isArray(data.products)) setProducts(data.products);
      })
      .catch(() => {});

    // Fallback load products directly
    fetch(`http://localhost:4005/api/products?tenantId=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setProducts(data);
      })
      .catch(() => {});
  }, [tenantId]);

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const totalCartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalCartAmount = Object.entries(cart).reduce((acc, [pId, qty]) => {
    const prod = products.find(p => p.id === pId);
    return acc + ((prod ? prod.sellingPrice : 0) * qty);
  }, 0);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
                        (p.name && p.name.toLowerCase().includes(q)) ||
                        (p.genericName && p.genericName.toLowerCase().includes(q));
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleSendOrderWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalCartCount === 0 || !customerName || !customerPhone) return;

    let msg = `আসসালামু আলাইকুম ${shop?.shopName || 'দোকান'},\n` +
      `আমি ডিজিটাল ক্যাটালগ থেকে একটি নতুন অর্ডার দিতে চাচ্ছি:\n\n` +
      `👤 কাস্টমার: ${customerName}\n` +
      `📞 মোবাইল: ${customerPhone}\n` +
      `📍 ঠিকানা: ${customerAddress || 'দোকান থেকে নিব'}\n\n` +
      `📋 অর্ডারের তালিকা:\n`;

    Object.entries(cart).forEach(([pId, qty], idx) => {
      const prod = products.find(p => p.id === pId);
      if (prod) {
        msg += `${idx + 1}. ${prod.banglaName || prod.name} (${qty} ${prod.unit || 'পিস'}) - ৳${prod.sellingPrice * qty}\n`;
      }
    });

    msg += `\n💰 সর্বমোট বিল: ৳${totalCartAmount}\n` +
      `দয়া করে অর্ডারটি কনফার্ম করুন। ধন্যবাদ!`;

    const cleanShopPhone = (shop?.phone || '01986233234').replace(/[^0-9]/g, '');
    const url = `https://wa.me/88${cleanShopPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setShowOrderModal(false);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px', fontFamily: 'var(--font-sans)' }}>
      
      {/* Shop Profile Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '24px 20px 28px',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '28px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            🏪
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>
                {shop?.shopName || 'ভাই ভাই স্টোর'}
              </h1>
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '99px', fontWeight: '800' }}>
                ✓ ভেরিফাইড
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              {shop?.location || 'স্থানীয় বাজার'} • 📱 {shop?.phone || ''}
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🌐 ডিজিটাল ক্যাটালগ ও অনলাইন অর্ডার</span>
          <span style={{ color: '#86efac', fontWeight: '800' }}>● দোকান খোলা আছে</span>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '16px 16px 8px' }}>
        <input
          type="text"
          placeholder="🔍 যেকোনো পণ্য খুঁজুন (যেমন: তেল, চাল, সাবান, ওষুধ)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
            background: '#ffffff',
            boxSizing: 'border-box',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}
        />
      </div>

      {/* Product List */}
      <div style={{ padding: '8px 16px', display: 'grid', gap: '10px' }}>
        {filtered.map(p => {
          const qty = cart[p.id] || 0;
          return (
            <div
              key={p.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '12px 14px',
                border: qty > 0 ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>{p.icon || '📦'}</span>
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                    {p.banglaName || p.name}
                  </strong>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    <span className="num-font" style={{ fontSize: '15px', fontWeight: '900', color: '#059669' }}>
                      ৳{p.sellingPrice}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
                      / প্রতি {p.unit || 'পিস'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cart Stepper */}
              <div>
                {qty === 0 ? (
                  <button
                    onClick={() => updateCartQty(p.id, 1)}
                    style={{
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1.5px solid #a7f3d0',
                      padding: '6px 14px',
                      borderRadius: '10px',
                      fontWeight: '800',
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ যোগ
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '3px 6px', borderRadius: '10px' }}>
                    <button
                      onClick={() => updateCartQty(p.id, -1)}
                      style={{ background: '#fff', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: '900', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span className="num-font" style={{ fontSize: '14px', fontWeight: '900', minWidth: '18px', textAlign: 'center' }}>
                      {qty}
                    </span>
                    <button
                      onClick={() => updateCartQty(p.id, 1)}
                      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', width: '24px', height: '24px', fontWeight: '900', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Checkout Bar */}
      {totalCartCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          right: '16px',
          maxWidth: '608px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          zIndex: 100
        }}>
          <div>
            <span style={{ fontSize: '11.5px', color: '#d1fae5', display: 'block' }}>{totalCartCount} টি আইটেম সিলেক্টেড</span>
            <strong className="num-font" style={{ fontSize: '20px', fontWeight: '900' }}>৳{totalCartAmount}</strong>
          </div>

          <button
            onClick={() => setShowOrderModal(true)}
            style={{
              background: '#ffffff',
              color: '#065f46',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>💬</span> WhatsApp-এ অর্ডার দিন
          </button>
        </div>
      )}

      {/* ORDER MODAL */}
      {showOrderModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                🛒 অর্ডার কনফার্ম করুন
              </h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '13px' }}>
              <div>দোকান: <strong>{shop?.shopName}</strong></div>
              <div style={{ color: '#059669', fontWeight: '800', marginTop: '2px' }}>মোট বিল: ৳{totalCartAmount}</div>
            </div>

            <form onSubmit={handleSendOrderWhatsApp} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>আপনার নাম *</label>
                <input
                  type="text"
                  placeholder="আপনার নাম"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  placeholder="017xxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>ঠিকানা / ডেলিভারি নোট</label>
                <input
                  type="text"
                  placeholder="যেমন: ৩ নং গলি / দোকান থেকে নিব"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '6px'
                }}
              >
                <span>💬</span> সরাসরি হোয়াটসঅ্যাপে পাঠান
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DigitalCatalogPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>ক্যাটালগ লোড হচ্ছে...</div>}>
      <DigitalCatalogContent />
    </Suspense>
  );
}
