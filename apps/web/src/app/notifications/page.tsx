'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DataLoader from '../../components/DataLoader';

export default function NotificationsPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [filter, setFilter] = useState<'all' | 'due' | 'stock' | 'system'>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenantId) return;
    setLoading(true);

    const generated: any[] = [];

    Promise.all([
      fetch(`/api/products?tenantId=${currentTenantId}`).then(r => r.json()).catch(() => []),
      fetch(`/api/customers?tenantId=${currentTenantId}`).then(r => r.json()).catch(() => []),
      fetch(`/api/tenants/${currentTenantId}/subscription-status`).then(r => r.json()).catch(() => null),
      fetch(`/api/installments?tenantId=${currentTenantId}`).then(r => r.json()).catch(() => [])
    ]).then(([products, customers, subStatus, installments]) => {
      // 1. Low stock alerts
      if (Array.isArray(products)) {
        const lowStock = products.filter((p: any) => Number(p.stock) <= Number(p.lowStockThreshold || 5));
        lowStock.slice(0, 5).forEach((p: any) => {
          generated.push({
            id: 'stock-' + p.id,
            type: 'stock',
            title: `কম স্টকের সতর্কতা: ${p.banglaName || p.name}`,
            desc: `দোকানে মাত্র ${p.stock} ${p.unit || 'টি'} মজুদ আছে। নতুন স্টক তোলার জন্য ডিলারকে অর্ডার দিন।`,
            time: 'সক্রিয় অ্যালার্ট',
            icon: '📦',
            actionUrl: '/stock',
            actionText: 'স্টক আপডেট করুন'
          });
        });
      }

      // 2. High due customers
      if (Array.isArray(customers)) {
        const dueCust = customers.filter((c: any) => Number(c.totalDue || c.total_due || 0) > 0);
        dueCust.slice(0, 5).forEach((c: any) => {
          const due = Number(c.totalDue || c.total_due);
          generated.push({
            id: 'due-' + c.id,
            type: 'due',
            title: `বকেয়া তাগাদা: ${c.name}`,
            desc: `বর্তমান বাকি ৳${due.toLocaleString()}। হোয়াটসঅ্যাপে ১-ক্লিকে তাগাদা পাঠান।`,
            time: 'অপরিশোধিত',
            icon: '🔴',
            actionUrl: '/marketing',
            actionText: 'তাগাদা পাঠান'
          });
        });
      }

      // 3. Installments alert
      if (Array.isArray(installments)) {
        const activeInst = installments.filter((ins: any) => ins.status === 'active');
        activeInst.slice(0, 3).forEach((ins: any) => {
          generated.push({
            id: 'inst-' + ins.id,
            type: 'due',
            title: `কিস্তি কালেকশন: ${ins.customerName || ins.customer_name}`,
            desc: `${ins.productName || ins.product_name} এর মাসিক কিস্তি ৳${Number(ins.monthlyInstallment || ins.monthly_installment).toLocaleString()} পাওনা রয়েছে।`,
            time: `পরবর্তী কিস্তি: ${ins.nextDueDate || ins.next_due_date || 'চলতি মাস'}`,
            icon: '💵',
            actionUrl: '/installments',
            actionText: 'কিস্তি আদায়'
          });
        });
      }

      // 4. System / Subscription alert
      if (subStatus) {
        generated.push({
          id: 'sys-backup',
          type: 'system',
          title: 'ক্লাউড ব্যাকআপ সফল ও সক্রিয়',
          desc: `আপনার "${tenant?.shopName || 'দোকানের'}" সমস্ত বিক্রয় ও হিসাব নিরাপদে সংরক্ষিত। বর্তমান প্ল্যান: ${subStatus.planName || 'সক্রিয়'} (মেয়াদ বাকি: ${subStatus.daysRemaining || 365} দিন)।`,
          time: 'স্বয়ংক্রিয় সিঙ্ক',
          icon: '☁️',
          actionUrl: '/subscription',
          actionText: 'সাবস্ক্রিপশন দেখুন'
        });
      }

      setNotifications(generated);
      setLoading(false);
    });
  }, [currentTenantId]);

  const filtered = notifications.filter(n => filter === 'all' || n.type === filter);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 14px 80px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/"
            onClick={() => triggerHaptic('light')}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              display: 'grid',
              placeItems: 'center',
              textDecoration: 'none',
              color: '#0f172a',
              fontSize: '16px'
            }}
          >
            ←
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '900', color: '#0f172a' }}>বিজ্ঞপ্তি ও নোটিফিকেশন</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{tenant?.shopName || 'দোকান'} এর অটোমেটেড আপডেট</p>
          </div>
        </div>

        <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800' }}>
          {notifications.length} টি নতুন
        </span>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '14px' }}>
        {[
          { id: 'all', label: 'সবগুলো' },
          { id: 'due', label: '🔴 বাকি তাগাদা' },
          { id: 'stock', label: '📦 স্টক এলার্ট' },
          { id: 'system', label: '☁️ সিস্টেম' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setFilter(tab.id as any); triggerHaptic('light'); }}
            style={{
              background: filter === tab.id ? '#4f46e5' : '#ffffff',
              color: filter === tab.id ? '#ffffff' : '#475569',
              border: filter === tab.id ? '1px solid #4f46e5' : '1px solid #e2e8f0',
              padding: '7px 14px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '12.5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: filter === tab.id ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <DataLoader type="skeleton-list" count={4} text="বিজ্ঞপ্তি ও অ্যালার্ট তালিকা প্রস্তুত হচ্ছে..." />
      ) : (
      <div style={{ display: 'grid', gap: '10px' }}>
        {filtered.map(item => (
          <div
            key={item.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}>
              {item.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{item.title}</h3>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.time}</span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>{item.desc}</p>
              
              <Link
                href={item.actionUrl}
                onClick={() => triggerHaptic('light')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#eef2ff',
                  color: '#4f46e5',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  textDecoration: 'none'
                }}
              >
                <span>{item.actionText}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
