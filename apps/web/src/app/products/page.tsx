'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import VoiceProductEntryModal from '../../components/VoiceProductEntryModal';
import IndustryUnitSelect from '../../components/IndustryUnitSelect';

export default function ProductsPage() {
  const { tenant, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id || 'tenant-1';

  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showVoiceProductModal, setShowVoiceProductModal] = useState(false);
  const [editingProd, setEditingProd] = useState<any>(null);

  // Form Fields
  const [banglaName, setBanglaName] = useState('');
  const [engName, setEngName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('পিস');
  const [genericName, setGenericName] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    loadProducts();
  }, [currentTenantId]);

  const openAddModal = () => {
    setEditingProd(null);
    setBanglaName('');
    setEngName('');
    setBarcode('894' + Math.floor(10000000 + Math.random() * 90000000));
    setPurchasePrice('');
    setSellingPrice('');
    setStock('15');
    setUnit(tenant?.industryId === 'cat-pharmacy' ? 'পাতা' : (tenant?.industryId === 'cat-hardware' ? 'ফুট' : 'পিস'));
    setGenericName('');
    setSize('');
    setColor('');
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProd(p);
    setBanglaName(p.banglaName || p.name);
    setEngName(p.name || '');
    setBarcode(p.barcode || '');
    setPurchasePrice(String(p.purchasePrice || ''));
    setSellingPrice(String(p.sellingPrice || ''));
    setStock(String(p.stock || '0'));
    setUnit(p.unit || 'পিস');
    setGenericName(p.genericName || '');
    setSize(p.size || '');
    setColor(p.color || '');
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banglaName || !sellingPrice) return;
    setSubmitting(true);

    const payload = {
      tenantId: currentTenantId,
      categoryId: tenant?.industryId || 'cat-grocery',
      banglaName,
      name: engName || banglaName,
      barcode,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      stock: Number(stock) || 0,
      unit,
      genericName: genericName || null,
      size: size || null,
      color: color || null
    };

    try {
      if (editingProd) {
        const res = await fetch(`/api/products/${editingProd.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          await loadProducts();
          setNotice(`✓ "${banglaName}" সফলভাবে আপডেট হয়েছে!`);
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          await loadProducts();
          setNotice(`✓ নতুন পণ্য "${banglaName}" সফলভাবে যুক্ত হয়েছে!`);
          speakAnnouncement(`নতুন পণ্য ${banglaName} ${sellingPrice} টাকা যুক্ত হয়েছে`);
        }
      }
    } catch (e) {}

    setShowModal(false);
    setSubmitting(false);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}" পণ্যটি মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadProducts();
        setNotice(`✓ "${name}" মুছে ফেলা হয়েছে!`);
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
  };

  const totalStockValue = products.reduce((acc, p) => acc + (p.sellingPrice * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length;

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (p.banglaName && p.banglaName.toLowerCase().includes(q)) || (p.name && p.name.toLowerCase().includes(q)) || (p.barcode && p.barcode.includes(q)) || (p.genericName && p.genericName.toLowerCase().includes(q));
  });

  return (
    <div className="app-container" style={{ paddingBottom: '100px' }}>
      
      {/* Products Top Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        borderRadius: '24px',
        padding: '22px 18px',
        color: '#fff',
        marginBottom: '16px',
        boxShadow: '0 12px 30px rgba(49, 46, 129, 0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '99px', fontWeight: '700' }}>
            {tenant?.industryIcon || '📦'} {tenant?.industryName} ক্যাটালগ
          </span>
          <span style={{ fontSize: '11px', color: '#c7d2fe' }}>
            মোট {products.length}টি পণ্য
          </span>
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0 0 2px' }}>
          দোকানের পণ্য তালিকা (Inventory)
        </h1>
        <p style={{ margin: '0 0 14px', opacity: 0.85, fontSize: '12.5px' }}>
          মোট মজুদ পণ্যের বিক্রয় মূল্য: <strong>৳{totalStockValue.toLocaleString('en-US')}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          <button
            onClick={() => setShowVoiceProductModal(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 14px',
              fontWeight: '900',
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
          >
            <span>🎙️</span> মুখে বলে পণ্য যোগ (AI Voice)
          </button>

          <button
            onClick={openAddModal}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '14px',
              padding: '12px 14px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>➕</span> ম্যানুয়াল এন্ট্রি
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '12px 16px', borderRadius: '14px', marginBottom: '14px', fontSize: '13.5px', fontWeight: '800' }}>
          {notice}
        </div>
      )}

      {/* Search Input */}
      <div style={{ marginBottom: '14px' }}>
        <input
          type="text"
          placeholder="🔍 পণ্য বা বারকোড খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', outline: 'none', fontSize: '14px', background: '#fff', boxSizing: 'border-box' }}
        />
      </div>

      {/* Product List Cards (Mobile Touch Friendly) */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {filtered.map(p => {
          const isLow = p.stock <= (p.lowStockThreshold || 5);
          return (
            <div
              key={p.id}
              className="mobile-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px', background: '#f8fafc', width: '46px', height: '46px', borderRadius: '14px', display: 'grid', placeItems: 'center' }}>
                  {p.imageEmoji || '📦'}
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '800', color: '#0f172a' }}>
                    {p.banglaName || p.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    <span>কেনা: ৳{p.purchasePrice} • </span>
                    <span style={{ color: '#16a34a', fontWeight: '800' }}>বিক্রি: ৳{p.sellingPrice}</span>
                    <span style={{ color: '#059669', display: 'block', fontSize: '11px' }}>
                      লাভ: +৳{p.sellingPrice - p.purchasePrice} / {p.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: isLow ? '#dc2626' : '#0f172a' }}>
                  {p.stock} {p.unit}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    onClick={() => openEditModal(p)}
                    style={{ background: '#eef2ff', color: '#4f46e5', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    ✏️ এডিট
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id, p.banglaName || p.name)}
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              {editingProd ? 'পণ্য এডিট ও আপডেট' : 'নতুন পণ্য যুক্ত করুন'}
            </h3>

            <form onSubmit={handleSaveProduct} style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>পণ্যের নাম (বাংলা): *</label>
                <input
                  type="text"
                  placeholder="যেমন: তীর সয়াবিন তেল ১ লিটার"
                  value={banglaName}
                  onChange={(e) => setBanglaName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>বারকোড (স্ক্যান বা অটো):</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>কেনা দাম (Cost ৳):</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '15px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>বিক্রয় মূল্য (Price ৳): *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    required
                    className="num-font"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #22c55e', fontSize: '16px', fontWeight: '900', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>বর্তমান স্টক:</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>পরিমাপ ইউনিট:</label>
                  <IndustryUnitSelect
                    value={unit}
                    onChange={setUnit}
                    industryId={tenant?.industryId}
                  />
                </div>
              </div>

              {tenant?.industryId === 'cat-pharmacy' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0284c7', marginBottom: '4px' }}>জেনেরিক নাম (ঔষধের উপাদান):</label>
                  <input
                    type="text"
                    placeholder="যেমন: Paracetamol + Caffeine"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #38bdf8', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {tenant?.industryId === 'cat-clothing' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#db2777', marginBottom: '4px' }}>সাইজ (L, XL, 32):</label>
                    <input
                      type="text"
                      placeholder="L / XL / 32"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#db2777', marginBottom: '4px' }}>রং (Color):</label>
                    <input
                      type="text"
                      placeholder="সাদা / নীল"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>বাতিল</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '10px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>
                  {submitting ? 'হচ্ছে...' : '✓ পণ্য সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎙️ Voice Product Entry Modal */}
      {showVoiceProductModal && (
        <VoiceProductEntryModal
          isOpen={showVoiceProductModal}
          onClose={() => setShowVoiceProductModal(false)}
          onProductCreated={(p) => {
            loadProducts();
            setNotice(`✓ নতুন পণ্য "${p.banglaName || p.name}" সফলভাবে যুক্ত হয়েছে!`);
          }}
        />
      )}

    </div>
  );
}
