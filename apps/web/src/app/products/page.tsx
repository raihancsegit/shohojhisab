'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getIndustryProductPlaceholder, getIndustryBrandPlaceholder, getIndustryProductSuggestions, getIndustrySearchPlaceholder } from '../../lib/industryConfig';
import VoiceProductEntryModal from '../../components/VoiceProductEntryModal';
import IndustryUnitSelect from '../../components/IndustryUnitSelect';
import DataLoader from '../../components/DataLoader';

export default function ProductsPage() {
  const { tenant, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id || 'tenant-1';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [subUnit, setSubUnit] = useState('');
  const [conversionRatio, setConversionRatio] = useState('1');
  const [genericName, setGenericName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [warranty, setWarranty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {
    } finally {
      setLoading(false);
    }
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
    setUnit(tenant?.industryId === 'cat-pharmacy' ? 'পাতা' : (tenant?.industryId === 'cat-hardware' ? 'ফুট' : tenant?.industryId === 'cat-shoes' ? 'জোড়া' : tenant?.industryId === 'cat-grocery' ? 'কেজি' : 'পিস'));
    setSubUnit('');
    setConversionRatio('1');
    setGenericName('');
    setExpiryDate('');
    setSize('');
    setColor('');
    setBrand('');
    setWarranty('');
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
    setSubUnit(p.subUnit || '');
    setConversionRatio(String(p.conversionRatio || '1'));
    setGenericName(p.genericName || '');
    setExpiryDate(p.expiryDate || '');
    setSize(p.size || '');
    setColor(p.color || '');
    setBrand(p.brand || '');
    setWarranty(p.warranty || '');
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
      subUnit: subUnit.trim() || null,
      conversionRatio: Number(conversionRatio) || 1,
      genericName: genericName || null,
      expiryDate: expiryDate || null,
      size: size || null,
      color: color || null,
      brand: brand || null,
      warranty: warranty || null
    };

    try {
      if (editingProd) {
        let res = await fetch(`/api/products/${editingProd.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok && res.status === 404) {
          res = await fetch(`/api/products/${editingProd.id}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        if (res.ok) {
          await loadProducts();
          setNotice(`✓ "${banglaName}" সফলভাবে আপডেট হয়েছে!`);
          setShowModal(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
            alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
          } else {
            alert(errData.error || errData.message || 'পণ্য আপডেট করতে সমস্যা হয়েছে');
          }
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
          setShowModal(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
            alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
          } else {
            alert(errData.error || errData.message || 'নতুন পণ্য যুক্ত করতে সমস্যা হয়েছে');
          }
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    } finally {
      setSubmitting(false);
      setTimeout(() => setNotice(''), 4000);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}" পণ্যটি মুছে ফেলতে চান?`)) return;

    try {
      let res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/products/${id}/delete`, {
          method: 'POST'
        });
      }
      if (res.ok) {
        await loadProducts();
        setNotice(`✓ "${name}" মুছে ফেলা হয়েছে!`);
        setTimeout(() => setNotice(''), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404 && (errData.error === 'Not Found' || !errData.error)) {
          alert('⚠️ ব্যাকএন্ড সার্ভার (Port 4005) বন্ধ রয়েছে অথবা পাওয়া যাচ্ছে না! টার্মিনালে "npm run dev" বা "npm run dev:api" চালু রাখুন।');
        } else {
          alert(errData.error || errData.message || 'পণ্য ডিলিট করতে সমস্যা হয়েছে');
        }
      }
    } catch (e) {
      alert('⚠️ সার্ভারে যোগাযোগ করা সম্ভব হয়নি। ব্যাকএন্ড সার্ভার (Port 4005) চালু আছে কিনা নিশ্চিত করুন।');
    }
  };

  const totalStockValue = products.reduce((acc, p) => acc + (p.sellingPrice * p.stock), 0);
  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length;

  const filtered = products.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const tokens = q.split(/\s+/).filter(Boolean);
    const searchableText = `${p.banglaName || ''} ${p.name || ''} ${p.barcode || ''} ${p.genericName || ''} ${p.brand || ''} ${p.size || ''} ${p.color || ''} ${p.category || ''}`.toLowerCase();
    return tokens.every(token => searchableText.includes(token));
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

      {/* Modern Search Input */}
      <div style={{ marginBottom: '14px' }}>
        <div className="stock-search-wrap">
          <span className="stock-search-icon-left">🔍</span>
          <input
            type="text"
            placeholder={getIndustrySearchPlaceholder(tenant?.industryId)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="stock-search-input"
            style={{ paddingRight: search ? '44px' : '16px' }}
          />
          {search && (
            <div className="stock-search-actions">
              <button
                type="button"
                onClick={() => setSearch('')}
                className="stock-search-btn"
                style={{ background: '#f1f5f9', color: '#64748b' }}
                title="সার্চ মুছুন"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product List Cards (Mobile Touch Friendly) */}
      {loading ? (
        <DataLoader type="skeleton-list" count={5} text="পণ্য তালিকা ও স্টক লোড হচ্ছে..." />
      ) : (
      <div style={{ display: 'grid', gap: '10px' }}>
        {filtered.map(p => {
          const isLow = p.stock <= (p.lowStockThreshold || 5);
          const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
          const isExpiringSoon = p.expiryDate && !isExpired && (new Date(p.expiryDate).getTime() - new Date().getTime()) < 30 * 24 * 60 * 60 * 1000;

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
                  {p.genericName && (
                    <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '700', display: 'block', marginTop: '1px' }}>
                      🧪 {p.genericName}
                    </span>
                  )}
                  {p.size && (
                    <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', display: 'inline-block', marginRight: '6px' }}>
                      🏷️ সাইজ: {p.size} {p.color ? `• ${p.color}` : ''}
                    </span>
                  )}
                  {isExpired ? (
                    <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: '800', display: 'inline-block', marginTop: '2px' }}>
                      🔴 মেয়াদোত্তীর্ণ ({p.expiryDate})
                    </span>
                  ) : isExpiringSoon ? (
                    <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: '800', display: 'inline-block', marginTop: '2px' }}>
                      ⚠️ মেয়াদ শীঘ্রই শেষ ({p.expiryDate})
                    </span>
                  ) : p.expiryDate ? (
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                      ⏳ মেয়াদ: {p.expiryDate}
                    </span>
                  ) : null}

                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
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
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            boxSizing: 'border-box'
          }}>
            {/* Sticky Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              flexShrink: 0
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{editingProd ? '✏️' : '➕'}</span>
                <span>{editingProd ? 'পণ্য এডিট ও আপডেট' : 'নতুন পণ্য যুক্ত করুন'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box', width: '100%' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>পণ্যের নাম (বাংলা): *</label>
                  <input
                    type="text"
                    placeholder={getIndustryProductPlaceholder(tenant?.industryId)}
                    value={banglaName}
                    onChange={(e) => setBanglaName(e.target.value)}
                    required
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />

                  {/* 💡 Quick Category Sample Suggestions Chips */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginTop: '6px' }} className="no-scrollbar">
                    {getIndustryProductSuggestions(tenant?.industryId).slice(0, 5).map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBanglaName(sug.name);
                          setSellingPrice(String(sug.price));
                          if (sug.costPrice) setPurchasePrice(String(sug.costPrice));
                          if (sug.unit) setUnit(sug.unit);
                          if (sug.generic) setGenericName(sug.generic);
                          if (sug.brand) setBrand(sug.brand);
                          if (sug.size) setSize(sug.size);
                        }}
                        style={{
                          flexShrink: 0,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {sug.icon} {sug.name.split(' ')[0]} {sug.name.split(' ')[1] || ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>বারকোড (স্ক্যান বা অটো):</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>কেনা দাম (Cost ৳):</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="num-font"
                      style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14.5px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>বিক্রয় মূল্য (Price ৳): *</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      required
                      className="num-font"
                      style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '2px solid #22c55e', fontSize: '15px', fontWeight: '900', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>বর্তমান স্টক:</label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="num-font"
                      style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>পরিমাপের একক:</label>
                    <IndustryUnitSelect
                      value={unit}
                      onChange={setUnit}
                      industryId={tenant?.industryId}
                    />
                  </div>
                </div>

                {/* ⚖️ মাল্টি-ইউনিট / সাব-একক রূপান্তর (যেমন: ১ বস্তা = ৫০ কেজি, ১ কার্টন = ২৪ পিস) */}
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1.5px dashed #cbd5e1', display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155' }}>⚖️ খুচরা / সাব-একক রূপান্তর (ঐচ্ছিক):</span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>যেমন: বস্তা বনাম কেজি</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>সাব-একক নাম:</label>
                      <input
                        type="text"
                        placeholder="যেমন: কেজি, গ্রাম, পিস"
                        value={subUnit}
                        onChange={(e) => setSubUnit(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>১ {unit || 'মূল এককে'} কত {subUnit || 'সাব-একক'}?</label>
                      <input
                        type="number"
                        placeholder="যেমন: 50"
                        value={conversionRatio}
                        onChange={(e) => setConversionRatio(e.target.value)}
                        className="num-font"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {subUnit && Number(conversionRatio) > 1 && (
                    <div style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
                      ✓ মেমোতে ১ {subUnit} বিক্রির সময় স্বয়ংক্রিয়ভাবে {Math.round((Number(sellingPrice || 0) / Number(conversionRatio)) * 100) / 100} টাকা দর হবে এবং স্টক থেকে ১/{conversionRatio} {unit} কমবে।
                    </div>
                  )}
                </div>

                {/* 💊 PHARMACY SPECIFIC FIELDS */}
                {tenant?.industryId === 'cat-pharmacy' && (
                  <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#065f46' }}>💊 ফার্মেসির বিশেষ তথ্য:</span>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>জেনেরিক নাম (উপাদান):</label>
                      <input
                        type="text"
                        placeholder="যেমন: Paracetamol + Caffeine"
                        value={genericName}
                        onChange={(e) => setGenericName(e.target.value)}
                        style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>মেয়াদোত্তীর্ণের তারিখ:</label>
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#047857', marginBottom: '3px' }}>ফার্মা কোম্পানি:</label>
                        <input
                          type="text"
                          placeholder={getIndustryBrandPlaceholder(tenant?.industryId)}
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 👗 CLOTHING & SHOES SPECIFIC FIELDS */}
                {(tenant?.industryId === 'cat-clothing' || tenant?.industryId === 'cat-shoes') && (
                  <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px', border: '1px solid #ddd6fe', display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#5b21b6' }}>
                      {tenant?.industryId === 'cat-shoes' ? '👞 জুতার সাইজ ও কালার:' : '👗 পোশাকের সাইজ ও কালার:'}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#5b21b6', marginBottom: '3px' }}>সাইজ:</label>
                        <input
                          type="text"
                          placeholder={tenant?.industryId === 'cat-shoes' ? '40, 41, 42' : 'M, L, XL, 32'}
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#5b21b6', marginBottom: '3px' }}>রং / কালার:</label>
                        <input
                          type="text"
                          placeholder="কালো / নীল / লাল"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 📱 MOBILE SPECIFIC FIELDS */}
                {tenant?.industryId === 'cat-mobile' && (
                  <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', border: '1px solid #bae6fd', display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1' }}>📱 গ্যাজেট ব্র্যান্ড ও ওয়ারেন্টি:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginBottom: '3px' }}>ব্র্যান্ড:</label>
                        <input
                          type="text"
                          placeholder="Samsung, Xiaomi"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#0284c7', marginBottom: '3px' }}>ওয়ারেন্টি:</label>
                        <input
                          type="text"
                          placeholder="১ বছর"
                          value={warranty}
                          onChange={(e) => setWarranty(e.target.value)}
                          style={{ width: '100%', maxWidth: '100%', minWidth: 0, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {submitting ? 'হচ্ছে...' : '✓ পণ্য সেভ করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  বাতিল
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
