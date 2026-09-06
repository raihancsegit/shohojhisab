'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function DayEndPage() {
  const { tenant, speakAnnouncement } = useAuth();
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

  const totalCalculatedNotesAmount = Object.entries(notesCount).reduce((acc, [denom, count]) => {
    return acc + (Number(denom) * (Number(count) || 0));
  }, 0);

  const applyNotesToActual = () => {
    setActualCountedCash(String(totalCalculatedNotesAmount));
    setShowNoteCounter(false);
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
    speakAnnouncement(`আজকের দিন সফলভাবে সমাপ্ত হয়েছে। মোট বিক্রি ${metrics.totalSales} টাকা। নিট লাভ ${metrics.netProfit} টাকা। ক্যাশ ড্রয়ারে পাওয়া গেছে ${countedNum} টাকা।`);
  };

  const handleSendDayEndWhatsApp = () => {
    const todayStr = new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
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
      `⚖️ *ক্যাশ স্ট্যাটাস:* ${cashDifference === 0 ? 'সম্পূর্ণ মিলেছে (০)' : cashDifference > 0 ? `অতিরিক্ত +৳${cashDifference}` : `শর্ট -৳${Math.abs(cashDifference)}`}\n\n` +
      `🧾 মোট ইনভয়েস: ${metrics.orderCount}টি\n\n` +
      `— হিসাব রাখা হয়েছে ডিজিটাল লোকাল বিজনেস ওএস-এ`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '3px 10px', borderRadius: '99px' }}>
          🌙 ক্যাশ ড্রয়ার ও দিন ক্লোজিং
        </span>
        <h1 className="page-title" style={{ color: '#0f172a', margin: '6px 0 2px' }}>
          দিন শেষের ক্যাশ মিলানো ও হিসাব
        </h1>
        <p className="page-subtitle" style={{ margin: 0, color: '#64748b' }}>
          {tenant?.shopName} • দোকান বন্ধ করার আগে ক্যাশের টাকা মিলিয়ে দিন সমাপ্ত করুন
        </p>
      </div>

      {/* Main Net Profit & Sales Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #059669 100%)',
        borderRadius: '24px',
        padding: '24px 22px',
        color: '#fff',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(5, 150, 105, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12.5px', background: 'rgba(255,255,255,0.2)', padding: '3px 12px', borderRadius: '99px', fontWeight: '700' }}>
            📅 আজকের খাঁটি হিসাব
          </span>
          <span style={{ fontSize: '12px', color: '#a7f3d0' }}>
            মোট {metrics.orderCount}টি বিক্রয় সম্পন্ন
          </span>
        </div>

        <span style={{ fontSize: '13.5px', color: '#a7f3d0', display: 'block' }}>আজকের আসল নিট লাভ (খরচ বাদে):</span>
        <div className="num-font" style={{ fontSize: '36px', fontWeight: '900', margin: '2px 0 16px' }}>
          ৳{metrics.netProfit.toLocaleString('en-US')}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.22)',
          borderRadius: '16px',
          padding: '12px 16px'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block' }}>মোট বিক্রি</span>
            <strong className="num-font" style={{ fontSize: '16px', color: '#fff' }}>৳{metrics.totalSales.toLocaleString('en-US')}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block' }}>নগদ বিক্রি</span>
            <strong className="num-font" style={{ fontSize: '16px', color: '#86efac' }}>৳{metrics.cashSales.toLocaleString('en-US')}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block' }}>দোকান খরচ</span>
            <strong className="num-font" style={{ fontSize: '16px', color: '#fca5a5' }}>৳{metrics.expenses.toLocaleString('en-US')}</strong>
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
          <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: '16px', border: '1.5px solid #ddd6fe', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <strong style={{ fontSize: '13.5px', color: '#5b21b6' }}>
                🖩 ক্যাশ নোট কাউন্টার (নোটের সংখ্যা লিখুন)
              </strong>
              <span className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#6d28d9' }}>
                মোট: ৳{totalCalculatedNotesAmount.toLocaleString('en-US')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {[1000, 500, 200, 100, 50, 20, 10, 5, 2, 1].map(denom => {
                const count = notesCount[denom] || '';
                const sub = (Number(denom) * (Number(count) || 0));
                return (
                  <div key={denom} style={{ background: '#fff', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>৳{denom}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="০"
                      value={count}
                      onChange={(e) => setNotesCount({ ...notesCount, [denom]: e.target.value })}
                      className="num-font"
                      style={{ width: '45px', padding: '4px', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700' }}
                    />
                    <span className="num-font" style={{ fontSize: '11px', color: '#059669', fontWeight: '800', minWidth: '35px', textAlign: 'right' }}>
                      ৳{sub}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={applyNotesToActual}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
                color: '#fff',
                border: 'none',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: '900',
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              ✓ মোট ৳{totalCalculatedNotesAmount} আসল ক্যাশ হিসেবে বসান
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
                  : `ক্যাশ শর্ট / কম হয়েছে: ৳${Math.abs(cashDifference).toLocaleString('en-US')}`}
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

            <button
              onClick={handleSendDayEndWhatsApp}
              style={{
                background: '#25D366',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
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
              <span>💬</span> মালিক বা পার্টনারকে হোয়াটসঅ্যাপে হিসাব পাঠান
            </button>
          </div>
        ) : (
          <button
            onClick={handleCloseDay}
            style={{
              width: '100%',
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
