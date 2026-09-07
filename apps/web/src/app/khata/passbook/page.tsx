'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DataLoader from '../../../components/DataLoader';

function PassbookContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const tenantId = searchParams.get('tenantId');

  const [customer, setCustomer] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    // Fetch customer details
    const fetchPassbookData = async () => {
      try {
        const custRes = await fetch(`/api/customers?tenantId=${tenantId || ''}`);
        if (custRes.ok) {
          const cList = await custRes.json();
          const found = cList.find((c: any) => c.id === customerId);
          if (found) setCustomer(found);
        }

        const salesRes = await fetch(`/api/sales?tenantId=${tenantId || ''}`);
        if (salesRes.ok) {
          const sList = await salesRes.json();
          const cSales = sList.filter((s: any) => s.customerId === customerId || s.customer_id === customerId);
          setSales(cSales);
        }
      } catch (e) {
        console.error('Error fetching passbook data', e);
      } finally {
        setLoading(false);
      }
    };

    fetchPassbookData();
  }, [customerId, tenantId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '40px 16px' }}>
        <DataLoader
          type="full"
          text="ডিজিটাল পাসবুক স্টেটমেন্ট লোড হচ্ছে..."
          subText="গ্রাহকের বকেয়া ও জমার হিসাব একত্র করা হচ্ছে"
          icon="📖"
        />
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="ui-card" style={{ maxWidth: '400px', margin: '0 auto', padding: '30px' }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>⚠️</span>
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>গ্রাহকের খাতা পাওয়া যায়নি</h3>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>সঠিক গ্রাহক লিংক ব্যবহার করুন।</p>
          <Link href="/khata" style={{ color: '#059669', fontWeight: '800', textDecoration: 'none' }}>
            খাতায় ফিরে যান ➔
          </Link>
        </div>
      </div>
    );
  }

  const due = Number(customer.totalDue || customer.total_due || 0);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 80px' }}>
      
      {/* Top Passbook Branding Header */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
        borderRadius: '24px',
        padding: '24px 20px',
        color: '#ffffff',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(5, 150, 105, 0.25)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '99px', letterSpacing: '0.5px' }}>
              ✓ ভেরিফাইড ডিজিটাল হিসাব খাতা
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: '900', margin: '8px 0 2px' }}>
              {customer.name}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#a7f3d0' }}>
              মোবাইল: {customer.phone} {customer.address ? `• ${customer.address}` : ''}
            </p>
          </div>

          <button
            onClick={handleCopyLink}
            style={{
              background: '#fff',
              color: '#065f46',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            {copied ? '✓ লিংক কপি হয়েছে' : '🔗 লিংক কপি'}
          </button>
        </div>
      </div>

      {/* Due Status Card */}
      <div className="ui-card" style={{
        textAlign: 'center',
        padding: '24px',
        marginBottom: '20px',
        border: due > 0 ? '2px solid #fecaca' : '2px solid #bbf7d0',
        background: due > 0 ? '#fff5f5' : '#f0fdf4'
      }}>
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
          বর্তমান সর্বমোট বকেয়া হিসাব
        </span>
        <div className="num-font" style={{ fontSize: '38px', fontWeight: '900', color: due > 0 ? '#dc2626' : '#16a34a', margin: '4px 0' }}>
          ৳{due.toLocaleString('en-US')}
        </div>
        <span style={{ fontSize: '12.5px', color: due > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>
          {due > 0 ? 'অনুরোধ: অনুগ্রহ করে সুবিধাজনক সময়ে পরিশোধ করুন।' : '✓ আলহামদুলিল্লাহ! আপনার কোনো বকেয়া বাকি নেই।'}
        </span>
      </div>

      {/* Transactions Ledger */}
      <div className="ui-card">
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 14px' }}>
          📜 লেনদেন ও কেনাকাটার বিবরণী ({sales.length}টি ইনভয়েস)
        </h3>

        {sales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
            এখনও কোনো মেমো রেকর্ড করা হয়নি।
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {sales.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                    মেমো #{s.invoiceNo || s.invoice_no || s.id?.slice(0, 6)}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString('bn-BD') : 'আজকে'} • {s.paymentMethod === 'cash' ? 'নগদ' : s.paymentMethod === 'due' ? 'বাকি' : 'বিকাশ'}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                    ৳{Number(s.totalAmount || s.total_amount || 0).toLocaleString('en-US')}
                  </div>
                  {Number(s.dueAmount || s.due_amount || 0) > 0 ? (
                    <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '800' }}>
                      বাকি: ৳{Number(s.dueAmount || s.due_amount || 0).toLocaleString('en-US')}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '800' }}>
                      পরিশোধিত ✓
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default function CustomerPassbookPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>লোড হচ্ছে...</div>}>
      <PassbookContent />
    </Suspense>
  );
}
