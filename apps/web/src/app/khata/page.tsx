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

    const handleVoiceSuccess = () => {
      loadCustomers();
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
          borderRadius: '18px',
          padding: '14px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.12)',
          transition: 'transform 0.15s ease'
        }}
        className="clickable-card"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: '#ef4444',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '20px',
            boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.2)'
          }}>
            🎙️
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ভয়েস দিয়ে সরাসরি বাকি খাতা এন্ট্রি করুন
              <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Live AI</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#b91c1c', marginTop: '2px' }}>
              ক্লিক করে বলুন: <em>"রহিম এর খাতায় ৫০০ টাকা বাকি লেখো"</em> বা <em>"করিম ভাই ১০০০ টাকা জমা দিল"</em>
            </div>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#b91c1c', background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
          শুরু করুন ➔
        </span>
      </div>

      {/* Header & Total Due Cockpit */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: '800', color: theme.textPrimary, background: theme.headerBadgeBg, padding: '3px 10px', borderRadius: '99px' }}>
            {theme.icon} {theme.khataLabel}
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px' }}>
            {theme.khataLabel} ও বকেয়া আদায়
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            বাকি হিসাব রাখুন এবং ১-ক্লিকে কাস্টমারদের হোয়াটসঅ্যাপে তাগাদা পাঠান
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportKhata}
            style={{
              background: '#047857',
              color: '#fff',
              border: 'none',
              padding: '12px 18px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(4, 120, 87, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📥</span> এক্সেল / CSV ডাউনলোড
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: theme.primaryGradient,
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>➕</span> নতুন বাকি খাতা এন্ট্রি
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
        <div style={{ display: 'grid', gap: '10px' }}>
          {paginatedCustomers.map(c => {
            const due = Number(c.totalDue || c.total_due || 0);
            return (
              <div
                key={c.id}
                className="ui-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px 20px'
                }}
              >
                {/* Left Customer Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: due > 0 ? '#fef2f2' : '#ecfdf5',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '22px'
                  }}>
                    {c.avatar || '👤'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#0f172a' }}>
                        {c.name}
                      </h4>
                      {due > Number(c.creditLimit || c.credit_limit || 5000) && (
                        <span style={{ fontSize: '11px', fontWeight: '800', background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: '6px' }}>
                          🚨 বাকি সীমা পার (লিমিট ৳{Number(c.creditLimit || c.credit_limit || 5000)})
                        </span>
                      )}
                      {(c.promiseDate || c.promise_date) && (
                        <span style={{ fontSize: '11px', fontWeight: '800', background: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: '6px' }}>
                          📅 দেওয়ার তারিখ: {c.promiseDate || c.promise_date}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span>📱 {c.phone}</span>
                      {c.address && <span>• {c.address}</span>}
                    </span>
                  </div>
                </div>

                {/* Right Balance & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>বকেয়া বাকি</span>
                    <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: due > 0 ? '#dc2626' : '#059669' }}>
                      ৳{due.toLocaleString('en-US')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {c.phone && c.phone.length > 5 && !c.phone.includes('নেই') && (
                      <a
                        href={`tel:${c.phone}`}
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
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
                          padding: '8px 12px',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="WhatsApp-এ বকেয়া পরিশোধের তাগাদা মেসেজ পাঠান"
                      >
                        <span>💬</span> তাগাদা
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowPromiseModal(c);
                        setPromiseDateInput(c.promiseDate || c.promise_date || '');
                        setPromiseNotesInput(c.address || '');
                      }}
                      style={{
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1.5px solid #cbd5e1',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
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
                        border: '1.5px solid #cbd5e1',
                        padding: '8px 11px',
                        borderRadius: '10px',
                        fontSize: '12px',
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
                        padding: '8px 10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '800',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
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
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>💵</span> টাকা আদায়
                    </button>
                  </div>
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
