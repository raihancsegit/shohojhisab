'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

export default function ReportsPage() {
  const { tenant, activeRoleMode, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [period, setPeriod] = useState<'today' | '3days' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(false);
  const [showDayEndModal, setShowDayEndModal] = useState(false);
  const [startingCashInput, setStartingCashInput] = useState('0');

  // Product breakdown pagination
  const [prodPage, setProdPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(15);

  // Invoices list pagination & search
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(15);

  const [analyticsData, setAnalyticsData] = useState<any>({
    period: 'today',
    periodLabel: 'আজকের',
    summary: {
      totalSales: 0,
      cashSales: 0,
      totalDueSales: 0,
      totalCost: 0,
      expenses: 0,
      netProfit: 0,
      orderCount: 0,
      cashInHand: 0
    },
    paymentBreakdown: {
      cash: { amount: 0, percent: 0 },
      digital: { amount: 0, percent: 0 },
      due: { amount: 0, percent: 0 }
    },
    peakHours: [],
    topChampions: [],
    slowMovingStock: [],
    topDueCustomers: [],
    topCashCustomers: [],
    productsBreakdown: []
  });

  const [salesList, setSalesList] = useState<any[]>([]);

  const loadAnalytics = (selectedPeriod: 'today' | '3days' | 'week' | 'month') => {
    if (!currentTenantId) return;
    setLoading(true);
    fetch(`/api/reports/analytics?tenantId=${currentTenantId}&period=${selectedPeriod}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.summary) {
          setAnalyticsData(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!currentTenantId) return;
    loadAnalytics(period);

    fetch(`/api/sales?tenantId=${currentTenantId}`)
      .then(res => res.json())
      .then(data => setSalesList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [currentTenantId, period]);

  // One-Click Excel / CSV Export with UTF-8 BOM
  const handleExportCSV = () => {
    triggerHaptic('success');
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Bengali support

    csvContent += `দোকানের নাম:,${tenant?.shopName || 'দোকান'}\n`;
    csvContent += `রিপোর্টের সময়সীমা:,${analyticsData.periodLabel}\n`;
    csvContent += `তারিখ:,${new Date().toLocaleDateString('bn-BD')}\n\n`;

    csvContent += `--- আর্থিক সারসংক্ষেপ ---\n`;
    csvContent += `মোট বিক্রি (Revenue):,৳${analyticsData.summary?.totalSales || 0}\n`;
    csvContent += `মোট কেনা খরচ (Cost):,৳${analyticsData.summary?.totalCost || 0}\n`;
    csvContent += `দোকান খরচ (Expenses):,৳${analyticsData.summary?.expenses || 0}\n`;
    if (activeRoleMode === 'owner') {
      csvContent += `খাঁটি নিট লাভ (Profit):,৳${analyticsData.summary?.netProfit || 0}\n`;
    }
    csvContent += `নগদ আদায়:,৳${analyticsData.summary?.cashSales || 0}\n`;
    csvContent += `বাকি বিক্রি:,৳${analyticsData.summary?.totalDueSales || 0}\n\n`;

    // Individual Products Section
    csvContent += '--- পণ্যভিত্তিক বিক্রয় ও লাভ বিবরণী ---\n';
    csvContent += 'পণ্যের নাম,কতবার বিক্রি,মোট পরিমাণ,কেনা খরচ,মোট বিক্রি,নিট লাভ\n';
    (analyticsData.productsBreakdown || []).forEach((p: any) => {
      csvContent += `"${p.productName}",${p.timesSold},${p.quantitySold},${p.totalCost},${p.totalRevenue},${p.netEarned}\n`;
    });

    // Top Due Customers
    csvContent += '\n--- শীর্ষ বাকি ঝুঁকি তালিকা ---\n';
    csvContent += 'কাস্টমার নাম,মোবাইল,মোট বকেয়া\n';
    (analyticsData.topDueCustomers || []).forEach((c: any) => {
      csvContent += `"${c.name}","${c.phone || ''}",${c.totalDue}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${tenant?.shopName || 'dokan'}_analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analyticsData.summary || {};
  const products = analyticsData.productsBreakdown || [];
  const peakHours = analyticsData.peakHours || [];
  const paymentBreakdown = analyticsData.paymentBreakdown || { cash: { amount: 0, percent: 0 }, digital: { amount: 0, percent: 0 }, due: { amount: 0, percent: 0 } };
  const topChampions = analyticsData.topChampions || [];
  const slowMoving = analyticsData.slowMovingStock || [];
  const topDueRisk = analyticsData.topDueCustomers || [];
  const topCashCust = analyticsData.topCashCustomers || [];

  const startingCashNum = parseFloat(startingCashInput) || 0;
  const expectedDrawerCash = startingCashNum + (Number(summary.cashSales) || 0) - (Number(summary.expenses) || 0);

  // Reset invoice page on search change
  useEffect(() => {
    setInvoicePage(1);
  }, [invoiceSearch]);

  // Sliced products breakdown
  const totalProductsCount = products.length;
  const paginatedProducts = products.slice((prodPage - 1) * prodPageSize, prodPage * prodPageSize);

  // Filtered & sliced sales invoices
  const filteredSales = salesList.filter(s => {
    const q = invoiceSearch.toLowerCase();
    return (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
           (s.customerName && s.customerName.toLowerCase().includes(q)) ||
           (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
           (s.paymentMethod && s.paymentMethod.toLowerCase().includes(q)) ||
           (s.payment_method && s.payment_method.toLowerCase().includes(q));
  });
  const totalInvoicesCount = filteredSales.length;
  const paginatedInvoices = filteredSales.slice((invoicePage - 1) * invoicePageSize, invoicePage * invoicePageSize);

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* Header & Export Action */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '99px' }}>
            📊 পূর্ণাঙ্গ বিজনেস অ্যানালিটিক্স
          </span>
          <h1 style={{ fontSize: 'clamp(17px, 4.5vw, 22px)', fontWeight: '900', color: '#0f172a', margin: '4px 0 2px' }}>
            দোকানের সার্বিক রিপোর্ট ও অ্যানালিটিক্স
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            {tenant?.shopName} • লাভ-ক্ষতি, পিক-আওয়ার, সেরা পণ্য ও ক্যাশ মেলানো
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {/* Day-End Cash Closing Slip Button */}
          <button
            onClick={() => { setShowDayEndModal(true); triggerHaptic('light'); }}
            style={{
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
            }}
          >
            <span>🖨️</span> দিন শেষের ক্যাশ
          </button>

          <button
            onClick={handleExportCSV}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📥</span> Excel / CSV
          </button>
        </div>
      </div>

      {/* 4 PERIOD FILTER BUTTONS (আজকের, ৩ দিনের, সাপ্তাহিক, মাসিক) */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '14px',
        padding: '5px',
        marginBottom: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '6px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        {[
          { key: 'today', label: 'আজকের হিসাব', icon: '☀️' },
          { key: '3days', label: 'গত ৩ দিনের', icon: '🕒' },
          { key: 'week', label: 'সাপ্তাহিক (৭ দিন)', icon: '📈' },
          { key: 'month', label: 'মাসিক (৩০ দিন)', icon: '🗓️' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setPeriod(tab.key as any);
              triggerHaptic('light');
            }}
            style={{
              padding: '7px 8px',
              borderRadius: '9px',
              border: 'none',
              background: period === tab.key ? '#10b981' : '#f8fafc',
              color: period === tab.key ? '#ffffff' : '#475569',
              fontWeight: '800',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 4 CORE KPI SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {/* Total Sales / Revenue */}
        <div className="ui-card" style={{ borderLeft: '5px solid #3b82f6', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '800' }}>মোট বিক্রি (Revenue)</span>
            <span style={{ fontSize: '20px' }}>📈</span>
          </div>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: '4px 0' }}>
            ৳{Number(summary.totalSales || 0).toLocaleString('en-US')}
          </div>
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700' }}>
            {summary.orderCount || 0}টি মেমো সম্পন্ন
          </span>
        </div>

        {/* Total Cost of Goods */}
        <div className="ui-card" style={{ borderLeft: '5px solid #64748b', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '800' }}>মালের কেনা খরচ (Cost)</span>
            <span style={{ fontSize: '20px' }}>📦</span>
          </div>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#475569', margin: '4px 0' }}>
            ৳{Number(summary.totalCost || 0).toLocaleString('en-US')}
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
            বিক্রি হওয়া পণ্যের পাইকারি খরচ
          </span>
        </div>

        {/* Shop Expenses */}
        <div className="ui-card" style={{ borderLeft: '5px solid #f59e0b', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '800' }}>দোকান খরচ (Expenses)</span>
            <span style={{ fontSize: '20px' }}>💸</span>
          </div>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#d97706', margin: '4px 0' }}>
            ৳{Number(summary.expenses || 0).toLocaleString('en-US')}
          </div>
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '700' }}>
            চা-নাস্তা, ভাড়া ও বিদ্যুৎ বিল
          </span>
        </div>

        {/* Net Profit / Earned */}
        <div className="ui-card" style={{ borderLeft: '5px solid #10b981', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '800' }}>খাঁটি নিট লাভ (Earned)</span>
            <span style={{ fontSize: '20px' }}>💹</span>
          </div>
          <div className="num-font" style={{ fontSize: '30px', fontWeight: '900', color: '#059669', margin: '4px 0' }}>
            {activeRoleMode === 'owner' ? `৳${Number(summary.netProfit || 0).toLocaleString('en-US')}` : '৳••••••'}
          </div>
          <span style={{ fontSize: '12px', color: activeRoleMode === 'owner' ? '#059669' : '#94a3b8', fontWeight: '700' }}>
            {activeRoleMode === 'owner' ? 'সব খরচ বাদে আসল মুনাফা' : '🔒 কর্মচারী মোডে লাভ গোপন'}
          </span>
        </div>
      </div>

      {/* ⏰ 1. PEAK HOURS & 💳 2. PAYMENT METHODS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Peak Hours Card */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>⏰</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                পিক-আওয়ার ও ব্যস্ততম সময় বিশ্লেষণ
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>দিনের কোন সময়ে সবচেয়ে বেশি ক্রেতা আসে</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {peakHours.map((ph: any, idx: number) => {
              const maxRev = Math.max(...peakHours.map((p: any) => p.revenue || 0), 1);
              const barPercent = Math.round((ph.revenue / maxRev) * 100);
              return (
                <div key={idx} style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '800', color: '#1e293b' }}>
                      {ph.icon} {ph.label}
                    </span>
                    <span style={{ color: '#0f172a', fontWeight: '900' }}>
                      ৳{ph.revenue} <small style={{ color: '#64748b', fontWeight: '700' }}>({ph.count}টি মেমো)</small>
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${barPercent}%`, height: '100%', background: barPercent > 50 ? '#10b981' : '#3b82f6', borderRadius: '99px', transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Ratio Card */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>💳</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                পেমেন্ট মাধ্যম অনুপাত (নগদ vs বিকাশ vs বাকি)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>টাকা কোন মাধ্যমে কীভাবে আসছে</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px', marginTop: '10px' }}>
            {/* Cash */}
            <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '14px', border: '1.5px solid #a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#065f46' }}>💵 নগদ ক্যাশ আদায়</strong>
                <span className="num-font" style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>
                  ৳{paymentBreakdown.cash.amount} ({paymentBreakdown.cash.percent}%)
                </span>
              </div>
              <div style={{ height: '8px', background: '#d1fae5', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${paymentBreakdown.cash.percent}%`, height: '100%', background: '#10b981' }}></div>
              </div>
            </div>

            {/* Due */}
            <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '14px', border: '1.5px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#991b1b' }}>🔴 বাকি বিক্রি (মার্কেট পাওনা)</strong>
                <span className="num-font" style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>
                  ৳{paymentBreakdown.due.amount} ({paymentBreakdown.due.percent}%)
                </span>
              </div>
              <div style={{ height: '8px', background: '#fee2e2', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${paymentBreakdown.due.percent}%`, height: '100%', background: '#ef4444' }}></div>
              </div>
            </div>

            {/* Mobile Banking */}
            <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '14px', border: '1.5px solid #bfdbfe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px', color: '#1e40af' }}>📱 বিকাশ / নগদ ডিজিটাল</strong>
                <span className="num-font" style={{ fontSize: '18px', fontWeight: '900', color: '#2563eb' }}>
                  ৳{paymentBreakdown.digital.amount} ({paymentBreakdown.digital.percent}%)
                </span>
              </div>
              <div style={{ height: '8px', background: '#dbeafe', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${paymentBreakdown.digital.percent}%`, height: '100%', background: '#3b82f6' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 🏆 3. TOP CHAMPIONS vs ⚠️ SLOW MOVING STOCK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Top Champions */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>🏆</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                সেরা বিক্রিত চ্যাম্পিয়ন পণ্য (হট আইটেম)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>যেসব মালে সবচেয়ে বেশি বিক্রি ও লাভ এসেছে</span>
            </div>
          </div>

          {topChampions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>তথ্য নেই</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {topChampions.map((p: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#059669', background: '#ecfdf5', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{p.productName}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="num-font" style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>
                      ৳{p.totalRevenue}
                    </span>
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', display: 'block' }}>
                      লাভ: +৳{p.netEarned}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow Moving Dead Stock Alert */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                পড়ে থাকা স্টক সতর্কতা (ধীরগতির পণ্য)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>স্টক আছে কিন্তু এই সময়সীমায় বিক্রি কম</span>
            </div>
          </div>

          {slowMoving.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#059669', fontWeight: '700' }}>
              ✓ চমৎকার! সব পণ্যই নিয়মিত গতিতে বিক্রি হচ্ছে।
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {slowMoving.map((p: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{p.icon || '📦'}</span>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#92400e' }}>{p.name}</strong>
                      <span style={{ fontSize: '11px', color: '#b45309', display: 'block' }}>মূল্য: ৳{p.sellingPrice}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                      স্টক: {p.stock} {p.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 👥 4. TOP DUE RISKS vs TOP VIP CASH CUSTOMERS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Top Due Risks */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                শীর্ষ বাকি ঝুঁকি তালিকা (তাগাদার অগ্রাধিকার)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>যাদের কাছে সবচেয়ে বেশি টাকা বকেয়া আটকে আছে</span>
            </div>
          </div>

          {topDueRisk.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#059669', fontWeight: '700' }}>✓ কোনো বকেয়া বাকি নেই</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {topDueRisk.map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: '#991b1b', display: 'block' }}>{c.name}</strong>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>{c.phone || 'ফোন নেই'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>
                      ৳{c.totalDue.toLocaleString('en-US')}
                    </span>
                    <Link
                      href="/khata"
                      style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', textDecoration: 'none', display: 'block' }}
                    >
                      খাতা দেখুন ➔
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top VIP Cash Customers */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '20px' }}>⭐</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                সেরা ক্যাশ ক্রেতা (VIP কাস্টমার)
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>কারা নিয়মিত নগদ কিনে দোকানে লাভ এনে দিয়েছে</span>
            </div>
          </div>

          {topCashCust.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>তথ্য নেই</div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {topCashCust.map((c: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: '#065f46', display: 'block' }}>{c.name}</strong>
                    <span style={{ fontSize: '11.5px', color: '#047857' }}>{c.memoCount}টি কেনাকাটা</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>
                      ৳{c.amount.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* INDIVIDUAL PRODUCT BREAKDOWN TABLE */}
      <div className="ui-card" style={{ padding: '22px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 3px' }}>
              📦 পণ্যভিত্তিক বিক্রয়, খরচ ও লাভের বিবরণী ({analyticsData.periodLabel})
            </h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              কোন পণ্য কতবার বিক্রি হয়েছে, কত টাকা এসেছে এবং কত লাভ হয়েছে
            </span>
          </div>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 14px', color: '#94a3b8' }}>
            <span style={{ fontSize: '38px', display: 'block', marginBottom: '8px' }}>📦</span>
            <strong style={{ fontSize: '14.5px', color: '#64748b', display: 'block' }}>এই সময়সীমায় কোনো পণ্য বিক্রয় তথ্য পাওয়া যায়নি</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px' }}>অন্যান্য সময়সীমা (৩ দিন / সপ্তাহ / মাস) সিলেক্ট করে দেখুন।</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px', fontWeight: '800' }}>পণ্যের নাম</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>কতবার বিক্রি</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>মোট পরিমাণ</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>কেনা খরচ (Cost)</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>মোট বিক্রি (Revenue)</th>
                  <th style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', fontWeight: '800', textAlign: 'right', color: '#059669' }}>খাঁটি লাভ (Earn)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((prod: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                      <span style={{ marginRight: '6px' }}>🏷️</span>
                      {prod.productName}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                        {prod.timesSold} বার
                      </span>
                    </td>
                    <td className="num-font" style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', color: '#0f172a' }}>
                      {prod.quantitySold} টি/কেজি
                    </td>
                    <td className="num-font" style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>
                      ৳{prod.totalCost.toLocaleString('en-US')}
                    </td>
                    <td className="num-font" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '900', color: '#0f172a' }}>
                      ৳{prod.totalRevenue.toLocaleString('en-US')}
                    </td>
                    <td className="num-font" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '900', color: '#059669' }}>
                      {activeRoleMode === 'owner' ? `+৳${prod.netEarned.toLocaleString('en-US')}` : '••••'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product Breakdown Pagination */}
        {totalProductsCount > 0 && (
          <Pagination
            currentPage={prodPage}
            totalItems={totalProductsCount}
            pageSize={prodPageSize}
            onPageChange={(p) => {
              setProdPage(p);
              triggerHaptic('light');
            }}
            onPageSizeChange={(s) => {
              setProdPageSize(s);
              setProdPage(1);
              triggerHaptic('light');
            }}
            pageSizeOptions={[10, 15, 25, 50]}
            itemLabel="পণ্য"
            themeColor="#059669"
          />
        )}
      </div>

      {/* SALES MEMOS & INVOICES SECTION */}
      <div className="ui-card" style={{ padding: '22px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 3px' }}>
              📜 বিক্রয় মেমো ও ইনভয়েস তালিকা
            </h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              দোকানের সকল কাস্টমার সেলস মেমো, তারিখ, পরিশোধের মাধ্যম ও বকেয়া হিসাব
            </span>
          </div>

          <div style={{ position: 'relative', minWidth: '220px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '14px' }}>🔍</span>
            <input
              type="text"
              placeholder="মেমো নং বা কাস্টমার খুঁজুন..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 14px', color: '#94a3b8' }}>
            <span style={{ fontSize: '38px', display: 'block', marginBottom: '8px' }}>🧾</span>
            <strong style={{ fontSize: '14.5px', color: '#64748b', display: 'block' }}>কোনো বিক্রয় মেমো পাওয়া যায়নি</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px' }}>POS ক্যাশিয়ার বা ড্যাশবোর্ড থেকে বিক্রি করলে এখানে মেমো যুক্ত হবে।</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px', fontWeight: '800' }}>মেমো নং</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>তারিখ ও সময়</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800' }}>কাস্টমার</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>মোট বিল</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>পরিশোধ</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'right' }}>বাকি</th>
                  <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>পেমেন্ট মাধ্যম</th>
                  <th style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', fontWeight: '800', textAlign: 'center' }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((inv: any, idx: number) => {
                  const due = Number(inv.dueAmount || inv.due_amount || 0);
                  const paid = Number(inv.paidAmount || inv.paid_amount || 0);
                  const total = Number(inv.totalAmount || inv.total_amount || 0);
                  const pMethod = inv.paymentMethod || inv.payment_method || 'cash';
                  const dateStr = inv.createdAt || inv.created_at ? new Date(inv.createdAt || inv.created_at).toLocaleDateString('bn-BD') : 'আজ';

                  return (
                    <tr key={inv.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: '800', color: '#0f172a' }}>
                        <span style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                          #{inv.invoiceNo || inv.invoice_no || `INV-${inv.id ? String(inv.id).slice(-6) : idx + 1}`}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0f172a' }}>
                        {inv.customerName || inv.customer_name || 'নগদ ক্রেতা'}
                      </td>
                      <td className="num-font" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '900', color: '#0f172a' }}>
                        ৳{total.toLocaleString('en-US')}
                      </td>
                      <td className="num-font" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                        ৳{paid.toLocaleString('en-US')}
                      </td>
                      <td className="num-font" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', color: due > 0 ? '#dc2626' : '#94a3b8' }}>
                        {due > 0 ? `৳${due.toLocaleString('en-US')}` : '০'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: pMethod === 'cash' ? '#ecfdf5' : pMethod === 'due' ? '#fef2f2' : '#eff6ff',
                          color: pMethod === 'cash' ? '#059669' : pMethod === 'due' ? '#dc2626' : '#2563eb'
                        }}>
                          {pMethod === 'cash' ? '💵 নগদ' : pMethod === 'due' ? '📝 বাকি' : '📱 বিকাশ/ডিজিটাল'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            window.print();
                          }}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            color: '#334155'
                          }}
                        >
                          🖨️ প্রিন্ট
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoices List Pagination */}
        {totalInvoicesCount > 0 && (
          <Pagination
            currentPage={invoicePage}
            totalItems={totalInvoicesCount}
            pageSize={invoicePageSize}
            onPageChange={(p) => {
              setInvoicePage(p);
              triggerHaptic('light');
            }}
            onPageSizeChange={(s) => {
              setInvoicePageSize(s);
              setInvoicePage(1);
              triggerHaptic('light');
            }}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            itemLabel="মেমো"
            themeColor="#2563eb"
          />
        )}
      </div>

      {/* 🖨️ DAY-END CASH DRAWER CLOSING SLIP MODAL */}
      {showDayEndModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px'
        }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                  🖨️ ক্যাশ ড্রয়ার মিলানোর হিসাব
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                  দিন শেষের ক্যাশ ক্লোজিং স্লিপ
                </h3>
              </div>
              <button onClick={() => setShowDayEndModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Input Starting Cash */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                সকালে ক্যাশ বক্সে শুরুর টাকা (Opening Cash):
              </label>
              <input
                type="number"
                value={startingCashInput}
                onChange={(e) => setStartingCashInput(e.target.value)}
                className="num-font"
                placeholder="০.০০"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '16px', fontWeight: '800', boxSizing: 'border-box' }}
              />
            </div>

            {/* Printable Receipt Card */}
            <div id="day-end-slip" style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '16px', background: '#fafafa', fontFamily: 'monospace', fontSize: '13px' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '10px' }}>
                <strong style={{ fontSize: '16px', display: 'block', color: '#0f172a' }}>{tenant?.shopName || 'দোকান'}</strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>তারিখ: {new Date().toLocaleDateString('bn-BD')} {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div style={{ display: 'grid', gap: '6px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(+) শুরুর ক্যাশ:</span>
                  <strong className="num-font">৳{startingCashNum}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(+) আজকের নগদ বিক্রি:</span>
                  <strong className="num-font" style={{ color: '#059669' }}>+৳{summary.cashSales || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>(-) আজকের দোকান খরচ:</span>
                  <strong className="num-font" style={{ color: '#dc2626' }}>-৳{summary.expenses || 0}</strong>
                </div>
                <div style={{ borderTop: '1.5px dashed #0f172a', paddingTop: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <strong style={{ color: '#0f172a' }}>ক্যাশে থাকার কথা:</strong>
                  <strong className="num-font" style={{ color: '#059669', fontSize: '18px' }}>৳{expectedDrawerCash}</strong>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>মেমো সংখ্যা: {summary.orderCount || 0}টি</span>
                <span>আজকের বাকি: ৳{summary.totalDueSales || 0}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 2,
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🖨️ স্লিপ প্রিন্ট করুন
              </button>
              <button
                onClick={() => setShowDayEndModal(false)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                বন্ধ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
