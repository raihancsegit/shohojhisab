'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import FeatureGate from '../../components/FeatureGate';
import DataLoader from '../../components/DataLoader';
import { parseBanglaNumber } from '../../lib/voiceFieldUtils';
import { extractTranscriptFromEvent, cleanSpokenBengali } from '../../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playMicStopSound } from '../../lib/audioFeedbackUtils';

export default function InstallmentsPage() {
  const { tenant, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;

  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [notice, setNotice] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [collectModalItem, setCollectModalItem] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Active Voice Field Tracker
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [fieldVoiceStatus, setFieldVoiceStatus] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  // New Installment Form
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    guarantorName: '',
    guarantorPhone: '',
    productName: '',
    totalAmount: '',
    downPayment: '',
    totalMonths: '4',
    notes: ''
  });

  const stopFieldVoice = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setActiveVoiceField(null);
    setFieldVoiceStatus('');
    playMicStopSound();
  };

  const startFieldVoice = (fieldKey: string, isNumeric = false, customLabel = '') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্রাউজার ব্যবহার করুন।');
      return;
    }

    // Toggle off if already active on same field
    if (activeVoiceField === fieldKey) {
      stopFieldVoice();
      return;
    }

    stopFieldVoice();

    // Cancel active TTS output
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      playMicStartSound();
      triggerHaptic('medium');

      const rec = new SpeechRecognition();
      rec.lang = 'bn-BD';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      setActiveVoiceField(fieldKey);
      setFieldVoiceStatus(`🎙️ ${customLabel || 'শুনছি... মুখে বলুন'}`);

      rec.onstart = () => {
        setActiveVoiceField(fieldKey);
      };

      rec.onresult = (event: any) => {
        const { fullTranscript } = extractTranscriptFromEvent(event);
        if (!fullTranscript) return;

        let processed = cleanSpokenBengali(fullTranscript);
        if (isNumeric) {
          processed = parseBanglaNumber(processed);
          if (fieldKey === 'customerPhone' || fieldKey === 'guarantorPhone') {
            processed = processed.replace(/\D/g, '');
          }
        }

        // Live populate field
        if (fieldKey === 'paymentAmount') {
          setPaymentAmount(processed);
        } else {
          setForm(prev => ({ ...prev, [fieldKey]: processed }));
        }
        setFieldVoiceStatus(`✓ "${processed}"`);

        // Silence timer for auto-commit
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          playSuccessChime();
          triggerHaptic('success');
          stopFieldVoice();
        }, 1100);
      };

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech') return;
        console.warn('Field voice recognition error:', e.error);
        stopFieldVoice();
      };

      rec.onend = () => {
        setActiveVoiceField(null);
        setFieldVoiceStatus('');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      stopFieldVoice();
    }
  };

  useEffect(() => {
    return () => {
      stopFieldVoice();
    };
  }, []);

  const loadInstallments = async () => {
    if (!currentTenantId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/installments?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setInstallments(Array.isArray(data) ? data : []);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadInstallments();
  }, [currentTenantId]);

  // Handle Add Installment
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.productName || !form.totalAmount || !currentTenantId) return;
    triggerHaptic('success');
    stopFieldVoice();

    try {
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          ...form,
          customerPhone: form.customerPhone || '01700000000'
        })
      });

      if (res.ok) {
        setNotice(`✓ "${form.customerName}"-এর নামে ${form.productName} কিস্তির হিসাব সফলভাবে তৈরি হয়েছে!`);
        if (speakAnnouncement) {
          speakAnnouncement(`${form.customerName} এর কিস্তি হিসাব সফলভাবে সংরক্ষণ করা হয়েছে`);
        }
        setShowAddModal(false);
        setForm({
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          guarantorName: '',
          guarantorPhone: '',
          productName: '',
          totalAmount: '',
          downPayment: '',
          totalMonths: '4',
          notes: ''
        });
        await loadInstallments();
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Handle Collect Installment Payment
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModalItem || !paymentAmount) return;
    triggerHaptic('success');
    stopFieldVoice();

    const numAmount = Number(paymentAmount);
    try {
      const res = await fetch(`/api/installments/${collectModalItem.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod,
          notes: paymentNotes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNotice(`✓ ৳${numAmount} কিস্তির টাকা সফলভাবে জমা হয়েছে! নতুন বাকি: ৳${data.remainingDue}`);
        if (speakAnnouncement) {
          speakAnnouncement(`${collectModalItem.customer_name} এর থেকে ${numAmount} টাকা কিস্তি জমা নেওয়া হয়েছে`);
        }
        setCollectModalItem(null);
        setPaymentAmount('');
        setPaymentNotes('');
        await loadInstallments();
        setTimeout(() => setNotice(''), 3500);
      }
    } catch (e) {}
  };

  // Send WhatsApp Reminder
  const sendWhatsAppReminder = (inst: any) => {
    triggerHaptic('medium');
    const msg = `আসসালামু আলাইকুম ${inst.customer_name} ভাই,\n` +
      `আপনার ${tenant?.shopName || 'দোকান'} থেকে নেওয়া "${inst.product_name}" পণ্যের মাসিক কিস্তি ৳${inst.monthly_installment} আগামী ${inst.next_due_date} তারিখের মধ্যে পরিশোধের জন্য অনুরোধ করা হলো।\n\n` +
      `📊 বর্তমান মোট বাকি কিস্তি: ৳${inst.remaining_due}\n` +
      `💳 বিকাশ/নগদ পাঠাতে: ${tenant?.phone || ''}\n\n` +
      `ধন্যবাদান্তে,\n${tenant?.shopName || ''}\n${tenant?.ownerName || ''} (${tenant?.phone || ''})`;

    const url = `https://wa.me/88${inst.customer_phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Stats
  const activeItems = installments.filter(i => i.status === 'active');
  const completedItems = installments.filter(i => i.status === 'completed');
  const totalDueAmount = activeItems.reduce((acc, i) => acc + (Number(i.remaining_due) || 0), 0);

  const filtered = installments.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = (i.customer_name && i.customer_name.toLowerCase().includes(q)) ||
                        (i.customer_phone && i.customer_phone.includes(q)) ||
                        (i.product_name && i.product_name.toLowerCase().includes(q)) ||
                        (i.guarantor_name && i.guarantor_name.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <FeatureGate featureKey="enableInstallments" requiredPlan="pro" title="বাকির কিস্তি খাতা প্রো প্ল্যানে অন্তর্ভুক্ত">
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px, 4.5vw, 24px)', fontWeight: '900', color: '#0f172a', margin: '0 0 2px' }}>
            📅 বাকির কিস্তি
          </h1>
          <span style={{ fontSize: 'clamp(11px, 3.2vw, 13px)', color: '#64748b' }}>
            {tenant?.shopName} • মোবাইল, ফ্রিজ ও পণ্যের সহজ মাসিক কিস্তি হিসাব
          </span>
        </div>

        <button
          onClick={() => { setShowAddModal(true); triggerHaptic('light'); }}
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
          }}
        >
          <span>➕</span> নতুন কিস্তি বিক্রি
        </button>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '13px', fontWeight: '800' }}>
          {notice}
        </div>
      )}

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '10px 12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', lineHeight: 1.2 }}>চলমান কিস্তি</span>
          <div className="num-font" style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', color: '#4f46e5', marginTop: '2px' }}>
            {activeItems.length} <span style={{ fontSize: '11px', fontWeight: '600' }}>জন</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '10px 12px', border: '1px solid #fee2e2', borderLeft: '3.5px solid #ef4444', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', lineHeight: 1.2 }}>মোট বাকি</span>
          <div className="num-font" style={{ fontSize: 'clamp(17px, 3.8vw, 21px)', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
            ৳{totalDueAmount.toLocaleString('en-US')}
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '10px 12px', border: '1px solid #dcfce7', borderLeft: '3.5px solid #10b981', boxShadow: '0 1px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', display: 'block', lineHeight: 1.2 }}>পরিশোধিত</span>
          <div className="num-font" style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', color: '#059669', marginTop: '2px' }}>
            {completedItems.length} <span style={{ fontSize: '11px', fontWeight: '600' }}>জন</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <input
            type="text"
            placeholder="🔍 গ্রাহক, ফোন বা পণ্যের নাম..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setStatusFilter('all'); triggerHaptic('light'); }}
            style={{ background: statusFilter === 'all' ? '#4f46e5' : 'transparent', color: statusFilter === 'all' ? '#fff' : '#475569', border: 'none', padding: '6px 9px', borderRadius: '8px', fontWeight: '700', fontSize: '11.5px', cursor: 'pointer' }}
          >
            সকল ({installments.length})
          </button>
          <button
            onClick={() => { setStatusFilter('active'); triggerHaptic('light'); }}
            style={{ background: statusFilter === 'active' ? '#ea580c' : 'transparent', color: statusFilter === 'active' ? '#fff' : '#475569', border: 'none', padding: '6px 9px', borderRadius: '8px', fontWeight: '700', fontSize: '11.5px', cursor: 'pointer' }}
          >
            চলমান ({activeItems.length})
          </button>
          <button
            onClick={() => { setStatusFilter('completed'); triggerHaptic('light'); }}
            style={{ background: statusFilter === 'completed' ? '#059669' : 'transparent', color: statusFilter === 'completed' ? '#fff' : '#475569', border: 'none', padding: '6px 9px', borderRadius: '8px', fontWeight: '700', fontSize: '11.5px', cursor: 'pointer' }}
          >
            পরিশোধিত ({completedItems.length})
          </button>
        </div>
      </div>

      {/* Installments List */}
      {loading ? (
        <DataLoader type="skeleton-list" count={4} text="কিস্তির হিসাব তালিকা লোড হচ্ছে..." />
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '18px', padding: '40px 20px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>📅</span>
          <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0f172a' }}>কোনো কিস্তির হিসাব পাওয়া যায়নি</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>নতুন কিস্তিতে পণ্য বিক্রি শুরু করতে &quot;নতুন কিস্তি বিক্রি&quot; বাটনে ক্লিক করুন।</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filtered.map(inst => {
            const isCompleted = inst.status === 'completed';
            return (
              <div
                key={inst.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>👤</span>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>{inst.customer_name}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>📞 {inst.customer_phone}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '800', marginTop: '2px' }}>
                      📱 পণ্য: {inst.product_name}
                    </div>
                    {inst.guarantor_name && (
                      <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>
                        জামিনদার: {inst.guarantor_name} ({inst.guarantor_phone})
                      </span>
                    )}
                  </div>

                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '99px',
                    background: isCompleted ? '#dcfce7' : '#fff7ed',
                    color: isCompleted ? '#15803d' : '#ea580c'
                  }}>
                    {isCompleted ? '✓ সম্পূর্ণ পরিশোধিত' : '⏳ চলমান কিস্তি'}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ background: '#f1f5f9', borderRadius: '99px', height: '8px', overflow: 'hidden', margin: '10px 0' }}>
                  <div style={{
                    background: isCompleted ? '#10b981' : '#ea580c',
                    height: '100%',
                    width: `${Math.min(100, Math.round(((inst.total_amount - inst.remaining_due) / inst.total_amount) * 100))}%`
                  }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '12px', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>মোট মূল্য</span>
                    <strong className="num-font" style={{ fontSize: '14px', color: '#0f172a' }}>৳{inst.total_amount}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>ডাউন পেমেন্ট</span>
                    <strong className="num-font" style={{ fontSize: '14px', color: '#059669' }}>৳{inst.down_payment}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>বাকি কিস্তি</span>
                    <strong className="num-font" style={{ fontSize: '15px', color: '#dc2626' }}>৳{inst.remaining_due}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>মাসিক কিস্তি</span>
                    <strong className="num-font" style={{ fontSize: '14px', color: '#4f46e5' }}>৳{inst.monthly_installment}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>পরবর্তী কিস্তির তারিখ</span>
                    <strong style={{ fontSize: '12.5px', color: '#d97706' }}>📅 {inst.next_due_date}</strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', flexWrap: 'wrap' }}>
                  {!isCompleted && (
                    <>
                      <button
                        onClick={() => sendWhatsAppReminder(inst)}
                        style={{
                          background: '#25d366',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 12px',
                          borderRadius: '9px',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>💬</span> WhatsApp তাগাদা
                      </button>

                      <button
                        onClick={() => { setCollectModalItem(inst); setPaymentAmount(String(inst.monthly_installment)); triggerHaptic('light'); }}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 14px',
                          borderRadius: '9px',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>💵</span> কিস্তির টাকা জমা নিন
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW INSTALLMENT MODAL WITH DIRECT FIELD-BY-FIELD VOICE MIC */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  ➕ নতুন কিস্তি বিক্রি
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>যেকোনো ফিল্ডের পাশে 🎙️ চেপে মুখে বলুন</span>
              </div>
              <button onClick={() => { setShowAddModal(false); stopFieldVoice(); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Active Voice Live Floating Banner if listening */}
            {activeVoiceField && (
              <div style={{
                background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
                border: '1.5px solid #f87171',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                  <strong style={{ fontSize: '13px', color: '#991b1b' }}>{fieldVoiceStatus || '🎙️ শুনছি... মুখে বলুন'}</strong>
                </div>
                <button
                  type="button"
                  onClick={stopFieldVoice}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                >
                  ⏹ বন্ধ করুন
                </button>
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: '12px' }}>
              
              {/* Field 1: Customer Name */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>👤 গ্রাহকের নাম:</label>
                  <button
                    type="button"
                    onClick={() => startFieldVoice('customerName', false, 'গ্রাহকের নাম')}
                    style={{
                      background: activeVoiceField === 'customerName' ? '#ef4444' : '#eef2ff',
                      color: activeVoiceField === 'customerName' ? '#fff' : '#4f46e5',
                      border: activeVoiceField === 'customerName' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: activeVoiceField === 'customerName' ? '0 0 0 3px rgba(239, 68, 68, 0.25)' : 'none'
                    }}
                  >
                    <span>🎙️</span> {activeVoiceField === 'customerName' ? '⏹ শুনছি...' : 'মুখে বলুন'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="যেমন: মো: রহিম মিয়া"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: activeVoiceField === 'customerName' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: activeVoiceField === 'customerName' ? '#fff5f5' : '#fff'
                  }}
                />
              </div>

              {/* Field 2 & 3: Mobile & Address */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>📞 মোবাইল:</label>
                    <button
                      type="button"
                      onClick={() => startFieldVoice('customerPhone', true, 'মোবাইল নম্বর')}
                      style={{
                        background: activeVoiceField === 'customerPhone' ? '#ef4444' : '#eef2ff',
                        color: activeVoiceField === 'customerPhone' ? '#fff' : '#4f46e5',
                        border: activeVoiceField === 'customerPhone' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span>🎙️</span> {activeVoiceField === 'customerPhone' ? 'শুনছি' : 'ভয়েস'}
                    </button>
                  </div>
                  <input
                    type="tel"
                    placeholder="017xxxxxxxx"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeVoiceField === 'customerPhone' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: activeVoiceField === 'customerPhone' ? '#fff5f5' : '#fff'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>📍 ঠিকানা:</label>
                    <button
                      type="button"
                      onClick={() => startFieldVoice('customerAddress', false, 'ঠিকানা')}
                      style={{
                        background: activeVoiceField === 'customerAddress' ? '#ef4444' : '#eef2ff',
                        color: activeVoiceField === 'customerAddress' ? '#fff' : '#4f46e5',
                        border: activeVoiceField === 'customerAddress' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span>🎙️</span> {activeVoiceField === 'customerAddress' ? 'শুনছি' : 'ভয়েস'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="ঠিকানা / গ্রাম"
                    value={form.customerAddress}
                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeVoiceField === 'customerAddress' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: activeVoiceField === 'customerAddress' ? '#fff5f5' : '#fff'
                    }}
                  />
                </div>
              </div>

              {/* Field 4: Product Name / Model */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>📱 পণ্যের নাম / মডেল:</label>
                  <button
                    type="button"
                    onClick={() => startFieldVoice('productName', false, 'পণ্যের নাম ও মডেল')}
                    style={{
                      background: activeVoiceField === 'productName' ? '#ef4444' : '#eef2ff',
                      color: activeVoiceField === 'productName' ? '#fff' : '#4f46e5',
                      border: activeVoiceField === 'productName' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: activeVoiceField === 'productName' ? '0 0 0 3px rgba(239, 68, 68, 0.25)' : 'none'
                    }}
                  >
                    <span>🎙️</span> {activeVoiceField === 'productName' ? '⏹ শুনছি...' : 'মুখে বলুন'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="যেমন: Samsung Galaxy A15 (128GB) / Walton ফ্রিজ"
                  value={form.productName}
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: activeVoiceField === 'productName' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: activeVoiceField === 'productName' ? '#fff5f5' : '#fff'
                  }}
                />
              </div>

              {/* Field 5 & 6: Total Amount & Down Payment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>💰 মোট মূল্য (৳):</label>
                    <button
                      type="button"
                      onClick={() => startFieldVoice('totalAmount', true, 'মোট মূল্য')}
                      style={{
                        background: activeVoiceField === 'totalAmount' ? '#ef4444' : '#eef2ff',
                        color: activeVoiceField === 'totalAmount' ? '#fff' : '#4f46e5',
                        border: activeVoiceField === 'totalAmount' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span>🎙️</span> {activeVoiceField === 'totalAmount' ? 'শুনছি' : 'ভয়েস'}
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="যেমন: 22000"
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                    required
                    className="num-font"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeVoiceField === 'totalAmount' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: activeVoiceField === 'totalAmount' ? '#fff5f5' : '#fff'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>💵 ডাউন পেমেন্ট (৳):</label>
                    <button
                      type="button"
                      onClick={() => startFieldVoice('downPayment', true, 'ডাউন পেমেন্ট')}
                      style={{
                        background: activeVoiceField === 'downPayment' ? '#ef4444' : '#eef2ff',
                        color: activeVoiceField === 'downPayment' ? '#fff' : '#4f46e5',
                        border: activeVoiceField === 'downPayment' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span>🎙️</span> {activeVoiceField === 'downPayment' ? 'শুনছি' : 'ভয়েস'}
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="যেমন: 6000"
                    value={form.downPayment}
                    onChange={(e) => setForm({ ...form, downPayment: e.target.value })}
                    className="num-font"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeVoiceField === 'downPayment' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: activeVoiceField === 'downPayment' ? '#fff5f5' : '#fff'
                    }}
                  />
                </div>
              </div>

              {/* Field 7 & 8: Duration (Months) & Guarantor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>📅 কিস্তির মেয়াদ (মাস):</label>
                  <select
                    value={form.totalMonths}
                    onChange={(e) => setForm({ ...form, totalMonths: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="2">২ মাস</option>
                    <option value="3">৩ মাস</option>
                    <option value="4">৪ মাস</option>
                    <option value="6">৬ মাস</option>
                    <option value="9">৯ মাস</option>
                    <option value="12">১২ মাস (১ বছর)</option>
                    <option value="18">১৮ মাস</option>
                    <option value="24">২৪ মাস (২ বছর)</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>🤝 জামিনদার:</label>
                    <button
                      type="button"
                      onClick={() => startFieldVoice('guarantorName', false, 'জামিনদারের নাম')}
                      style={{
                        background: activeVoiceField === 'guarantorName' ? '#ef4444' : '#eef2ff',
                        color: activeVoiceField === 'guarantorName' ? '#fff' : '#4f46e5',
                        border: activeVoiceField === 'guarantorName' ? '1px solid #dc2626' : '1px solid #c7d2fe',
                        borderRadius: '6px',
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <span>🎙️</span> {activeVoiceField === 'guarantorName' ? 'শুনছি' : 'ভয়েস'}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="জামিনদারের নাম"
                    value={form.guarantorName}
                    onChange={(e) => setForm({ ...form, guarantorName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: activeVoiceField === 'guarantorName' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: activeVoiceField === 'guarantorName' ? '#fff5f5' : '#fff'
                    }}
                  />
                </div>
              </div>

              {/* Calculated Live Preview */}
              {Number(form.totalAmount) > 0 && (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>বাকি কিস্তি: </span>
                    <strong className="num-font" style={{ color: '#dc2626', fontSize: '13.5px' }}>
                      ৳{(Math.max(0, (Number(form.totalAmount) || 0) - (Number(form.downPayment) || 0))).toLocaleString('en-US')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>প্রতি মাসে: </span>
                    <strong className="num-font" style={{ color: '#4f46e5', fontSize: '13.5px' }}>
                      ৳{(Math.round(Math.max(0, (Number(form.totalAmount) || 0) - (Number(form.downPayment) || 0)) / (Math.max(1, Number(form.totalMonths) || 1)))).toLocaleString('en-US')}
                    </strong>
                  </div>
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                ✓ কিস্তি তৈরি করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL WITH DIRECT VOICE */}
      {collectModalItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                💵 কিস্তির টাকা জমা গ্রহণ
              </h3>
              <button onClick={() => { setCollectModalItem(null); stopFieldVoice(); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '13px' }}>
              <div>গ্রাহক: <strong>{collectModalItem.customer_name}</strong></div>
              <div>পণ্য: <strong>{collectModalItem.product_name}</strong></div>
              <div style={{ color: '#dc2626', fontWeight: '800', marginTop: '2px' }}>বর্তমান বাকি: ৳{collectModalItem.remaining_due}</div>
            </div>

            <form onSubmit={handleCollectSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>জমার পরিমাণ (৳):</label>
                  <button
                    type="button"
                    onClick={() => startFieldVoice('paymentAmount', true, 'জমার পরিমাণ')}
                    style={{
                      background: activeVoiceField === 'paymentAmount' ? '#ef4444' : '#ecfdf5',
                      color: activeVoiceField === 'paymentAmount' ? '#fff' : '#059669',
                      border: activeVoiceField === 'paymentAmount' ? '1px solid #dc2626' : '1px solid #a7f3d0',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🎙️</span> {activeVoiceField === 'paymentAmount' ? '⏹ শুনছি...' : 'মুখে বলুন'}
                  </button>
                </div>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  className="num-font"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: activeVoiceField === 'paymentAmount' ? '2px solid #ef4444' : '1.5px solid #10b981',
                    fontSize: '18px',
                    fontWeight: '900',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: activeVoiceField === 'paymentAmount' ? '#fff5f5' : '#fff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '4px' }}>পেমেন্ট মাধ্যম:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff' }}
                >
                  <option value="cash">💵 ক্যাশ (নগদ)</option>
                  <option value="bkash">📱 বিকাশ (bKash)</option>
                  <option value="nagad">📱 নগদ (Nagad)</option>
                  <option value="bank">🏦 ব্যাংক</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginTop: '6px'
                }}
              >
                ✓ টাকা জমা নিশ্চিত করুন
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
    </FeatureGate>
  );
}
