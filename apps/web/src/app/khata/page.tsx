'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { getIndustryTheme } from '../../lib/industryConfig';
import Pagination from '../../components/Pagination';
import { exportToCSV } from '../../lib/exportUtils';

export default function KhataPage() {
  const { tenant, speakAnnouncement, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;
  const theme = getIndustryTheme(tenant?.industryId);

  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');

  // Quick Add Due Modal state with Stock Product Integration
  const [products, setProducts] = useState<any[]>([]);
  const [showAddDueModal, setShowAddDueModal] = useState<any>(null);
  const [dueMode, setDueMode] = useState<'stock' | 'custom'>('stock');
  const [productSearch, setProductSearch] = useState('');
  const [selectedDueProducts, setSelectedDueProducts] = useState<Array<{
    productId?: string;
    name: string;
    quantity: number;
    price: number;
    unit?: string;
    stock?: number;
    icon?: string;
  }>>([]);
  const [addDueAmount, setAddDueAmount] = useState('');
  const [addDueItems, setAddDueItems] = useState('');
  const [addDueSubmitting, setAddDueSubmitting] = useState(false);

  // Detailed Due Ledger History Modal state
  const [selectedLedger, setSelectedLedger] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Promise to Pay Date Modal
  const [showPromiseModal, setShowPromiseModal] = useState<any | null>(null);
  const [promiseDateInput, setPromiseDateInput] = useState('');
  const [promiseNotesInput, setPromiseNotesInput] = useState('');

  // Add Customer Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDue, setInitialDue] = useState('0');
  const [creditLimit, setCreditLimit] = useState('5000');
  const [address, setAddress] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    if (!currentTenantId) return;
    try {
      const res = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (res.ok) {
        const list = await res.json();
        setProducts(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load products', e);
    }
  };

  const addProductToDue = (prod: any) => {
    triggerHaptic('light');
    setSelectedDueProducts(prev => {
      const existing = prev.find(i => (i.productId && i.productId === prod.id) || i.name === (prod.banglaName || prod.name));
      let updated;
      if (existing) {
        updated = prev.map(i => ((i.productId && i.productId === prod.id) || i.name === (prod.banglaName || prod.name))
          ? { ...i, quantity: Math.round((i.quantity + 1) * 100) / 100 }
          : i
        );
      } else {
        updated = [...prev, {
          productId: prod.id,
          name: prod.banglaName || prod.name,
          quantity: 1,
          price: Number(prod.sellingPrice || prod.selling_price) || 0,
          unit: prod.unit || 'পিস',
          stock: Number(prod.stock) || 0,
          icon: prod.icon || '📦'
        }];
      }
      const total = updated.reduce((s, it) => s + (it.quantity * it.price), 0);
      setAddDueAmount(total > 0 ? total.toString() : '');
      setAddDueItems(updated.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', '));
      return updated;
    });
  };

  const updateDueItemQty = (index: number, delta: number) => {
    triggerHaptic('light');
    setSelectedDueProducts(prev => {
      const item = prev[index];
      if (!item) return prev;
      let step = delta;
      if (item.quantity <= 1 && Math.abs(delta) === 1) {
        step = delta > 0 ? 0.25 : -0.25;
      }
      const newQty = Math.max(0.05, Math.round((item.quantity + step) * 1000) / 1000);
      const updated = [...prev];
      updated[index] = { ...item, quantity: newQty };
      const total = updated.reduce((s, it) => s + (it.quantity * it.price), 0);
      setAddDueAmount(total > 0 ? total.toString() : '');
      setAddDueItems(updated.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', '));
      return updated;
    });
  };

  const removeDueItem = (index: number) => {
    triggerHaptic('light');
    setSelectedDueProducts(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const total = updated.reduce((s, it) => s + (it.quantity * it.price), 0);
      setAddDueAmount(total > 0 ? total.toString() : '');
      setAddDueItems(updated.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', '));
      return updated;
    });
  };

  const handleAddDueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddDueModal?.id || !addDueAmount) return;
    setAddDueSubmitting(true);
    try {
      const summary = addDueItems || (selectedDueProducts.length > 0 ? selectedDueProducts.map(i => `${i.name} (${i.quantity} ${i.unit || ''})`).join(', ') : 'বাকি পণ্য সামগ্রী');
      const itemsPayload = selectedDueProducts.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        unit: i.unit
      }));

      const res = await fetch('/api/customers/add-due', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: showAddDueModal.id,
          amount: Number(addDueAmount) || 0,
          itemsSummary: summary,
          items: itemsPayload
        })
      });
      if (res.ok) {
        await Promise.all([loadCustomers(), loadProducts()]);
        speakAnnouncement(`${showAddDueModal.name} এর খাতায় ৳${addDueAmount} টাকা বাকি যোগ ও স্টক মাইনাস হয়েছে।`);
        triggerHaptic('success');
        setNotice(`✓ "${showAddDueModal.name}" এর খাতায় ৳${addDueAmount} টাকা বাকি যোগ হয়েছে (স্টক আপডেট সম্পন্ন)!`);
        setShowAddDueModal(null);
        setAddDueAmount('');
        setAddDueItems('');
        setSelectedDueProducts([]);
        setProductSearch('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {
      console.error('Failed to add due', e);
    } finally {
      setAddDueSubmitting(false);
    }
  };

  const loadCustomerLedger = async (customer: any) => {
    if (!customer?.id) return;
    setLedgerLoading(true);
    setSelectedLedger({ customer, ledger: [] });
    try {
      const res = await fetch(`/api/customers/${customer.id}/ledger`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLedger(data);
      }
    } catch (e) {
      console.error('Failed to load customer ledger', e);
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSavePromiseDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPromiseModal?.id) return;
    try {
      const res = await fetch(`/api/customers/${showPromiseModal.id}/promise-date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promiseDate: promiseDateInput,
          notes: promiseNotesInput
        })
      });
      if (res.ok) {
        speakAnnouncement(`${showPromiseModal.name} এর টাকা দেওয়ার তারিখ ${promiseDateInput} সেট হয়েছে।`);
        triggerHaptic('success');
        setNotice(`✓ "${showPromiseModal.name}" এর টাকা দেওয়ার তারিখ সংরক্ষিত হয়েছে!`);
        setShowPromiseModal(null);
        setPromiseDateInput('');
        setPromiseNotesInput('');
        loadCustomers();
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
  };

  const loadCustomers = async () => {
    if (!currentTenantId) {
      setCustomers([]);
      return;
    }
    try {
      const res = await fetch(`/api/customers?tenantId=${currentTenantId}`);
      if (res.ok) {
        const list = await res.json();
        setCustomers(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
    }
  };

  useEffect(() => {
    loadCustomers();
    loadProducts();

    const handleVoiceSuccess = () => {
      loadCustomers();
      loadProducts();
    };

    window.addEventListener('voice-action-success', handleVoiceSuccess);
    return () => {
      window.removeEventListener('voice-action-success', handleVoiceSuccess);
    };
  }, [currentTenantId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentTenantId) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          name,
          phone: phone || 'ফোন নাম্বার নেই',
          address: address || 'দোকানের পরিচিত',
          totalDue: Number(initialDue) || 0,
          creditLimit: Number(creditLimit) || 5000
        })
      });
      if (res.ok) {
        await loadCustomers();
        setNotice(`✓ "${name}" সফলভাবে বাকি খাতায় যুক্ত হয়েছেন!`);
        setShowAddModal(false);
        setName('');
        setPhone('');
        setInitialDue('0');
        setAddress('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
    setSubmitting(false);
  };

  const startVoiceInputForField = (setter: (val: string) => void, isNumeric = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্যবহার করুন।');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      let spoken = e.results[0][0].transcript;
      if (spoken) {
        if (isNumeric) {
          const toEn = (s: string) => s.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
          const match = toEn(spoken).match(/\d+(\.\d+)?/);
          if (match) {
            setter(match[0]);
          } else {
            setter(spoken);
          }
        } else {
          setter(spoken.trim());
        }
        triggerHaptic('success');
      }
    };
    recognition.start();
  };

  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || !payAmount) return;

    try {
      const res = await fetch('/api/customers/due-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: showPayModal.id,
          amount: Number(payAmount) || 0
        })
      });
      if (res.ok) {
        await loadCustomers();
        speakAnnouncement(`${showPayModal.name} ভাই ${payAmount} টাকা বাকি পরিশোধ করেছেন।`);
        triggerHaptic('success');
        setNotice(`✓ ৳${payAmount} টাকা বাকি আদায় সফলভাবে রেকর্ড হয়েছে!`);
        setShowPayModal(null);
        setPayAmount('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
  };

  const sendWhatsAppReminder = (customer: any) => {
    const due = Number(customer.totalDue || customer.total_due || 0);
    const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const promiseStr = customer.promiseDate || customer.promise_date ? ` (পরিশোধের প্রতিশ্রুত তারিখ: ${customer.promiseDate || customer.promise_date})` : '';
    const passbookUrl = `http://localhost:3005/khata/passbook?phone=${cleanPhone}`;
    const textMsg = encodeURIComponent(
      `আসসালামু আলাইকুম ${customer.name} ভাই,\n${tenant?.shopName || 'আমাদের দোকান'}-এ আপনার বর্তমান বকেয়া বাকি ৳${due.toLocaleString('en-US')} টাকা${promiseStr}।\n\nঅনুগ্রহ করে সুবিধামতো সময়ে পরিশোধের অনুরোধ রইল।\nবিকাশ/নগদ পাঠাতে: ${tenant?.phone || '০১৭XXXXXXXX'}\n\n📱 আপনার ডিজিটাল খাতা ও মেমো স্টেটমেন্ট দেখুন:\n${passbookUrl}\n\nধন্যবাদ,\n${tenant?.shopName || 'দোকান মালিক'}`
    );
    window.open(`https://wa.me/88${cleanPhone}?text=${textMsg}`, '_blank');
  };

  const handleExportKhata = () => {
    const exportData = filtered.map((c) => ({
      name: c.name || '',
      phone: c.phone || '',
      totalDue: Number(c.totalDue || c.total_due || 0),
      creditLimit: Number(c.creditLimit || c.credit_limit || 0),
      promiseDate: c.promiseDate || c.promise_date || 'নাই',
      address: c.address || ''
    }));

    exportToCSV('Khata_Customer_Due_Ledger', exportData, [
      { key: 'name', label: 'গ্রাহকের নাম' },
      { key: 'phone', label: 'মোবাইল নাম্বার' },
      { key: 'totalDue', label: 'মোট বকেয়া বাকি (টাকা)' },
      { key: 'creditLimit', label: 'বাকি লিমিট (টাকা)' },
      { key: 'promiseDate', label: 'টাকা দেওয়ার তারিখ' },
      { key: 'address', label: 'ঠিকানা' }
    ]);
  };

  const totalMarketDue = customers.reduce((acc, c) => acc + (Number(c.totalDue) || Number(c.total_due) || 0), 0);
  const dueCustomerCount = customers.filter(c => (Number(c.totalDue) || Number(c.total_due) || 0) > 0).length;

  // Reset page to 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q));
  });

  const totalKhataCustomers = filtered.length;
  const paginatedCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* 🎙️ INTERACTIVE VOICE ACTION BANNER */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          window.dispatchEvent(new CustomEvent('trigger-voice-assistant'));
        }}
        style={{
          background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
          border: '1.5px solid #fca5a5',
          borderRadius: '14px',
          padding: '10px 12px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)',
          transition: 'transform 0.15s ease'
        }}
        className="clickable-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '16px',
            flexShrink: 0
          }}>
            🎙️
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ভয়েসে বাকি খাতা এন্ট্রি
              <span style={{ fontSize: '9px', background: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>AI</span>
            </div>
            <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '1px' }}>
              বলুন: <em>"রহিম এর খাতায় ৫০০ টাকা বাকি লেখো"</em>
            </div>
          </div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: '800', color: '#b91c1c', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', flexShrink: 0 }}>
          শুরু ➔
        </span>
      </div>

      {/* Header & Total Due Cockpit */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: theme.textPrimary, background: theme.headerBadgeBg, padding: '2px 8px', borderRadius: '99px' }}>
            {theme.icon} {theme.khataLabel}
          </span>
          <h1 style={{ fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px' }}>
            {theme.khataLabel} ও বকেয়া আদায়
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            বাকি হিসাব রাখুন ও হোয়াটসঅ্যাপে তাগাদা পাঠান
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportKhata}
            style={{
              background: '#047857',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 120, 87, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📥</span> এক্সেল / CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: theme.primaryGradient,
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>➕</span> নতুন বাকি খাতা
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="ui-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700', display: 'block' }}>
            বাজারে মোট বকেয়া বাকি
          </span>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#b91c1c', margin: '4px 0' }}>
            ৳{totalMarketDue.toLocaleString('en-US')}
          </div>
          <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>
            {dueCustomerCount} জন গ্রাহকের কাছে পাওনা
          </span>
        </div>

        <div className="ui-card" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '700', display: 'block' }}>
            মোট গ্রাহক তালিকা
          </span>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            {customers.length}
          </div>
          <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>
            খাতায় নিবন্ধিত নিয়মিত খরিদ্দার
          </span>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '12px', fontSize: '13.5px', fontWeight: '700', marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {/* Search Filter with Embedded Voice Mic */}
      <div className="ui-card" style={{ padding: '12px 14px', marginBottom: '18px', position: 'relative' }}>
        <input
          type="text"
          placeholder="🔍 কাস্টমারের নাম বা মোবাইল নাম্বার দিয়ে খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 44px 10px 14px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <button
          type="button"
          onClick={() => startVoiceInputForField(setSearch, false)}
          style={{
            position: 'absolute',
            right: '22px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '3px 7px',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '13.5px',
            display: 'grid',
            placeItems: 'center'
          }}
          title="মুখে বলে কাস্টমার খুঁজুন"
        >
          🎙️
        </button>
      </div>

      {/* Customer List Cards */}
      {filtered.length === 0 ? (
        <div className="ui-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          কোনো গ্রাহক পাওয়া যায়নি। "নতুন বাকি খাতা এন্ট্রি" বাটনে ক্লিক করে খরিদ্দার যুক্ত করুন।
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {paginatedCustomers.map(c => {
            const due = Number(c.totalDue || c.total_due || 0);
            return (
              <div
                key={c.id}
                className="ui-card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: due > 0 ? '1.5px solid #fecdd3' : '1px solid #e2e8f0',
                  boxShadow: due > 0 ? '0 2px 10px rgba(239, 68, 68, 0.05)' : '0 2px 6px rgba(0, 0, 0, 0.02)',
                  borderRadius: '16px'
                }}
              >
                {/* Top Row: Customer Info & Due Balance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: due > 0 ? '#fef2f2' : '#ecfdf5',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '20px',
                      flexShrink: 0
                    }}>
                      {c.avatar || '👤'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#0f172a' }}>
                          {c.name}
                        </h4>
                        {due > Number(c.creditLimit || c.credit_limit || 5000) && (
                          <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '6px' }}>
                            🚨 বাকি সীমা পার (লিমিট ৳{Number(c.creditLimit || c.credit_limit || 5000)})
                          </span>
                        )}
                        {(c.promiseDate || c.promise_date) && (
                          <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: '6px' }}>
                            📅 দেওয়ার তারিখ: {c.promiseDate || c.promise_date}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span>📱 {c.phone}</span>
                        {c.address && <span>• 📍 {c.address}</span>}
                      </span>
                    </div>
                  </div>

                  {/* Due Amount Badge */}
                  <div style={{
                    background: due > 0 ? '#fff1f2' : '#ecfdf5',
                    border: due > 0 ? '1.5px solid #fca5a5' : '1.5px solid #a7f3d0',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    textAlign: 'right',
                    alignSelf: 'center'
                  }}>
                    <span style={{ fontSize: '11px', color: due > 0 ? '#991b1b' : '#065f46', fontWeight: '700', display: 'block' }}>
                      বর্তমান বকেয়া বাকি
                    </span>
                    <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: due > 0 ? '#b91c1c' : '#059669' }}>
                      ৳{due.toLocaleString('en-US')}
                    </div>
                  </div>
                </div>

                {/* Middle Row: কিসের বাকি ও শেষ ক্রয়ের তারিখ / ফর্দ প্যানেল */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '9px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                    <span style={{ fontSize: '16px' }}>🛍️</span>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                        কিসের বাকি / নেওয়া পণ্যের ফর্দ:
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b', marginTop: '1px' }}>
                        {c.lastItemsSummary || 'পূর্বের বাকি খাতা'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#64748b', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span>📅</span>
                    <span><strong>তারিখ:</strong> {c.lastDate || 'পূর্বের হিসাব'} {c.lastInvoiceNo ? `(#${c.lastInvoiceNo})` : ''}</span>
                  </div>
                </div>

                {/* Bottom Row: Comprehensive Action Buttons Toolbar */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: '4px' }}>
                  {c.phone && c.phone.length > 5 && !c.phone.includes('নেই') && (
                    <a
                      href={`tel:${c.phone}`}
                      style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '6px 10px',
                        borderRadius: '9px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="সরাসরি মোবাইলে কল দিন"
                    >
                      <span>📞</span> কল
                    </a>
                  )}

                  {due > 0 && (
                    <button
                      onClick={() => sendWhatsAppReminder(c)}
                      style={{
                        background: '#25d366',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 11px',
                        borderRadius: '9px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.2)'
                      }}
                      title="WhatsApp-এ বকেয়া পরিশোধের তাগাদা মেসেজ পাঠান"
                    >
                      <span>💬</span> তাগাদা
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowAddDueModal(c);
                      setAddDueAmount('');
                      setAddDueItems('');
                      setSelectedDueProducts([]);
                      setProductSearch('');
                      setDueMode('stock');
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)'
                    }}
                    title="গ্রাহকের খাতায় স্টক পণ্য থেকে বাকি মেমো যোগ করুন"
                  >
                    <span>➕</span> বাকি দিন
                  </button>

                  <button
                    onClick={() => {
                      setShowPromiseModal(c);
                      setPromiseDateInput(c.promiseDate || c.promise_date || '');
                      setPromiseNotesInput(c.address || '');
                    }}
                    style={{
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '6px 9px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="টাকা পরিশোধের প্রতিশ্রুত তারিখ সেট করুন"
                  >
                    <span>📅</span> তারিখ
                  </button>

                  <button
                    onClick={() => loadCustomerLedger(c)}
                    style={{
                      background: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="কখন কোন তারিখে কি কি পণ্য নিয়েছে তার বিস্তারিত ফর্দ দেখুন"
                  >
                    <span>📜</span> ফর্দ ও সময়
                  </button>

                  <Link
                    href={`/khata/passbook?id=${c.id}&tenantId=${currentTenantId}`}
                    target="_blank"
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      padding: '6px 9px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="গ্রাহকের লাইভ ডিজিটাল পাসবুক দেখুন ও লিঙ্ক কপি করুন"
                  >
                    <span>📖</span> পাসবুক
                  </Link>

                  <button
                    onClick={() => { setShowPayModal(c); setPayAmount(String(due)); }}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '9px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <span>💵</span> টাকা আদায়
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Khata Customers Pagination */}
      {totalKhataCustomers > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalKhataCustomers}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            triggerHaptic('light');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
            triggerHaptic('light');
          }}
          pageSizeOptions={[10, 15, 30, 50, 100]}
          itemLabel="গ্রাহক"
          themeColor={theme.primaryColor}
        />
      )}

      {/* Quick Add Due (বাকি দিন ও স্টক ফর্দ এন্ট্রি) Modal */}
      {showAddDueModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📦</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                    বাকি মেমো ও স্টক এন্ট্রি
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    স্টক পণ্য থেকে সরাসরি বাকি মেমো তৈরি
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAddDueModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            {/* Customer Info Pill */}
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', marginBottom: '14px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{showAddDueModal.name}</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>📱 {showAddDueModal.phone}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>বর্তমান বকেয়া</span>
                <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: '900' }}>
                  ৳{Number(showAddDueModal.totalDue || showAddDueModal.total_due || 0).toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '14px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setDueMode('stock')}
                style={{
                  background: dueMode === 'stock' ? '#fff' : 'transparent',
                  color: dueMode === 'stock' ? '#dc2626' : '#64748b',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: dueMode === 'stock' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <span>📦</span> স্টক পণ্য বাছাই
              </button>
              <button
                type="button"
                onClick={() => setDueMode('custom')}
                style={{
                  background: dueMode === 'custom' ? '#fff' : 'transparent',
                  color: dueMode === 'custom' ? '#0f172a' : '#64748b',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: dueMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                <span>✍️</span> সাধারণ নোট
              </button>
            </div>

            <form onSubmit={handleAddDueSubmit} style={{ display: 'grid', gap: '14px' }}>
              {dueMode === 'stock' ? (
                <>
                  {/* Stock Product Search & Quick Picker */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                        📦 স্টক থেকে পণ্য সার্চ ও বাছাই করুন:
                      </label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField(setProductSearch, false)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800'
                        }}
                        title="পণ্যের নাম মুখে বলুন"
                      >
                        <span>🎙️</span>
                        <span>মুখে বলুন</span>
                      </button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="পণ্য খুঁজুন (যেমন: তেল, চিনি, সাবান, চাল...)"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '13.5px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filtered Products Horizontal Scroll / Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '8px',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      padding: '4px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      {products
                        .filter(p => !productSearch || (p.banglaName || p.name || '').toLowerCase().includes(productSearch.toLowerCase()) || (p.barcode && p.barcode.includes(productSearch)))
                        .slice(0, 12)
                        .map(p => {
                          const stockCount = Number(p.stock || 0);
                          const isOutOfStock = stockCount <= 0;
                          return (
                            <div
                              key={p.id}
                              onClick={() => addProductToDue(p)}
                              style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                padding: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '16px' }}>{p.icon || '📦'}</span>
                                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.banglaName || p.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                                <span style={{ color: '#16a34a', fontWeight: '800' }}>৳{p.sellingPrice || p.selling_price}</span>
                                <span style={{ color: isOutOfStock ? '#ef4444' : '#64748b', fontWeight: '600' }}>
                                  {isOutOfStock ? 'মজুত শেষ' : `মজুত: ${stockCount}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      {products.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                          কোনো পণ্য পাওয়া যায়নি
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Items Memo List */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                      📋 নির্বাচিত বাকি পণ্যের তালিকা ({selectedDueProducts.length}টি):
                    </label>

                    {selectedDueProducts.length === 0 ? (
                      <div style={{ padding: '16px', background: '#fff1f2', border: '1px dashed #fecdd3', borderRadius: '12px', textAlign: 'center', color: '#9f1239', fontSize: '12.5px' }}>
                        👆 উপরের তালিকা থেকে পণ্য সিলেক্ট করুন। সিলেক্ট করা পণ্যের দাম অনুযায়ী স্বয়ংক্রিয়ভাবে বাকি হিসাব হবে এবং ইনভেন্টরি স্টক মাইনাস হবে।
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
                        {selectedDueProducts.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '8px 10px',
                              borderRadius: '10px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{item.icon || '📦'}</span>
                                <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.name}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                ৳{item.price}/{item.unit || 'পিস'} | মজুত: {item.stock ?? '-'}
                              </div>
                            </div>

                            {/* Qty Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
                              <button
                                type="button"
                                onClick={() => updateDueItemQty(idx, -1)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '32px', textAlign: 'center' }}>
                                {item.quantity} {item.unit || ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDueItemQty(idx, 1)}
                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                              >
                                +
                              </button>
                            </div>

                            {/* Total Price & Remove */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '900', color: '#dc2626', minWidth: '55px', textAlign: 'right' }}>
                                ৳{Math.round(item.quantity * item.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDueItem(idx)}
                                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', width: '24px', height: '24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary & Price Display */}
                  <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: '700', display: 'block' }}>
                        মোট বাকি হিসাব (স্টক মাইনাস হবে)
                      </span>
                      <span style={{ fontSize: '11px', color: '#dc2626' }}>
                        {selectedDueProducts.length}টি পণ্য নির্বাচিত
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#dc2626' }}>৳</span>
                      <input
                        type="number"
                        value={addDueAmount}
                        onChange={(e) => setAddDueAmount(e.target.value)}
                        required
                        style={{
                          width: '100px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1.5px solid #ef4444',
                          fontSize: '16px',
                          fontWeight: '900',
                          color: '#dc2626',
                          background: '#fff',
                          textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                        বাকি টাকার পরিমাণ: *
                      </label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField(setAddDueAmount, true)}
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800'
                        }}
                        title="টাকা মুখে বলুন"
                      >
                        <span>🎙️</span>
                        <span>মুখে বলুন</span>
                      </button>
                    </div>
                    <input
                      type="number"
                      value={addDueAmount}
                      onChange={(e) => setAddDueAmount(e.target.value)}
                      className="num-font"
                      required
                      placeholder="যেমন: ৭৫০"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #ef4444',
                        fontSize: '18px',
                        fontWeight: '900',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                        কী কী পণ্য নিয়েছে / কিসের বাকি (ফর্দ):
                      </label>
                      <button
                        type="button"
                        onClick={() => startVoiceInputForField(setAddDueItems, false)}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          color: '#2563eb',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: '800'
                        }}
                        title="পণ্যের নাম মুখে বলুন"
                      >
                        <span>🎙️</span>
                        <span>মুখে বলুন</span>
                      </button>
                    </div>
                    <textarea
                      value={addDueItems}
                      onChange={(e) => setAddDueItems(e.target.value)}
                      rows={3}
                      placeholder="যেমন: তীর তেল ১ লিটার, চিনি ২ কেজি, সাবান ২টি"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'inherit',
                        resize: 'none'
                      }}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={addDueSubmitting || !addDueAmount || Number(addDueAmount) <= 0}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: (addDueSubmitting || !addDueAmount) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>✓</span>
                <span>{addDueSubmitting ? 'যোগ হচ্ছে ও স্টক আপডেট হচ্ছে...' : `বাকি মেমো নিশ্চিত করুন (৳${Number(addDueAmount || 0).toLocaleString('en-US')})`}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Collect Due Payment Modal */}
      {showPayModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                বাকি টাকা জমা গ্রহণ
              </h3>
              <button onClick={() => setShowPayModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{showPayModal.name}</strong>
              <span style={{ fontSize: '12.5px', color: '#dc2626', fontWeight: '700' }}>
                বর্তমান বকেয়া: ৳{Number(showPayModal.totalDue || showPayModal.total_due || 0).toLocaleString('en-US')}
              </span>
            </div>

            <form onSubmit={handleCollectDue} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                    জমা প্রাপ্ত টাকার পরিমাণ: *
                  </label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setPayAmount, true)}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      color: '#059669',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                    title="টাকা মুখে বলুন"
                  >
                    <span>🎙️</span>
                    <span>মুখে বলুন</span>
                  </button>
                </div>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="num-font"
                  required
                  placeholder="যেমন: ৫০০"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #10b981',
                    fontSize: '18px',
                    fontWeight: '900',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: 'pointer'
                }}
              >
                ✓ টাকা জমা নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                নতুন বাকি খাতা এন্ট্রি
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddCustomer} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                    কাস্টমারের নাম *
                  </label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setName, false)}
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                    title="নাম মুখে বলুন"
                  >
                    <span>🎙️</span>
                    <span>মুখে বলুন</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: কালাম ভাই (মাস্টার)"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                    মোবাইল নাম্বার *
                  </label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setPhone, true)}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      color: '#2563eb',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                    title="নাম্বার মুখে বলুন"
                  >
                    <span>🎙️</span>
                    <span>মুখে বলুন</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                      পূর্বের বকেয়া
                    </label>
                    <button
                      type="button"
                      onClick={() => startVoiceInputForField(setInitialDue, true)}
                      style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '1px 6px',
                        fontSize: '10.5px',
                        color: '#b45309',
                        cursor: 'pointer',
                        fontWeight: '800'
                      }}
                      title="টাকা মুখে বলুন"
                    >
                      🎙️
                    </button>
                  </div>
                  <input
                    type="number"
                    value={initialDue}
                    onChange={(e) => setInitialDue(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    বাকি সীমা (Credit Limit)
                  </label>
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="num-font"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ঠিকানা বা পরিচিতি
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: পূর্ব পাড়া, মসজিদ সংলগ্ন"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  marginTop: '6px'
                }}
              >
                {submitting ? 'যুক্ত হচ্ছে...' : '✓ খাতা তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED DUE LEDGER & ITEM TIMESTAMPS MODAL */}
      {selectedLedger && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '560px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                  📜 তারিখ, সময় ও পণ্যের বিস্তারিত ফর্দ
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '19px', fontWeight: '800', color: '#0f172a' }}>
                  {selectedLedger.customer?.name} এর বাকি খতিয়ান
                </h3>
              </div>
              <button 
                onClick={() => setSelectedLedger(null)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Customer Summary Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
              border: '1.5px solid #fecdd3',
              borderRadius: '16px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>মোবাইল: {selectedLedger.customer?.phone || 'নেই'}</span>
                <div style={{ fontSize: '12.5px', color: '#991b1b', fontWeight: '700', marginTop: '2px' }}>
                  মোট বকেয়া পাওনা:
                </div>
              </div>
              <div className="num-font" style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>
                ৳{Number(selectedLedger.customer?.totalDue || selectedLedger.customer?.total_due || 0).toLocaleString('en-US')}
              </div>
            </div>

            {/* Transaction & Items Ledger List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ledgerLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>ফর্দ লোড হচ্ছে...</div>
              ) : selectedLedger.ledger && selectedLedger.ledger.length > 0 ? (
                selectedLedger.ledger.map((entry: any) => (
                  <div 
                    key={entry.id} 
                    style={{ 
                      background: '#f8fafc', 
                      border: '1.5px solid #e2e8f0', 
                      borderRadius: '16px', 
                      padding: '14px 16px' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
                        #{entry.invoiceNo}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                        🕒 {entry.date}, {entry.time}
                      </span>
                    </div>

                    {/* Items taken in this memo */}
                    <div style={{ background: '#ffffff', borderRadius: '10px', padding: '8px 12px', border: '1px solid #f1f5f9', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>
                        🛒 নেওয়া পণ্যের ফর্দ:
                      </div>
                      {entry.items && entry.items.length > 0 ? (
                        entry.items.map((it: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0', borderBottom: idx < entry.items.length - 1 ? '1px dashed #f1f5f9' : 'none' }}>
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>• {it.name} ({it.quantity}টি)</span>
                            <span className="num-font" style={{ color: '#64748b', fontWeight: '700' }}>৳{it.total}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>সরাসরি বাকি এন্ট্রি</span>
                      )}
                    </div>

                    {/* Bottom breakdown */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', paddingTop: '4px' }}>
                      <span style={{ color: '#475569' }}>
                        মোট: <strong className="num-font">৳{entry.totalAmount}</strong> | জমা: <strong className="num-font" style={{ color: '#059669' }}>৳{entry.paidAmount}</strong>
                      </span>
                      <span style={{ fontWeight: '800', color: entry.dueAmount > 0 ? '#dc2626' : '#059669' }}>
                        বকেয়া: ৳{entry.dueAmount}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 14px', color: '#94a3b8' }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '6px' }}>🧾</span>
                  <strong style={{ fontSize: '14px', color: '#64748b' }}>পূর্বে কোনো ডিজিটাল মেমোর রেকর্ড নেই</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>পূর্বের বাকি হিসেবে ব্যালেন্স যোগ করা আছে।</p>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const targetCust = selectedLedger.customer;
                  setSelectedLedger(null);
                  setShowPayModal(targetCust);
                  setPayAmount(String(targetCust.totalDue || targetCust.total_due || ''));
                }}
                style={{
                  flex: 1,
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                💵 বাকি টাকা আদায় করুন
              </button>
              {Number(selectedLedger.customer?.totalDue || selectedLedger.customer?.total_due || 0) > 0 && (
                <button
                  onClick={() => sendWhatsAppReminder(selectedLedger.customer)}
                  style={{
                    background: '#25d366',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '13.5px',
                    cursor: 'pointer'
                  }}
                >
                  💬 তাগাদা
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROMISE TO PAY DATE MODAL */}
      {showPromiseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '22px' }}>📅</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  টাকা দেওয়ার প্রতিশ্রুত তারিখ
                </h3>
              </div>
              <button onClick={() => setShowPromiseModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{showPromiseModal.name}</strong>
              <span style={{ fontSize: '12.5px', color: '#dc2626', fontWeight: '700' }}>
                মোট বকেয়া: ৳{Number(showPromiseModal.totalDue || showPromiseModal.total_due || 0).toLocaleString('en-US')}
              </span>
            </div>

            <form onSubmit={handleSavePromiseDate} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  কবে টাকা পরিশোধের কথা দিয়েছে? *
                </label>
                <input
                  type="date"
                  value={promiseDateInput}
                  onChange={(e) => setPromiseDateInput(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #3b82f6', fontSize: '15px', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  ঠিকানা বা বিশেষ মন্তব্য:
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ধান কাটার পর টাকা দিবে"
                  value={promiseNotesInput}
                  onChange={(e) => setPromiseNotesInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPromiseModal(null)}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, padding: '11px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  ✓ তারিখ সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
