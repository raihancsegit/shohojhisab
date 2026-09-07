'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DataLoader from '../../components/DataLoader';

export default function ExpiryTrackerPage() {
  const { tenant, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDays, setFilterDays] = useState<'all' | 'expired' | '30' | '60' | '90'>('all');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = async () => {
    if (!currentTenantId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [currentTenantId]);

  // Calculate days remaining for each product
  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 9999;
    const exp = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const categorizedProducts = products.map(p => {
    const days = getDaysRemaining(p.expiryDate || p.expiry_date);
    return {
      ...p,
      daysRemaining: days,
      isExpired: days <= 0,
      isCritical: days > 0 && days <= 30,
      isWarning: days > 30 && days <= 60,
      isNotice: days > 60 && days <= 90
    };
  });

  const expiredList = categorizedProducts.filter(p => p.isExpired);
  const criticalList = categorizedProducts.filter(p => p.isCritical);
  const warningList = categorizedProducts.filter(p => p.isWarning);

  const filtered = categorizedProducts.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
                        (p.name && p.name.toLowerCase().includes(q)) ||
                        (p.genericName && p.genericName.toLowerCase().includes(q)) ||
                        (p.brand && p.brand.toLowerCase().includes(q));

    let matchFilter = true;
    if (filterDays === 'expired') matchFilter = p.isExpired;
    else if (filterDays === '30') matchFilter = p.isCritical || p.isExpired;
    else if (filterDays === '60') matchFilter = p.daysRemaining <= 60;
    else if (filterDays === '90') matchFilter = p.daysRemaining <= 90;

    return matchSearch && matchFilter;
  });

  const handleUpdateExpiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct || !newExpiryDate) return;
    triggerHaptic('success');

    try {
      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editProduct,
          expiryDate: newExpiryDate
        })
      });

      if (res.ok) {
        setNotice(`✓ "${editProduct.banglaName || editProduct.name}" পণ্যের নতুন মেয়াদ সফলভাবে আপডেট হয়েছে!`);
        setEditProduct(null);
        await loadProducts();
        setTimeout(() => setNotice(''), 3000);
      }
    } catch (e) {}
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '900', color: '#0f172a', margin: '0 0 2px' }}>
            ⏳ মেয়াদোত্তীর্ণ ও ব্যাচ ট্র্যাকার
          </h1>
          <span style={{ fontSize: 'clamp(11px, 3.2vw, 13px)', color: '#64748b' }}>
            {tenant?.shopName} • ফার্মেসি, খাদ্য ও কসমেটিক্সের অগ্রিম মেয়াদ সতর্কতা
          </span>
        </div>

        <button
          onClick={() => { setShowReturnModal(true); triggerHaptic('light'); }}
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#fff',
            border: 'none',
            padding: '7px 13px',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '12.5px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)'
          }}
        >
          <span>📋</span> ডিলার ফেরত চালান
        </button>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '13px', fontWeight: '800' }}>
          {notice}
        </div>
      )}

      {/* Metric Cards */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '10px 12px', border: '1px solid #fee2e2', borderLeft: '3.5px solid #ef4444' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', lineHeight: 1.2 }}>মেয়াদ শেষ</span>
          <div className="num-font" style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
            {expiredList.length} <span style={{ fontSize: '11px', fontWeight: '600' }}>টি</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '10px 12px', border: '1px solid #ffedd5', borderLeft: '3.5px solid #ea580c' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', lineHeight: 1.2 }}>৩০ দিনে শেষ</span>
          <div className="num-font" style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', color: '#ea580c', marginTop: '2px' }}>
            {criticalList.length} <span style={{ fontSize: '11px', fontWeight: '600' }}>টি</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '10px 12px', border: '1px solid #fef9c3', borderLeft: '3.5px solid #ca8a04' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', lineHeight: 1.2 }}>৬০ দিনে শেষ</span>
          <div className="num-font" style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', color: '#ca8a04', marginTop: '2px' }}>
            {warningList.length} <span style={{ fontSize: '11px', fontWeight: '600' }}>টি</span>
          </div>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <input
            type="text"
            placeholder="🔍 ওষুধের নাম, জেনেরিক বা ব্র্যান্ড..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '10px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'সকল' },
            { id: 'expired', label: '⚠️ শেষ' },
            { id: '30', label: '⏳ <৩০ দিন' },
            { id: '60', label: '⚡ <৬০ দিন' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setFilterDays(f.id as any); triggerHaptic('light'); }}
              style={{
                background: filterDays === f.id ? '#0f172a' : 'transparent',
                color: filterDays === f.id ? '#fff' : '#475569',
                border: 'none',
                padding: '6px 9px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '11.5px',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expiry Items List */}
      {loading ? (
        <DataLoader type="skeleton-list" count={4} text="ওষুধ ও পণ্যের মেয়াদ তালিকা লোড হচ্ছে..." />
      ) : (
      <div style={{ display: 'grid', gap: '8px' }}>
        {filtered.map(p => {
          const isExp = p.isExpired;
          const isCrit = p.isCritical;
          const isWarn = p.isWarning;

          const badgeColor = isExp ? '#dc2626' : isCrit ? '#ea580c' : isWarn ? '#ca8a04' : '#10b981';
          const badgeBg = isExp ? '#fee2e2' : isCrit ? '#ffedd5' : isWarn ? '#fef9c3' : '#ecfdf5';

          return (
            <div
              key={p.id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '10px 14px',
                border: `1.5px solid ${isExp ? '#fca5a5' : isCrit ? '#fdba74' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '180px' }}>
                <span style={{ fontSize: '20px' }}>{p.icon || '💊'}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{p.banglaName || p.name}</strong>
                    {p.genericName && (
                      <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '5px' }}>
                        {p.genericName}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                    স্টক: <strong className="num-font" style={{ color: '#0f172a' }}>{p.stock} {p.unit || 'পিস'}</strong> • কেনা দর: ৳{p.purchasePrice} • {p.brand || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '99px',
                    background: badgeBg,
                    color: badgeColor,
                    display: 'inline-block',
                    marginBottom: '1px'
                  }}>
                    {isExp ? '⚠️ মেয়াদ উত্তীর্ণ' : isCrit ? `⏳ ${p.daysRemaining} দিন বাকি` : isWarn ? `⚡ ${p.daysRemaining} দিন বাকি` : '✓ নিরাপদ'}
                  </span>
                  <div className="num-font" style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>
                    📅 {p.expiryDate || p.expiry_date || 'মেয়াদ নেই'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditProduct(p);
                    setNewExpiryDate(p.expiryDate || p.expiry_date || '');
                    triggerHaptic('light');
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ মেয়াদ পরিবর্তন
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* RETURN TO DEALER MODAL */}
      {showReturnModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  📋 ডিলারকে ফেরতযোগ্য পণ্যের চালান ফর্দ
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {tenant?.shopName} • কোম্পানি প্রতিনিধির নিকট হস্তান্তরের রশিদ
                </span>
              </div>
              <button onClick={() => setShowReturnModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '12.5px' }}>
              মোট ফেরতযোগ্য আইটেম: <strong>{[...expiredList, ...criticalList].length} টি</strong> • আনুমানিক কেনা মূল্য: <strong>৳{[...expiredList, ...criticalList].reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0).toLocaleString('bn-BD')}</strong>
            </div>

            <div style={{ display: 'grid', gap: '8px', maxHeight: '250px', overflowY: 'auto', marginBottom: '16px' }}>
              {[...expiredList, ...criticalList].map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}>
                  <div>
                    <strong>{p.banglaName || p.name}</strong> ({p.brand || 'কোম্পানি'})
                    <span style={{ display: 'block', color: '#dc2626' }}>মেয়াদ: {p.expiryDate || p.expiry_date}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>{p.stock} {p.unit || 'পিস'}</strong>
                    <div style={{ color: '#059669' }}>৳{(p.stock * p.purchasePrice)}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { triggerHaptic('success'); window.print(); }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '13px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer'
              }}
            >
              🖨️ ফেরত চালান প্রিন্ট করুন
            </button>
          </div>
        </div>
      )}

      {/* EDIT EXPIRY MODAL */}
      {editProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '900' }}>✏️ মেয়াদ তারিখ আপডেট</h3>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>{editProduct.banglaName || editProduct.name}</p>

            <form onSubmit={handleUpdateExpiry} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>নতুন মেয়াদ উত্তীর্ণের তারিখ:</label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setEditProduct(null)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: '700' }}>বাতিল</button>
                <button type="submit" style={{ flex: 2, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800' }}>✓ সংরক্ষণ</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
