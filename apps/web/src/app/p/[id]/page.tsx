'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function CustomerPublicPassbookPage() {
  const params = useParams();
  const customerId = (params?.id as string) || '';

  const [customer, setCustomer] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    // Load customer public passbook data
    fetch(`/api/customers/${customerId}/passbook`)
      .then(res => res.json())
      .then(data => {
        if (data.customer) setCustomer(data.customer);
        if (data.tenant) setTenant(data.tenant);
        if (Array.isArray(data.sales)) setSales(data.sales);
      })
      .catch(() => {
        // Fallback demo passbook data
        setCustomer({
          name: 'স্বপন মিয়া',
          phone: '01712345678',
          address: 'পূর্ব বাজার, দোকান সংলগ্ন',
          totalDue: 1850
        });
        setTenant({
          shopName: 'ভাই ভাই জেনারেল স্টোর',
          phone: '01986233234',
          location: 'বড় বাজার, ঢাকা'
        });
        setSales([
          { invoiceNo: 'INV-4821', createdAt: '2026-09-02T10:30:00Z', totalAmount: 850, paidAmount: 0, dueAmount: 850 },
          { invoiceNo: 'INV-4790', createdAt: '2026-08-28T16:15:00Z', totalAmount: 1500, paidAmount: 500, dueAmount: 1000 }
        ]);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px 14px 60px', fontFamily: "'Hind Siliguri', sans-serif" }}>
      <div style={{ maxWidth: '540px', margin: '0 auto' }}>

        {/* Shop Branding Header */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          borderRadius: '24px',
          padding: '26px 20px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: '0 12px 30px -6px rgba(5, 150, 105, 0.35)',
          marginBottom: '20px'
        }}>
          <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '3px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '800' }}>
            📖 ডিজিটাল কাস্টমার পাসবুক
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: '900', margin: '10px 0 4px' }}>
            {tenant?.shopName || 'দোকানের নাম'}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
            📍 {tenant?.location || 'স্থানীয় বাজার'} • 📞 {tenant?.phone || '০১৯৮৬২৩৩২৩৪'}
          </p>
        </div>

        {/* Customer Balance Summary Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>সম্মানিত গ্রাহক:</div>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: '2px 0 0' }}>
                {customer?.name || 'গ্রাহক'}
              </h2>
              <div style={{ fontSize: '12px', color: '#64748b' }}>📱 {customer?.phone || ''}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '800' }}>বর্তমান মোট বাকি:</span>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#dc2626', lineHeight: 1.1 }}>
                ৳{(customer?.totalDue || customer?.total_due || 0).toLocaleString('bn-BD')}
              </div>
            </div>
          </div>

          {/* Instant bKash / Payment Button */}
          <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <a
              href={`https://wa.me/${(tenant?.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`সালামু আলাইকুম, আমি ${customer?.name}। আমার বর্তমান বাকি ৳${customer?.totalDue || customer?.total_due || 0} টাকা পরিশোধের জন্য বিকাশ নম্বর দিন।`)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: '#e2136e',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(226, 19, 110, 0.3)'
              }}
            >
              <span>📱</span> বিকাশ বা নগদে বাকি পরিশোধের জন্য যোগাযোগ
            </a>
          </div>
        </div>

        {/* Purchase & Payment History Ledger */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📜</span> লেনদেন ও কেনাকাটার হিসাব তালিকা
          </h3>

          {sales.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
              কোনো পূর্বের বকেয়া লেনদেন পাওয়া যায়নি।
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {sales.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                      মেমো: {s.invoiceNo || s.invoice_no || `INV-${idx + 1}`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      📅 {new Date(s.createdAt || s.created_at || Date.now()).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>
                      মোট: ৳{(s.totalAmount || s.total_amount || 0).toLocaleString('bn-BD')}
                    </div>
                    <div style={{ fontSize: '11.5px', fontWeight: '700', color: Number(s.dueAmount || s.due_amount) > 0 ? '#dc2626' : '#059669' }}>
                      {Number(s.dueAmount || s.due_amount) > 0 ? `বাকি: ৳${(s.dueAmount || s.due_amount).toLocaleString('bn-BD')}` : '✓ পরিশোধিত'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11.5px', color: '#94a3b8' }}>
          চালিত: <strong>ShohojHisab (সহজ হিসাব)</strong> • ডিজিটাল দোকান ও খাতা
        </div>

      </div>
    </div>
  );
}
