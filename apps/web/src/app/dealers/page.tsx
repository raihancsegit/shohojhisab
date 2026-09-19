'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';
import DataLoader from '../../components/DataLoader';
import { playDeleteSound, playSuccessChime } from '../../lib/audioFeedbackUtils';

export default function DealersPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [repName, setRepName] = useState('');
  const [phone, setPhone] = useState('');
  const [payableDue, setPayableDue] = useState('0');
  const [orderDay, setOrderDay] = useState('প্রতি সোমবার');
  const [deliveryDay, setDeliveryDay] = useState('প্রতি মঙ্গলবার');
  const [challanPhoto, setChallanPhoto] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [payModalDealer, setPayModalDealer] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // Edit Dealer Modal state
  const [editModalDealer, setEditModalDealer] = useState<any | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editRepName, setEditRepName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPayableDue, setEditPayableDue] = useState('0');
  const [editOrderDay, setEditOrderDay] = useState('');
  const [editDeliveryDay, setEditDeliveryDay] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Safe Delete Confirmation Modal state
  const [deleteDealerConfirm, setDeleteDealerConfirm] = useState<any | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadDealers = async () => {
    if (!currentTenantId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/dealers?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setDealers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealers();
  }, [currentTenantId]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerHaptic('light');
      const reader = new FileReader();
      reader.onloadend = () => {
        setChallanPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !phone || !currentTenantId) return;
    setSubmitting(true);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          companyName,
          representativeName: repName || companyName,
          phone,
          payableDue: Number(payableDue) || 0,
          orderDay,
          deliveryDay,
          challanPhoto
        })
      });
      if (res.ok) {
        await loadDealers();
        playSuccessChime();
        triggerHaptic('success');
        setNotice(`✓ ডিলার "${companyName}" সফলভাবে যুক্ত হয়েছে!`);
        setShowAddModal(false);
        setCompanyName('');
        setRepName('');
        setPhone('');
        setPayableDue('0');
        setChallanPhoto(null);
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
    setSubmitting(false);
  };

  const openEditDealer = (d: any) => {
    triggerHaptic('light');
    setEditModalDealer(d);
    setEditCompanyName(d.companyName || d.company_name || '');
    setEditRepName(d.representativeName || d.representative_name || '');
    setEditPhone(d.phone || '');
    setEditPayableDue(String(d.payableDue ?? d.payable_due ?? '0'));
    setEditOrderDay(d.orderDay || d.order_day || 'প্রতি সোমবার');
    setEditDeliveryDay(d.deliveryDay || d.delivery_day || 'প্রতি মঙ্গলবার');
  };

  const handleEditDealerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalDealer?.id || !editCompanyName || !editPhone) return;
    setEditSubmitting(true);
    triggerHaptic('medium');

    try {
      const res = await fetch(`/api/dealers/${editModalDealer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: editCompanyName,
          representativeName: editRepName || editCompanyName,
          phone: editPhone,
          payableDue: Number(editPayableDue) || 0,
          orderDay: editOrderDay,
          deliveryDay: editDeliveryDay
        })
      });

      if (res.ok) {
        playSuccessChime();
        triggerHaptic('success');
        setNotice(`✓ ডিলার "${editCompanyName}"-এর তথ্য সফলভাবে আপডেট হয়েছে!`);
        setEditModalDealer(null);
        await loadDealers();
        setTimeout(() => setNotice(''), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'ডিলার আপডেট করতে সমস্যা হয়েছে');
      }
    } catch (e) {
      alert('সার্ভারে যোগাযোগ করা যায়নি');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteDealerSubmit = async () => {
    if (!deleteDealerConfirm?.id) return;
    setDeleteSubmitting(true);
    triggerHaptic('heavy');

    try {
      const res = await fetch(`/api/dealers/${deleteDealerConfirm.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        playDeleteSound();
        triggerHaptic('success');
        setNotice(`✓ ডিলার "${deleteDealerConfirm.companyName || deleteDealerConfirm.company_name}" সফলভাবে মুছে ফেলা হয়েছে!`);
        setDealers(prev => prev.filter(d => d.id !== deleteDealerConfirm.id));
        setDeleteDealerConfirm(null);
        await loadDealers();
        setTimeout(() => setNotice(''), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'ডিলার মুছতে ব্যর্থ হয়েছে');
      }
    } catch (e) {
      alert('সার্ভারে যোগাযোগ করা যায়নি');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handlePayDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalDealer || !payAmount) return;
    const num = Number(payAmount);
    triggerHaptic('success');

    const newDue = Math.max(0, Number(payModalDealer.payableDue || 0) - num);
    try {
      const res = await fetch(`/api/dealers/${payModalDealer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payModalDealer,
          payableDue: newDue
        })
      });

      if (res.ok) {
        setNotice(`✓ "${payModalDealer.companyName}" ডিলারকে ৳${num} পরিশোধ করা হয়েছে। নতুন বাকি: ৳${newDue}`);
        setPayModalDealer(null);
        setPayAmount('');
        await loadDealers();
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  const contactDealerWhatsApp = (d: any) => {
    triggerHaptic('light');
    const cleanPhone = d.phone.replace(/[^0-9]/g, '');
    const textMsg = encodeURIComponent(
      `আসসালামু আলাইকুম ${d.representativeName || d.companyName} ভাই, ${tenant?.shopName || 'দোকান'} থেকে বলছি। আমাদের দোকানে নতুন মালামালের অর্ডারের বিষয়ে কথা বলতে চাচ্ছি। ধন্যবাদ!`
    );
    window.open(`https://wa.me/88${cleanPhone}?text=${textMsg}`, '_blank');
  };

  const totalDealersCount = dealers.length;
  const paginatedDealers = dealers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '80px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '14px 16px',
        color: '#fff',
        marginBottom: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '99px', fontWeight: '800' }}>
            🏢 সাপ্লায়ার ও মহাজন খাতা
          </span>
          <h1 style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '900', margin: '4px 0 2px' }}>
            ডিলার ও কোম্পানি সাপ্লাই খাতা
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
            {tenant?.shopName} • প্রতিনিধিদের অর্ডার শিডিউল ও চালান রসিদ
          </p>
        </div>

        <button
          onClick={() => { setShowAddModal(true); triggerHaptic('medium'); }}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            padding: '7px 12px',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
          }}
        >
          ➕ নতুন ডিলার
        </button>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '10px 14px', borderRadius: '12px', marginBottom: '14px', fontSize: '12.5px', fontWeight: '800' }}>
          {notice}
        </div>
      )}

      {loading ? (
        <DataLoader type="skeleton-list" count={4} text="ডিলার ও কোম্পানি তালিকা লোড হচ্ছে..." />
      ) : dealers.length === 0 ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '30px 14px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🏢</span>
          <h4 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '15px' }}>কোনো ডিলার যুক্ত নেই</h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>নতুন ডিলার যুক্ত করতে উপরের বাটনে চাপ দিন।</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {paginatedDealers.map(d => (
            <div
              key={d.id}
              className="ui-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px 14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '180px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  🏢
                </div>

                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    {d.companyName}
                  </h4>
                  <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>
                    প্রতিনিধি: <strong>{d.representativeName}</strong> • 📱 {d.phone}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: '700', marginTop: '2px', display: 'inline-block' }}>
                    🗓️ অর্ডার: {d.orderDay || 'সোম'} • ডেলিভারি: {d.deliveryDay || 'মঙ্গল'}
                  </span>
                </div>
              </div>

              {/* Right Balance & Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right', minWidth: '70px' }}>
                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>কোম্পানি দেনা</span>
                  <strong className="num-font" style={{ fontSize: '15px', color: Number(d.payableDue) > 0 ? '#dc2626' : '#059669' }}>
                    ৳{Number(d.payableDue || 0).toLocaleString('en-US')}
                  </strong>
                </div>

                {d.challanPhoto && (
                  <button
                    onClick={() => setPreviewPhoto(d.challanPhoto)}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '5px 8px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                    title="চালানের ছবি দেখুন"
                  >
                    📄 চালান
                  </button>
                )}

                {Number(d.payableDue) > 0 && (
                  <button
                    onClick={() => {
                      setPayModalDealer(d);
                      setPayAmount(String(d.payableDue));
                      triggerHaptic('light');
                    }}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '5px 8px',
                      borderRadius: '7px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    💵 দেনা শোধ
                  </button>
                )}

                <button
                  onClick={() => contactDealerWhatsApp(d)}
                  style={{
                    background: '#25d366',
                    color: '#fff',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <span>💬</span> WhatsApp
                </button>

                <button
                  onClick={() => openEditDealer(d)}
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '5px 8px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                  title="ডিলার তথ্য পরিবর্তন"
                >
                  ✏️
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('warning');
                    setDeleteDealerConfirm(d);
                  }}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '5px 8px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                  title="ডিলার মুছে ফেলুন"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dealers Pagination */}
      {totalDealersCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalDealersCount}
          pageSize={pageSize}
          onPageChange={(p) => {
            setCurrentPage(p);
            triggerHaptic('light');
          }}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setCurrentPage(1);
            triggerHaptic('light');
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemLabel="ডিলার"
          themeColor="#059669"
        />
      )}

      {/* Add Dealer & Challan Photo Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>নতুন ডিলার ও চালান এন্ট্রি</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddDealer} style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>কোম্পানির নাম *</label>
                <input type="text" placeholder="যেমন: মেঘনা গ্রুপ / স্কয়ার" value={companyName} onChange={e => setCompanyName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>প্রতিনিধি / সেলসম্যানের নাম</label>
                <input type="text" placeholder="প্রতিনিধির নাম" value={repName} onChange={e => setRepName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>মোবাইল নাম্বার *</label>
                <input type="text" placeholder="০১XXXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>পূর্বের কোম্পানি দেনা (৳)</label>
                <input type="number" placeholder="০" value={payableDue} onChange={e => setPayableDue(e.target.value)} className="num-font" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Challan Photo Upload / Camera Snapping */}
              <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  📷 কাগুজে চালান বা মেমোর ছবি তুলুন
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  style={{ display: 'none' }}
                  id="challan-file-input"
                />
                <label
                  htmlFor="challan-file-input"
                  style={{
                    display: 'inline-block',
                    background: '#3b82f6',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {challanPhoto ? '✓ ছবি সিলেক্ট হয়েছে (পরিবর্তন করুন)' : '📷 ক্যামেরা / গ্যালারি থেকে ছবি নিন'}
                </label>

                {challanPhoto && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={challanPhoto} alt="Challan Preview" style={{ maxHeight: '100px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>বাতিল</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>সেভ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Dealer Due Modal */}
      {payModalDealer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>💵 কোম্পানি দেনা পরিশোধ</h3>
              <button onClick={() => setPayModalDealer(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '13px' }}>
              <div>কোম্পানি: <strong>{payModalDealer.companyName}</strong></div>
              <div>প্রতিনিধি: <strong>{payModalDealer.representativeName}</strong></div>
              <div style={{ color: '#dc2626', fontWeight: '800', marginTop: '2px' }}>বর্তমান দেনা: ৳{payModalDealer.payableDue}</div>
            </div>

            <form onSubmit={handlePayDealer} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>পরিশোধের পরিমাণ (৳):</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  className="num-font"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #10b981', fontSize: '18px', fontWeight: '900', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setPayModalDealer(null)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: '700' }}>বাতিল</button>
                <button type="submit" style={{ flex: 2, padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800' }}>✓ টাকা পরিশোধ নিশ্চিত</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Challan Photo Preview Modal */}
      {previewPhoto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ maxWidth: '90%', maxHeight: '85%', position: 'relative' }}>
            <button
              onClick={() => setPreviewPhoto(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontWeight: '900'
              }}
            >
              ✕
            </button>
            <img src={previewPhoto} alt="Full Challan" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', border: '2px solid #fff' }} />
          </div>
        </div>
      )}

      {/* Edit Dealer Modal */}
      {editModalDealer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>✏️ ডিলার তথ্য পরিবর্তন</h3>
              <button onClick={() => setEditModalDealer(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleEditDealerSubmit} style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>কোম্পানির নাম *</label>
                <input type="text" value={editCompanyName} onChange={e => setEditCompanyName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>প্রতিনিধি / সেলসম্যানের নাম</label>
                <input type="text" value={editRepName} onChange={e => setEditRepName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>মোবাইল নাম্বার *</label>
                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>কোম্পানি দেনা (৳)</label>
                <input type="number" value={editPayableDue} onChange={e => setEditPayableDue(e.target.value)} className="num-font" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>অর্ডার নেওয়ার দিন</label>
                <input type="text" value={editOrderDay} onChange={e => setEditOrderDay(e.target.value)} placeholder="যেমন: প্রতি সোমবার" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>ডেলিভারির দিন</label>
                <input type="text" value={editDeliveryDay} onChange={e => setEditDeliveryDay(e.target.value)} placeholder="যেমন: প্রতি মঙ্গলবার" style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditModalDealer(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>বাতিল</button>
                <button type="submit" disabled={editSubmitting} style={{ flex: 2, padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
                  {editSubmitting ? 'আপডেট হচ্ছে...' : '✓ আপডেট সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Dealer Confirmation Modal */}
      {deleteDealerConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '24px',
            width: '100%',
            maxWidth: '380px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'grid',
              placeItems: 'center',
              fontSize: '26px',
              margin: '0 auto 14px'
            }}>
              ⚠️
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
              ডিলার মুছে ফেলতে চান?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              আপনি কি নিশ্চিত যে ডিলার <strong style={{ color: '#0f172a' }}>"{deleteDealerConfirm.companyName || deleteDealerConfirm.company_name}"</strong> মুছে ফেলতে চান?
              {Number(deleteDealerConfirm.payableDue || deleteDealerConfirm.payable_due || 0) > 0 && (
                <span style={{ display: 'block', color: '#dc2626', fontWeight: '800', marginTop: '4px' }}>
                  ⚠️ এই ডিলারের কাছে ৳{Number(deleteDealerConfirm.payableDue || deleteDealerConfirm.payable_due).toLocaleString('en-US')} দেনা হিসাব রয়েছে!
                </span>
              )}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeleteDealerConfirm(null)}
                disabled={deleteSubmitting}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={handleDeleteDealerSubmit}
                disabled={deleteSubmitting}
                style={{
                  flex: 1.2,
                  padding: '11px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                {deleteSubmitting ? 'মুছছে...' : '🗑️ হ্যাঁ, মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
