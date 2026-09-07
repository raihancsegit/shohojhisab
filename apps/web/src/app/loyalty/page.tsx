'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DataLoader from '../../components/DataLoader';

export default function LoyaltyPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCust, setActiveCust] = useState<any>(null);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [notice, setNotice] = useState('');

  const loadLoyaltyCustomers = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/loyalty/customers?tenantId=${currentTenantId}`);
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadLoyaltyCustomers();
  }, [currentTenantId]);

  const handleRedeem = async () => {
    if (!activeCust || !redeemPoints || !currentTenantId) return;
    const pts = Number(redeemPoints);
    triggerHaptic('success');

    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          customerId: activeCust.id,
          points: pts
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNotice(`✓ ${data.message}`);
        setActiveCust(null);
        setRedeemPoints('');
        await loadLoyaltyCustomers();
        setTimeout(() => setNotice(''), 5000);
      }
    } catch (e) {}
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '24px 16px 40px' }}>
      
      {/* Loyalty Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)',
        borderRadius: '28px',
        padding: '30px 26px',
        color: '#fff',
        marginBottom: '24px',
        boxShadow: '0 16px 40px rgba(180, 83, 9, 0.35)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontWeight: '700' }}>
            🎁 কাস্টমার লয়্যালটি পয়েন্ট ও ক্যাশব্যাক ওয়ালেট
          </span>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '8px 0 4px' }}>
            লয়্যালটি রিওয়ার্ডস প্রোগ্রাম
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            প্রতি ৳১০০ কেনাকাটায় ১ পয়েন্ট অর্জন • ১০০ পয়েন্ট = ৳৫০ সমপরিমাণ ছাড়
          </p>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 20px', borderRadius: '18px', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', opacity: 0.85 }}>সক্রিয় লয়্যালটি সদস্য</span>
          <div className="num-font" style={{ fontSize: '28px', fontWeight: '900', color: '#fef08a' }}>
            {customers.length} জন
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 18px', borderRadius: '16px', marginBottom: '20px', fontSize: '14px', fontWeight: '600' }}>
          {notice}
        </div>
      )}

      {/* Member Cards */}
      {loading ? (
        <DataLoader type="skeleton-list" count={4} text="লয়্যালটি মেম্বার তালিকা লোড হচ্ছে..." />
      ) : (
      <div style={{ display: 'grid', gap: '14px' }}>
        {customers.map((c) => (
          <div
            key={c.id}
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>
                  {c.name}
                </h3>
                <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '99px', fontWeight: '800' }}>
                  ⭐ {c.tier}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                <span>📞 {c.phone} • সর্বমোট কেনাকাটা: ৳{c.totalSpent.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>বর্তমান পয়েন্ট ব্যালেন্স:</div>
              <div className="num-font" style={{ fontSize: '24px', fontWeight: '900', color: '#b45309' }}>
                {c.points} Pts <span style={{ fontSize: '13px', color: '#16a34a' }}>(= ৳{Math.floor(c.points / 2)})</span>
              </div>
              <button
                onClick={() => setActiveCust(c)}
                disabled={c.points < 50}
                style={{
                  background: c.points >= 50 ? '#b45309' : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: c.points >= 50 ? 'pointer' : 'not-allowed',
                  marginTop: '6px'
                }}
              >
                {c.points >= 50 ? '🎁 পয়েন্ট রিডিম করুন' : 'ন্যূনতম ৫০ পয়েন্ট প্রয়োজন'}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Redeem Modal */}
      {activeCust && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '28px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>
              পয়েন্ট রিডিম করে ছাড় দিন
            </h2>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '14px' }}>
              গ্রাহক: <strong>{activeCust.name}</strong> • অবশিষ্ট পয়েন্ট: <strong className="num-font" style={{ color: '#b45309' }}>{activeCust.points}</strong>
            </p>

            <input
              type="number"
              max={activeCust.points}
              placeholder="কত পয়েন্ট রিডিম করতে চান?"
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              className="num-font"
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #b45309', fontSize: '18px', fontWeight: '700', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
            />

            {redeemPoints && (
              <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '12px', marginBottom: '18px', fontSize: '13px', color: '#92400e', fontWeight: '700' }}>
                বিল থেকে ছাড় হবে: ৳{Math.floor(Number(redeemPoints) / 2)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setActiveCust(null)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
                বাতিল
              </button>
              <button onClick={handleRedeem} disabled={!redeemPoints || Number(redeemPoints) > activeCust.points} style={{ flex: 2, padding: '12px', background: '#b45309', border: 'none', borderRadius: '12px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
                ✓ ছাড় কার্যকর করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
