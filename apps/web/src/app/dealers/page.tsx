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

  // Dealer Direct Supply Modal state
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedSupplyDealerId, setSelectedSupplyDealerId] = useState('');
  const [supplyChallanNo, setSupplyChallanNo] = useState('');
  const [supplyItems, setSupplyItems] = useState<Array<{
    productId?: string;
    productName: string;
    category?: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    sellingPrice: number;
  }>>([
    { productName: '', category: 'সাধারণ', quantity: 1, unit: 'পিস', purchasePrice: 0, sellingPrice: 0 }
  ]);
  const [supplyPaidAmount, setSupplyPaidAmount] = useState('0');
  const [supplyPaymentMethod, setSupplyPaymentMethod] = useState<'cash' | 'bank' | 'mobile_money'>('cash');
  const [supplyNote, setSupplyNote] = useState('');
  const [supplySubmitting, setSupplySubmitting] = useState(false);

  // Shop products for auto-complete in supply modal
  const [shopProducts, setShopProducts] = useState<any[]>([]);

  // Supply History Modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [supplyHistory, setSupplyHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Dealer PIN & Credentials Modal state
  const [pinModalDealer, setPinModalDealer] = useState<any | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const loadProducts = async () => {
    if (!currentTenantId) return;
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setShopProducts(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
  };

  const loadSupplyHistory = async () => {
    if (!currentTenantId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/dealer/supplies?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setSupplyHistory(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
    setHistoryLoading(false);
  };

  const openSupplyModal = (dealer?: any) => {
    triggerHaptic('medium');
    setSelectedSupplyDealerId(dealer?.id || (dealers.length > 0 ? dealers[0].id : ''));
    setSupplyChallanNo(`CH-${Date.now().toString().slice(-6)}`);
    setSupplyItems([
      { productName: '', category: 'সাধারণ', quantity: 1, unit: 'পিস', purchasePrice: 0, sellingPrice: 0 }
    ]);
    setSupplyPaidAmount('0');
    setSupplyNote('');
    setShowSupplyModal(true);
    loadProducts();
  };

  const handleAddSupplyItem = () => {
    triggerHaptic('light');
    setSupplyItems(prev => [
      ...prev,
      { productName: '', category: 'সাধারণ', quantity: 1, unit: 'পিস', purchasePrice: 0, sellingPrice: 0 }
    ]);
  };

  const handleRemoveSupplyItem = (index: number) => {
    if (supplyItems.length <= 1) return;
    triggerHaptic('warning');
    setSupplyItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSupplyItemChange = (index: number, field: string, value: any) => {
    setSupplyItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSelectShopProduct = (index: number, prodId: string) => {
    const found = shopProducts.find(p => p.id === prodId);
    if (found) {
      triggerHaptic('light');
      setSupplyItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: found.id,
          productName: found.name,
          category: found.category || 'সাধারণ',
          unit: found.unit || 'পিস',
          purchasePrice: Number(found.costPrice || found.purchasePrice || 0),
          sellingPrice: Number(found.price || 0)
        };
        return updated;
      });
    }
  };

  const computedSupplyTotal = supplyItems.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.purchasePrice) || 0;
    return sum + (q * p);
  }, 0);

  const computedSupplyDue = Math.max(0, computedSupplyTotal - (Number(supplyPaidAmount) || 0));

  const handleSubmitSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplyDealerId || !currentTenantId) {
      alert('দয়া করে ডিলার নির্বাচন করুন');
      return;
    }
    const validItems = supplyItems.filter(it => it.productName && it.productName.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert('দয়া করে অন্তত একটি বৈধ পণ্য এবং পরিমাণ উল্লেখ করুন');
      return;
    }

    setSupplySubmitting(true);
    triggerHaptic('medium');

    try {
      const selectedDealer = dealers.find(d => d.id === selectedSupplyDealerId);
      const res = await fetch('/api/dealer/supplies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealerId: selectedSupplyDealerId,
          dealerName: selectedDealer?.companyName || selectedDealer?.representativeName,
          dealerPhone: selectedDealer?.phone,
          tenantId: currentTenantId,
          challanNo: supplyChallanNo,
          items: validItems,
          paidAmount: Number(supplyPaidAmount) || 0,
          dueAmount: computedSupplyDue,
          paymentMethod: supplyPaymentMethod,
          note: supplyNote || `ডিলার সরাসরি পণ্য সরবরাহ: ${selectedDealer?.companyName || ''}`
        })
      });

      if (res.ok) {
        playSuccessChime();
        triggerHaptic('success');
        setNotice(`✓ ডিলার চালান "${supplyChallanNo}" সফলভাবে এন্ট্রি হয়েছে এবং পণ্যের স্টক বৃদ্ধি পেয়েছে!`);
        setShowSupplyModal(false);
        await loadDealers();
        setTimeout(() => setNotice(''), 4500);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'চালান এন্ট্রি করতে সমস্যা হয়েছে');
      }
    } catch (e) {
      alert('সার্ভারে যোগাযোগ করা যায়নি');
    } finally {
      setSupplySubmitting(false);
    }
  };

  const openSupplyHistory = () => {
    triggerHaptic('light');
    setShowHistoryModal(true);
    loadSupplyHistory();
  };

  const handleResetPin = async (dealerId: string) => {
    if (!newPin || newPin.length < 4) {
      alert('দয়া করে অন্তত ৪-সংখ্যার নতুন পিন দিন');
      return;
    }
    setPinSubmitting(true);
    try {
      const res = await fetch(`/api/dealers/${dealerId}/reset-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin })
      });
      if (res.ok) {
        playSuccessChime();
        triggerHaptic('success');
        setNotice('✓ ডিলারের নতুন পিন সফলভাবে সংরক্ষিত হয়েছে!');
        setDealers(prev => prev.map(d => d.id === dealerId ? { ...d, pin: newPin } : d));
        if (pinModalDealer && pinModalDealer.id === dealerId) {
          setPinModalDealer({ ...pinModalDealer, pin: newPin });
        }
        setNewPin('');
        setTimeout(() => setNotice(''), 4000);
      } else {
        alert('পিন আপডেট করতে সমস্যা হয়েছে');
      }
    } catch (e) {
      alert('সার্ভারে যোগাযোগ করা যায়নি');
    }
    setPinSubmitting(false);
  };

  const copyDealerPortalLink = (d: any) => {
    triggerHaptic('light');
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/dealer-portal` : 'https://.../dealer-portal';
    const textToCopy = `🚚 ডিলার পোর্টাল লগইন তথ্য:\nকোম্পানি: ${d.companyName || d.company_name}\nমোবাইল: ${d.phone}\nলগইন পিন: ${d.pin || '1234'}\nওয়েবসাইট লিংক: ${portalUrl}\n\nএই লিংকে গিয়ে মোবাইল ও পিন দিয়ে লগইন করে সরাসরি দোকানে মালামাল সরবরাহ ও চালান এন্ট্রি করতে পারবেন।`;
    
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } else {
      alert(`ডিলার লগইন লিংক:\n${portalUrl}\nপিন: ${d.pin || '1234'}`);
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
    triggerHaptic('warning');

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

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => openSupplyModal()}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🚚 সরাসরি মাল গ্রহণ (স্টক এন্ট্রি)
          </button>

          <button
            onClick={openSupplyHistory}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            📋 চালান ইতিহাস
          </button>

          <a
            href="/dealer-portal"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🌐 ডিলার পোর্টাল ↗
          </a>

          <button
            onClick={() => { setShowAddModal(true); triggerHaptic('medium'); }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}
          >
            ➕ নতুন ডিলার
          </button>
        </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                    <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: '700' }}>
                      🗓️ অর্ডার: {d.orderDay || 'সোম'} • ডেলিভারি: {d.deliveryDay || 'মঙ্গল'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#4f46e5', fontWeight: '800', background: '#eef2ff', padding: '1px 6px', borderRadius: '4px' }}>
                      🔑 পিন: {d.pin || '1234'}
                    </span>
                  </div>
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

                {/* Direct Supply Receive Button */}
                <button
                  onClick={() => openSupplyModal(d)}
                  style={{
                    background: '#eff6ff',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    padding: '5px 9px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="এই ডিলারের থেকে সরাসরি মাল গ্রহণ ও স্টক এন্ট্রি করুন"
                >
                  <span>📦</span> মাল নিন
                </button>

                {/* Portal & PIN Credentials Button */}
                <button
                  onClick={() => {
                    setPinModalDealer(d);
                    setNewPin(d.pin || '1234');
                    triggerHaptic('light');
                  }}
                  style={{
                    background: '#faf5ff',
                    color: '#7c3aed',
                    border: '1px solid #ddd6fe',
                    padding: '5px 8px',
                    borderRadius: '7px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                  title="ডিলার লগইন পিন ও পোর্টাল লিংক"
                >
                  🔑 পিন
                </button>

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

      {/* Direct Dealer Supply (Stock-In) Modal */}
      {showSupplyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                  🚚 সরাসরি ডিলার চালান ও স্টক ইন
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  ডিলার থেকে সরাসরি মাল গ্রহণ
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  চালানের পণ্যসমূহ সরাসরি আপনার দোকানের ইনভেন্টরি স্টকে যুক্ত হবে।
                </p>
              </div>
              <button
                onClick={() => setShowSupplyModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '900' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSupply} style={{ display: 'grid', gap: '14px' }}>
              {/* Dealer & Challan Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    ডিলার নির্বাচন করুন *
                  </label>
                  <select
                    value={selectedSupplyDealerId}
                    onChange={e => setSelectedSupplyDealerId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '13px', fontWeight: '700' }}
                  >
                    <option value="">-- ডিলার বেছে নিন --</option>
                    {dealers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.companyName} ({d.representativeName || d.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    চালান নাম্বার *
                  </label>
                  <input
                    type="text"
                    value={supplyChallanNo}
                    onChange={e => setSupplyChallanNo(e.target.value)}
                    required
                    placeholder="যেমন: CH-83921"
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700' }}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>
                    📦 সরবরাহকৃত পণ্যের তালিকা ({supplyItems.length} টি)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSupplyItem}
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    ➕ আরও পণ্য যোগ
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {supplyItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '10px',
                        display: 'grid',
                        gap: '8px'
                      }}
                    >
                      {/* Product selector / text */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1.2 }}>
                          {shopProducts.length > 0 && (
                            <select
                              value={item.productId || ''}
                              onChange={e => {
                                if (e.target.value) {
                                  handleSelectShopProduct(idx, e.target.value);
                                } else {
                                  handleSupplyItemChange(idx, 'productId', '');
                                }
                              }}
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', marginBottom: '4px', background: '#f8fafc' }}
                            >
                              <option value="">-- বিদ্যমান দোকান পণ্য থেকে বাছুন --</option>
                              {shopProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (বর্তমান স্টক: {p.stock || 0} {p.unit || 'পিস'})
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            placeholder="পণ্যের নাম (নতুন হলেও লিখুন)"
                            value={item.productName}
                            onChange={e => handleSupplyItemChange(idx, 'productName', e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '700', boxSizing: 'border-box' }}
                          />
                        </div>

                        {supplyItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSupplyItem(idx)}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '800',
                              fontSize: '12px'
                            }}
                            title="আইটেম মুছুন"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {/* Quantity, Unit, Prices, Line Total */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px', alignItems: 'end' }}>
                        <div>
                          <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>পরিমাণ</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleSupplyItemChange(idx, 'quantity', e.target.value)}
                            required
                            className="num-font"
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>একক</label>
                          <select
                            value={item.unit}
                            onChange={e => handleSupplyItemChange(idx, 'unit', e.target.value)}
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '12px', fontWeight: '700', boxSizing: 'border-box' }}
                          >
                            <option value="পিস">পিস</option>
                            <option value="কেজি">কেজি</option>
                            <option value="লিটার">লিটার</option>
                            <option value="বক্স">বক্স</option>
                            <option value="প্যাকেট">প্যাকেট</option>
                            <option value="ডজন">ডজন</option>
                            <option value="কার্টুন">কার্টুন</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>ক্রয় রেট (৳)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.purchasePrice}
                            onChange={e => handleSupplyItemChange(idx, 'purchasePrice', e.target.value)}
                            required
                            className="num-font"
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>বিক্রয় রেট (৳)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.sellingPrice}
                            onChange={e => handleSupplyItemChange(idx, 'sellingPrice', e.target.value)}
                            className="num-font"
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', fontWeight: '800', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div style={{ textAlign: 'right', background: '#f8fafc', padding: '6px 8px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>লাইন মোট</span>
                          <strong className="num-font" style={{ fontSize: '13px', color: '#0369a1' }}>
                            ৳{((Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0)).toLocaleString('en-US')}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Row */}
              <div style={{ background: '#f1f5f9', borderRadius: '14px', padding: '12px', display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>মোট চালানের বিল:</span>
                  <strong className="num-font" style={{ fontSize: '17px', color: '#0f172a' }}>
                    ৳{computedSupplyTotal.toLocaleString('en-US')}
                  </strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                      নগদ পরিশোধ (৳):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={supplyPaidAmount}
                      onChange={e => setSupplyPaidAmount(e.target.value)}
                      className="num-font"
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '14px', fontWeight: '800', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '2px' }}>
                      পরিশোধ মাধ্যম:
                    </label>
                    <select
                      value={supplyPaymentMethod}
                      onChange={e => setSupplyPaymentMethod(e.target.value as any)}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '12px', fontWeight: '700', boxSizing: 'border-box' }}
                    >
                      <option value="cash">নগদ ক্যাশ (দোকান ক্যাশ ড্রয়ার)</option>
                      <option value="bank">ব্যাংক একাউন্ট</option>
                      <option value="mobile_money">বিকাশ / নগদ</option>
                    </select>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>অবশিষ্ট বাকি দেনা:</span>
                    <strong className="num-font" style={{ fontSize: '16px', color: computedSupplyDue > 0 ? '#dc2626' : '#059669' }}>
                      ৳{computedSupplyDue.toLocaleString('en-US')}
                    </strong>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="চালান সংক্রান্ত মন্তব্য বা বিবরণ (ঐচ্ছিক)"
                    value={supplyNote}
                    onChange={e => setSupplyNote(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupplyModal(false)}
                  disabled={supplySubmitting}
                  style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={supplySubmitting}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {supplySubmitting ? 'স্টক ইন ও চালান এন্ট্রি হচ্ছে...' : '✓ চালান সংরক্ষণ ও স্টকে পণ্য যোগ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supply History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 135,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '22px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  📋 ডিলার পণ্য সরবরাহের চালান ইতিহাস
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  দোকানে ডিলারদের দেওয়া সাম্প্রতিক চালান ও স্টকে যুক্ত হওয়ার তালিকা
                </span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: '900' }}
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <DataLoader type="skeleton-list" count={3} text="চালানের ইতিহাস লোড হচ্ছে..." />
            ) : supplyHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>🚚</span>
                এখনও কোনো ডিলার সরাসরি চালান এন্ট্রি করা হয়নি।
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {supplyHistory.map((s: any) => (
                  <div
                    key={s.id}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          চালান নং: {s.challan_no || s.challanNo}
                        </strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          ডিলার: <strong>{s.dealer_name || s.dealerName}</strong> • {s.dealer_phone || s.dealerPhone}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                        ✓ স্টকে যুক্ত
                      </span>
                    </div>

                    {/* Items List */}
                    {s.items && s.items.length > 0 && (
                      <div style={{ background: '#ffffff', borderRadius: '8px', padding: '8px', margin: '6px 0', border: '1px solid #e2e8f0', fontSize: '11.5px' }}>
                        {s.items.map((it: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>• {it.product_name || it.productName} ({it.quantity} {it.unit || 'টি'}) @ ৳{it.purchase_price || it.purchasePrice}</span>
                            <strong className="num-font">৳{Number(it.total_amount || (it.quantity * it.purchase_price)).toLocaleString('en-US')}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '6px' }}>
                      <span style={{ color: '#64748b' }}>
                        {new Date(s.created_at || s.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>মোট: <strong>৳{Number(s.total_amount || s.totalAmount || 0).toLocaleString('en-US')}</strong></span>
                        <span style={{ color: '#059669' }}>পরিশোধ: <strong>৳{Number(s.paid_amount || s.paidAmount || 0).toLocaleString('en-US')}</strong></span>
                        {Number(s.due_amount || s.dueAmount || 0) > 0 && (
                          <span style={{ color: '#dc2626' }}>বাকি: <strong>৳{Number(s.due_amount || s.dueAmount || 0).toLocaleString('en-US')}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dealer Portal Credentials & PIN Modal */}
      {pinModalDealer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 145,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🔑</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                    ডিলার লগইন ও পোর্টাল পিন
                  </h3>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ডিলারের জন্য আলাদা সেলফ-সার্ভিস পোর্টাল
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPinModalDealer(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: '900' }}
              >
                ✕
              </button>
            </div>

            {/* Dealer Info Card */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '12.5px' }}>
              <div style={{ marginBottom: '4px' }}>কোম্পানি: <strong style={{ color: '#0f172a' }}>{pinModalDealer.companyName || pinModalDealer.company_name}</strong></div>
              <div style={{ marginBottom: '4px' }}>প্রতিনিধি: <strong>{pinModalDealer.representativeName || pinModalDealer.representative_name}</strong></div>
              <div style={{ marginBottom: '4px' }}>মোবাইল (লগইন আইডি): <strong style={{ color: '#0284c7' }}>{pinModalDealer.phone}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span>বর্তমান পিন:</span>
                <span style={{ fontSize: '14px', fontWeight: '900', color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '6px' }}>
                  {pinModalDealer.pin || '1234'}
                </span>
              </div>
            </div>

            {/* Change PIN Box */}
            <div style={{ background: '#fff', border: '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '12px', marginBottom: '14px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '5px' }}>
                নতুন পিন সেট করুন (কমপক্ষে ৪ সংখ্যা):
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="যেমন: 5678"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="num-font"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '800', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => handleResetPin(pinModalDealer.id)}
                  disabled={pinSubmitting || !newPin}
                  style={{
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {pinSubmitting ? 'সেভ...' : 'পিন আপডেট'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                type="button"
                onClick={() => copyDealerPortalLink(pinModalDealer)}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: copiedLink ? '#ecfdf5' : '#0284c7',
                  color: copiedLink ? '#065f46' : '#ffffff',
                  border: copiedLink ? '1.5px solid #86efac' : 'none',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>{copiedLink ? '✓ কপি হয়েছে!' : '📋'}</span>
                {copiedLink ? 'ডিলার পোর্টাল লিংক ও পিন কপি হয়েছে!' : 'পোর্টাল লিংক ও লগইন তথ্য কপি করুন'}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open('/dealer-portal', '_blank');
                  setPinModalDealer(null);
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                🌐 সরাসরি ডিলার পোর্টাল খুলুন ↗
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
