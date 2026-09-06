'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

export default function ExpensesPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [expenses, setExpenses] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('দোকান ভাড়া');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = async () => {
    if (!currentTenantId) return;
    try {
      const res = await fetch(`http://localhost:4005/api/expenses?tenantId=${currentTenantId}`);
      if (res.ok) setExpenses(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    loadExpenses();

    const handleVoiceSuccess = () => {
      loadExpenses();
    };

    window.addEventListener('voice-action-success', handleVoiceSuccess);
    return () => {
      window.removeEventListener('voice-action-success', handleVoiceSuccess);
    };
  }, [currentTenantId]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !currentTenantId) return;
    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:4005/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          title,
          amount: Number(amount) || 0,
          category
        })
      });
      if (res.ok) {
        await loadExpenses();
        setNotice(`✓ খরচ "${title}" যোগ করা হয়েছে!`);
        setShowAddModal(false);
        setTitle('');
        setAmount('');
        setTimeout(() => setNotice(''), 4000);
      }
    } catch (e) {}
    setSubmitting(false);
  };

  const startVoiceInputForField = (setter: (val: string) => void, isNumeric = false) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। ক্রোম ব্যবহার করুন।');
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

  const totalExpense = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalExpensesCount = expenses.length;
  const paginatedExpenses = expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '110px' }}>
      {/* 🎙️ INTERACTIVE VOICE EXPENSE BANNER */}
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
          marginBottom: '16px',
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
            <strong style={{ fontSize: '13.5px', color: '#991b1b', display: 'block' }}>
              মুখে বলে খরচের এন্ট্রি করুন
            </strong>
            <span style={{ fontSize: '11.5px', color: '#b91c1c' }}>
              ট্যাপ করে বলুন: <em>"চা নাস্তা ৬০ টাকা"</em> বা <em>"দোকান ভাড়া ৫০০০ টাকা"</em>
            </span>
          </div>
        </div>
        <span style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800' }}>
          মুখে বলুন ➔
        </span>
      </div>
      <div style={{
        background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        borderRadius: '24px',
        padding: '22px 18px',
        color: '#fff',
        marginBottom: '16px'
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 2px' }}>💸 দৈনিক খরচ খাতা</h1>
        <span style={{ fontSize: '13px', color: '#fecaca', display: 'block' }}>দোকানের মোট খরচ:</span>
        <div className="num-font" style={{ fontSize: '32px', fontWeight: '900', margin: '2px 0 12px' }}>
          ৳{totalExpense.toLocaleString('en-US')}
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ width: '100%', background: '#fff', color: '#991b1b', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
          ➕ নতুন খরচ এন্ট্রি
        </button>
      </div>

      {notice && <div style={{ background: '#ecfdf5', border: '1.5px solid #86efac', color: '#065f46', padding: '12px', borderRadius: '12px', marginBottom: '14px', fontSize: '13.5px', fontWeight: '800' }}>{notice}</div>}

      {expenses.length === 0 ? (
        <div className="mobile-card" style={{ textAlign: 'center', padding: '36px 16px' }}>
          <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>💸</span>
          <h4 style={{ margin: '0 0 4px', color: '#0f172a' }}>কোনো খরচ এন্ট্রি নেই</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>দোকানের ভাড়া, বিদ্যুৎ বিল বা চা-নাস্তা খরচ যোগ করুন।</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {paginatedExpenses.map(e => (
            <div key={e.id} className="mobile-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{e.title}</strong>
                <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b' }}>{e.category}</span>
              </div>
              <strong className="num-font" style={{ fontSize: '16px', color: '#dc2626' }}>৳{e.amount}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Expenses Pagination */}
      {totalExpensesCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalExpensesCount}
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
          pageSizeOptions={[10, 15, 30, 50]}
          itemLabel="খরচ"
          themeColor="#dc2626"
        />
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: '900' }}>খরচের বিবরণ</h3>
            <form onSubmit={handleAddExpense} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>খরচের নাম / বিবরণ *</label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setTitle, false)}
                    style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#dc2626', cursor: 'pointer', fontWeight: '800' }}
                  >
                    🎙️ মুখে বলুন
                  </button>
                </div>
                <input type="text" placeholder="যেমন: বিদ্যুৎ বিল বা চা-নাস্তা" value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>টাকার পরিমাণ (৳) *</label>
                  <button
                    type="button"
                    onClick={() => startVoiceInputForField(setAmount, true)}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '800' }}
                  >
                    🎙️ মুখে বলুন
                  </button>
                </div>
                <input type="number" placeholder="০.০০" value={amount} onChange={e => setAmount(e.target.value)} required className="num-font" style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '18px', fontWeight: '900' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '4px' }}>খাত</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                  <option value="দোকান ভাড়া">দোকান ভাড়া</option>
                  <option value="বিদ্যুৎ বিল">বিদ্যুৎ বিল</option>
                  <option value="কর্মচারী বেতন">কর্মচারী বেতন</option>
                  <option value="চা-নাস্তা">চা-নাস্তা / মেহমানদারি</option>
                  <option value="পরিবহন">পরিবহন / কুলি খরচ</option>
                  <option value="অন্যান্য">অন্যান্য</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>বাতিল</button>
                <button type="submit" disabled={submitting} style={{ flex: 2, padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>✓ খরচ সেভ করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
