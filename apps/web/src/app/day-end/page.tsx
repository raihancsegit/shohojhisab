'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function DayEndPage() {
  const { tenant, speakAnnouncement, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    cashSales: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    cashInHand: 0,
    totalMarketDue: 0,
    orderCount: 0
  });

  const [salesList, setSalesList] = useState<any[]>([]);
  const [openingCash, setOpeningCash] = useState('1000');
  const [actualCountedCash, setActualCountedCash] = useState('');
  const [dayClosed, setDayClosed] = useState(false);
  const [showNoteCounter, setShowNoteCounter] = useState(false);
  const [notesCount, setNotesCount] = useState<{ [denom: number]: string }>({
    1000: '',
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    10: '',
    5: '',
    2: '',
    1: ''
  });

  const noteMeta: { [denom: number]: { color: string; bg: string; border: string; label: string } } = {
    1000: { color: '#831843', bg: 'rgba(131, 24, 67, 0.08)', border: '#fbcfe8', label: '১০০০ টাকার নোট' },
    500: { color: '#047857', bg: 'rgba(5, 150, 105, 0.08)', border: '#a7f3d0', label: '৫০০ টাকার নোট' },
    200: { color: '#b45309', bg: 'rgba(217, 119, 6, 0.08)', border: '#fde68a', label: '২০০ টাকার নোট' },
    100: { color: '#1d4ed8', bg: 'rgba(37, 99, 235, 0.08)', border: '#bfdbfe', label: '১০০ টাকার নোট' },
    50: { color: '#c2410c', bg: 'rgba(234, 88, 12, 0.08)', border: '#fed7aa', label: '৫০ টাকার নোট' },
    20: { color: '#0f766e', bg: 'rgba(13, 148, 136, 0.08)', border: '#99f6e4', label: '২০ টাকার নোট' },
    10: { color: '#be185d', bg: 'rgba(190, 24, 93, 0.08)', border: '#fbcfe8', label: '১০ টাকার নোট' },
    5: { color: '#334155', bg: 'rgba(71, 85, 105, 0.08)', border: '#cbd5e1', label: '৫ টাকার নোট/কয়েন' },
    2: { color: '#334155', bg: 'rgba(71, 85, 105, 0.08)', border: '#cbd5e1', label: '২ টাকার নোট/কয়েন' },
    1: { color: '#334155', bg: 'rgba(71, 85, 105, 0.08)', border: '#cbd5e1', label: '১ টাকার কয়েন' },
  };

  const totalCalculatedNotesAmount = Object.entries(notesCount).reduce((acc, [denom, count]) => {
    return acc + (Number(denom) * (Number(count) || 0));
  }, 0);

  const updateNoteCount = (denom: number, delta: number) => {
    triggerHaptic?.('light');
    const current = Number(notesCount[denom]) || 0;
    const nextVal = Math.max(0, current + delta);
    setNotesCount(prev => ({
      ...prev,
      [denom]: nextVal === 0 ? '' : String(nextVal)
    }));
  };

  const clearNotesCount = () => {
    triggerHaptic?.('medium');
    setNotesCount({
      1000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: ''
    });
  };

  const applyNotesToActual = () => {
    triggerHaptic?.('success');
    setActualCountedCash(String(totalCalculatedNotesAmount));
    setShowNoteCounter(false);
  };

  const handlePrintDayEnd = () => {
    window.print();
  };

  const loadData = async () => {
    if (!currentTenantId) return;
    try {
      const repRes = await fetch(`/api/reports/day-end?tenantId=${currentTenantId}`);
      if (repRes.ok) setMetrics(await repRes.json());

      const salesRes = await fetch(`/api/sales?tenantId=${currentTenantId}`);
      if (salesRes.ok) setSalesList(await salesRes.json());
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, [currentTenantId]);

  // Expected Cash calculation: Opening Cash + Today's Cash Sales - Expenses
  const openingNum = Number(openingCash) || 0;
  const expectedCashInBox = openingNum + metrics.cashSales - metrics.expenses;
  const countedNum = Number(actualCountedCash) || 0;
  const cashDifference = countedNum - expectedCashInBox;

  const handleCloseDay = () => {
    if (!actualCountedCash) {
      alert('দয়া করে ক্যাশ ড্রয়ারে গুনে পাওয়া টাকার পরিমাণ লিখুন!');
      return;
    }
    setDayClosed(true);
    triggerHaptic?.('success');
    speakAnnouncement(`আজকের দিন সফলভাবে সমাপ্ত হয়েছে। মোট বিক্রি ${metrics.totalSales} টাকা। নিট লাভ ${metrics.netProfit} টাকা। ক্যাশ ড্রয়ারে পাওয়া গেছে ${countedNum} টাকা।`);
  };

  const handleSendDayEndWhatsApp = () => {
    const todayStr = new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    const countedNotesDetails = Object.entries(notesCount)
      .filter(([_, count]) => Number(count) > 0)
      .map(([denom, count]) => `  • ৳${denom} × ${count}টি = ৳${Number(denom) * Number(count)}`)
      .join('\n');

    const text = encodeURIComponent(
      `🌙 *${tenant?.shopName || 'দোকান'} - দিন শেষের হিসাব বিবরণী*\n` +
      `📅 তারিখ: ${todayStr}\n\n` +
      `📊 *মোট বিক্রি:* ৳${metrics.totalSales.toLocaleString('en-US')}\n` +
      `💵 *নগদ বিক্রি:* ৳${metrics.cashSales.toLocaleString('en-US')}\n` +
      `📉 *দোকান খরচ:* ৳${metrics.expenses.toLocaleString('en-US')}\n` +
      `🏆 *আসল নিট লাভ:* ৳${metrics.netProfit.toLocaleString('en-US')}\n\n` +
      `💰 *সকালের প্রারম্ভিক ক্যাশ:* ৳${openingNum.toLocaleString('en-US')}\n` +
      `🗄️ *হিসাব অনুযায়ী ড্রয়ার ক্যাশ:* ৳${expectedCashInBox.toLocaleString('en-US')}\n` +
      `✋ *আসল গুনে পাওয়া ক্যাশ:* ৳${countedNum.toLocaleString('en-US')}\n` +
      `⚖️ *ক্যাশ স্ট্যাটাস:* ${cashDifference === 0 ? 'সম্পূর্ণ মিলেছে (০)' : cashDifference > 0 ? `অতিরিক্ত +৳${cashDifference}` : `ঘাটতি -৳${Math.abs(cashDifference)}`}\n\n` +
      (countedNotesDetails ? `🖩 *নোট গণনার বিবরণ:*\n${countedNotesDetails}\n\n` : '') +
      `🧾 মোট ইনভয়েস: ${metrics.orderCount}টি\n\n` +
      `— ডিজিটাল লোকাল বিজনেস ওএস`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '99px' }}>
          🌙 ক্যাশ ড্রয়ার ও দিন ক্লোজিং
        </span>
        <h1 className="page-title" style={{ color: '#0f172a', margin: '4px 0 2px', fontSize: 'clamp(18px, 4.5vw, 22px)', fontWeight: '900' }}>
          দিন শেষের ক্যাশ মিলানো ও হিসাব
        </h1>
        <p className="page-subtitle" style={{ margin: 0, color: '#64748b', fontSize: 'clamp(11px, 3.2vw, 12.5px)' }}>
          {tenant?.shopName} • দোকান বন্ধ করার আগে ক্যাশের টাকা মিলিয়ে দিন সমাপ্ত করুন
        </p>
      </div>

      {/* Main Net Profit & Sales Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)',
        borderRadius: '16px',
        padding: '14px 16px',
        color: '#fff',
        marginBottom: '14px',
        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11.5px', background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '99px', fontWeight: '700' }}>
            📅 আজকের খাঁটি হিসাব
          </span>
          <span style={{ fontSize: '11px', color: '#a7f3d0' }}>
            মোট {metrics.orderCount}টি বিক্রয়
          </span>
        </div>

        <span style={{ fontSize: '12px', color: '#a7f3d0', display: 'block' }}>আজকের আসল নিট লাভ (খরচ বাদে):</span>
        <div className="num-font" style={{ fontSize: 'clamp(24px, 5.5vw, 32px)', fontWeight: '900', margin: '2px 0 10px' }}>
          ৳{metrics.netProfit.toLocaleString('en-US')}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.22)',
          borderRadius: '12px',
          padding: '8px 12px'
        }}>
          <div>
            <span style={{ fontSize: '10px', color: '#cbd5e1', display: 'block' }}>মোট বিক্রি</span>
            <strong className="num-font" style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', color: '#fff' }}>৳{metrics.totalSales.toLocaleString('en-US')}</strong>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: '#cbd5e1', display: 'block' }}>নগদ বিক্রি</span>
            <strong className="num-font" style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', color: '#86efac' }}>৳{metrics.cashSales.toLocaleString('en-US')}</strong>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: '#cbd5e1', display: 'block' }}>দোকান খরচ</span>
            <strong className="num-font" style={{ fontSize: 'clamp(13px, 3.5vw, 15px)', color: '#fca5a5' }}>৳{metrics.expenses.toLocaleString('en-US')}</strong>
          </div>
        </div>
      </div>

      {/* Cash Drawer Reconciliation Box */}
      <div className="ui-card" style={{ marginBottom: '24px', border: '1.5px solid #cbd5e1' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
          💰 ক্যাশ ড্রয়ার / ক্যাশ বাক্স মিলানো
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 18px' }}>
          সকালের শুরু ক্যাশ এবং আজকের বেচাকেনা অনুযায়ী ক্যাশ মিলান:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              প্রারম্ভিক ক্যাশ (সকালের ক্যাশ বক্সের টাকা):
            </label>
            <input
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="num-font"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '700', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>
                ক্যাশ বক্সে গুনে পাওয়া আসল টাকা: *
              </label>
              <button
                type="button"
                onClick={() => setShowNoteCounter(!showNoteCounter)}
                style={{
                  background: showNoteCounter ? '#4f46e5' : '#ede9fe',
                  color: showNoteCounter ? '#fff' : '#6d28d9',
                  border: 'none',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                🖩 স্মার্ট নোট কাউন্টার {showNoteCounter ? '▲ বন্ধ' : '▼ খুলুন'}
              </button>
            </div>

            <input
              type="number"
              value={actualCountedCash}
              onChange={(e) => setActualCountedCash(e.target.value)}
              placeholder="হাত দিয়ে গুনে লিখুন বা নোট কাউন্টার ব্যবহার করুন"
              className="num-font"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '2px solid #10b981',
                fontSize: '17px',
                fontWeight: '900',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* SMART NOTE COUNTER GRID */}
        {showNoteCounter && (
          <div style={{
            background: 'var(--bg-canvas, #f8fafc)',
            padding: '16px',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🖩</span> নোট ও কয়েন কাউন্টার
                </strong>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  প্রতিটি নোটের সংখ্যা বাটন চেপে বা লিখে দ্রুত হিসাব মিলান
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={clearNotesCount}
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  সব মুছুন
                </button>
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10.5px', color: '#065f46', fontWeight: '700', display: 'block' }}>কাউন্টার মোট</span>
                  <span className="num-font" style={{ fontSize: '17px', fontWeight: '900', color: '#047857' }}>
                    ৳{totalCalculatedNotesAmount.toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => {
                const meta = noteMeta[denom] || { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1', label: `৳${denom}` };
                const count = notesCount[denom] || '';
                const countNum = Number(count) || 0;
                const sub = (Number(denom) * countNum);
                return (
                  <div
                    key={denom}
                    style={{
                      background: 'var(--bg-card, #ffffff)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: countNum > 0 ? `1.5px solid ${meta.color}` : '1px solid #e2e8f0',
                      boxShadow: countNum > 0 ? `0 2px 8px ${meta.bg}` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '900',
                        color: meta.color,
                        background: meta.bg,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${meta.border}`
                      }}>
                        ৳{denom}
                      </span>
                      <span className="num-font" style={{ fontSize: '12px', color: sub > 0 ? '#059669' : '#94a3b8', fontWeight: '800' }}>
                        ৳{sub.toLocaleString('en-US')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => updateNoteCount(denom, -1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontWeight: '900',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center'
                        }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        placeholder="০"
                        value={count}
                        onChange={(e) => setNotesCount({ ...notesCount, [denom]: e.target.value })}
                        className="num-font"
                        style={{
                          flex: 1,
                          height: '32px',
                          textAlign: 'center',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          fontWeight: '800',
                          background: 'var(--bg-card, #ffffff)',
                          color: 'var(--text-primary, #0f172a)',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => updateNoteCount(denom, 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          color: meta.color,
                          fontWeight: '900',
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center'
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={applyNotesToActual}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              ✓ ড্রয়ারে আসল টাকা হিসেবে বসান (মোট ৳{totalCalculatedNotesAmount.toLocaleString('en-US')})
            </button>
          </div>
        )}

        {/* Calculated Cash in Drawer Display */}
        <div style={{
          background: '#f8fafc',
          padding: '16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block' }}>
              হিসাব অনুযায়ী ক্যাশ বক্সে থাকার কথা:
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              (সকালের ৳{openingNum} + নগদ বিক্রি ৳{metrics.cashSales} - খরচ ৳{metrics.expenses})
            </span>
          </div>
          <div className="num-font" style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>
            ৳{expectedCashInBox.toLocaleString('en-US')}
          </div>
        </div>

        {/* Reconciliation Status Alert */}
        {actualCountedCash && (
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '800',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: cashDifference === 0 ? '#ecfdf5' : cashDifference > 0 ? '#eff6ff' : '#fef2f2',
            border: cashDifference === 0 ? '1.5px solid #a7f3d0' : cashDifference > 0 ? '1.5px solid #bfdbfe' : '1.5px solid #fecaca',
            color: cashDifference === 0 ? '#065f46' : cashDifference > 0 ? '#1e40af' : '#b91c1c'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{cashDifference === 0 ? '✓' : cashDifference > 0 ? 'ℹ️' : '⚠️'}</span>
              <span>
                {cashDifference === 0
                  ? 'আলহামদুলিল্লাহ! ক্যাশ ড্রয়ার সম্পূর্ণ মিলেছে।'
                  : cashDifference > 0
                  ? `ক্যাশ বক্সে অতিরিক্ত আছে: ৳${cashDifference.toLocaleString('en-US')}`
                  : `ক্যাশ শর্ট / ঘাটতি হয়েছে: ৳${Math.abs(cashDifference).toLocaleString('en-US')}`}
              </span>
            </div>
            <span className="num-font" style={{ fontSize: '18px', fontWeight: '900' }}>
              {cashDifference > 0 ? `+৳${cashDifference}` : cashDifference < 0 ? `-৳${Math.abs(cashDifference)}` : '০'}
            </span>
          </div>
        )}

        {dayClosed ? (
          <div style={{
            background: '#ecfdf5',
            padding: '18px',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1.5px solid #a7f3d0'
          }}>
            <span style={{ fontSize: '28px', display: 'block', marginBottom: '4px' }}>🔒</span>
            <strong style={{ fontSize: '16px', color: '#065f46', display: 'block' }}>
              আজকের দিন সফলভাবে সমাপ্ত ও ক্যাশ লক হয়েছে!
            </strong>
            <span style={{ fontSize: '12.5px', color: '#047857', display: 'block', marginBottom: '14px' }}>
              আজকের সমাপ্তি ক্যাশ ৳{countedNum.toLocaleString('en-US')} সেভ করা হয়েছে।
            </span>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleSendDayEndWhatsApp}
                style={{
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <span>💬</span> হোয়াটসঅ্যাপে হিসাব পাঠান
              </button>
              <button
                onClick={handlePrintDayEnd}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                }}
              >
                <span>🖨️</span> স্লিপ প্রিন্ট করুন
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCloseDay}
              style={{
                flex: 2,
                minWidth: '200px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
              }}
            >
              🌙 দিন সমাপ্ত ও ক্যাশ লক করুন
            </button>
            <button
              type="button"
              onClick={handlePrintDayEnd}
              style={{
                flex: 1,
                minWidth: '120px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🖨️ প্রিন্ট স্লিপ
            </button>
          </div>
        )}
      </div>

      {/* Recent Invoices List */}
      <div className="ui-card">
        <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
          🧾 আজকের বিক্রয় ইনভয়েস তালিকা ({salesList.length}টি)
        </h4>

        {salesList.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            আজকে কোনো বিক্রয় হয়নি।
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {salesList.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>#{s.invoiceNo || s.invoice_no}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>{s.customerName || 'নগদ ক্রেতা'} • {s.paymentMethod.toUpperCase()}</span>
                </div>
                <div className="num-font" style={{ fontWeight: '900', fontSize: '15px', color: '#0f172a' }}>
                  ৳{Number(s.totalAmount || s.total_amount || 0).toLocaleString('en-US')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
