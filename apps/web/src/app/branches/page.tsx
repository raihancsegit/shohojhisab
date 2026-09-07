'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import FeatureGate from '../../components/FeatureGate';
import { useAuth } from '../../context/AuthContext';
import DataLoader from '../../components/DataLoader';

export default function BranchesPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferItem, setTransferItem] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [alertNotice, setAlertNotice] = useState('');

  // New Branch Form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchLocation, setNewBranchLocation] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');

  const loadBranchData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const bRes = await fetch(`/api/branches?tenantId=${currentTenantId}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBranches(Array.isArray(bData) ? bData : []);
        if (bData.length > 0 && !activeBranchId) {
          setActiveBranchId(bData[0].id);
          setTransferFrom(bData[0].id);
          if (bData.length > 1) setTransferTo(bData[1].id);
        }
      }
    } catch (e) {}

    try {
      const trRes = await fetch(`/api/branches/transfers?tenantId=${currentTenantId}`);
      if (trRes.ok) {
        setTransfers(await trRes.json());
      }
    } catch (e) {}

    try {
      const pRes = await fetch(`/api/products?tenantId=${currentTenantId}`);
      if (pRes.ok) {
        setProducts(await pRes.json());
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadBranchData();
  }, [currentTenantId]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !currentTenantId) return;
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          name: newBranchName,
          location: newBranchLocation || 'শাখা বাজার',
          managerName: newBranchManager || 'শাখা ইনচার্জ',
          phone: newBranchPhone || '',
          isMainBranch: branches.length === 0
        })
      });

      if (res.ok) {
        setAlertNotice(`✓ "${newBranchName}" নতুন শাখা সফলভাবে খোলা হয়েছে!`);
        setShowAddBranchModal(false);
        setNewBranchName('');
        setNewBranchLocation('');
        setNewBranchManager('');
        setNewBranchPhone('');
        await loadBranchData();
        setTimeout(() => setAlertNotice(''), 4500);
      }
    } catch (e) {}
  };

  const handleCreateTransfer = async () => {
    if (!transferItem || !transferQty || !currentTenantId || !transferFrom || !transferTo) return;
    triggerHaptic('success');
    const fromBranch = branches.find(b => b.id === transferFrom)?.name || 'প্রধান শাখা';
    const toBranch = branches.find(b => b.id === transferTo)?.name || 'শাখা';

    try {
      const res = await fetch('/api/branches/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          fromBranchId: transferFrom,
          toBranchId: transferTo,
          fromBranchName: fromBranch,
          toBranchName: toBranch,
          productId: selectedProductId || null,
          productName: transferItem,
          quantity: transferQty
        })
      });

      if (res.ok) {
        setShowTransferModal(false);
        setTransferItem('');
        setTransferQty('');
        setSelectedProductId('');
        setAlertNotice(`✓ ${fromBranch} থেকে ${toBranch}-এ মালামাল সফলভাবে স্থানান্তর করা হয়েছে এবং রেকর্ড সংরক্ষিত হয়েছে!`);
        await loadBranchData();
        setTimeout(() => setAlertNotice(''), 4500);
      }
    } catch (e) {}
  };

  return (
    <FeatureGate requiredPlan="enterprise" title="মাল্টি-ব্রাঞ্চ (Multi-Branch) ফিচারটি Enterprise প্ল্যানে উপলব্ধ">
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 40px' }}>
        
        {/* Central Multi-Branch Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e0847 0%, #311068 50%, #4c1d95 100%)',
          borderRadius: '28px',
          padding: '30px 26px',
          color: '#fff',
          marginBottom: '24px',
          boxShadow: '0 16px 40px rgba(49, 16, 104, 0.28)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontWeight: '700' }}>
              🏬 সেন্ট্রাল মাল্টি-ব্রাঞ্চ কন্ট্রোল
            </span>
            <h1 className="num-font" style={{ fontSize: '32px', fontWeight: '900', marginTop: '6px' }}>
              {branches.length} টি সক্রিয় শাখা
            </h1>
            <span style={{ fontSize: '13px', color: '#e9d5ff' }}>
              সেন্ট্রাল ইনভেন্টরি, ইন্টার-ব্রাঞ্চ স্টক ট্রান্সফার ও শাখা ম্যানেজমেন্ট
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddBranchModal(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
              }}
            >
              ➕ নতুন শাখা যুক্ত করুন
            </button>

            <button
              onClick={() => setShowTransferModal(true)}
              disabled={branches.length < 2}
              style={{
                background: branches.length >= 2 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#64748b',
                color: '#fff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: branches.length >= 2 ? 'pointer' : 'not-allowed',
                boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)'
              }}
            >
              🔄 স্টক ট্রান্সফার
            </button>
          </div>
        </div>

        {alertNotice && (
          <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', color: '#15803d', padding: '14px 18px', borderRadius: '16px', fontSize: '14px', fontWeight: '700', marginBottom: '20px' }}>
            {alertNotice}
          </div>
        )}

        {/* Branches List */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '14px' }}>
            🏪 আপনার সকল শাখা ({branches.length} টি)
          </h3>

          {loading ? (
            <DataLoader type="skeleton-grid" count={3} text="শাখা তালিকা লোড হচ্ছে..." />
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {branches.map((b) => (
              <div
                key={b.id}
                className="glass-card"
                style={{
                  padding: '22px',
                  border: activeBranchId === b.id ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                  background: activeBranchId === b.id ? '#fbf8ff' : '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '16px', color: '#0f172a' }}>{b.name}</strong>
                    <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      👤 ম্যানেজার: {b.managerName || 'শাখা ইনচার্জ'} {b.phone ? `(📱 ${b.phone})` : ''}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
                      📍 {b.location || 'স্থানীয় বাজার'}
                    </span>
                  </div>
                  {b.isMainBranch && <span style={{ background: '#ede9fe', color: '#7c3aed', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>প্রধান শাখা</span>}
                </div>

                <button
                  onClick={() => { setActiveBranchId(b.id); triggerHaptic('light'); }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: activeBranchId === b.id ? 'none' : '1px solid #cbd5e1',
                    background: activeBranchId === b.id ? '#7c3aed' : '#fff',
                    color: activeBranchId === b.id ? '#fff' : '#0f172a',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  {activeBranchId === b.id ? '✓ এই শাখায় আছেন' : 'এই শাখায় সুইচ করুন'}
                </button>
              </div>
            ))}

            {branches.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                এখনো কোনো অতিরিক্ত শাখা খোলা হয়নি। উপরে "নতুন শাখা যুক্ত করুন" বাটনে ক্লিক করে প্রথম শাখা যুক্ত করুন।
              </div>
            )}
          </div>
          )}
        </div>

        {/* Stock Transfers History */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>
            🔄 সাম্প্রতিক স্টক স্থানান্তরের লগ ({transfers.length} টি)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transfers.map(tr => (
              <div
                key={tr.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>{tr.fromBranchName || 'প্রধান শাখা'} ➔ {tr.toBranchName || 'শাখা'}</strong>
                    <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', fontWeight: '800', padding: '2px 8px', borderRadius: '99px' }}>{tr.status}</span>
                  </div>
                  <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    পণ্য: {tr.productName} ({tr.quantity}) • সময়: {tr.createdAt?.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
                <span className="num-font" style={{ fontSize: '12.5px', color: '#7c3aed', fontWeight: '800' }}>{tr.id}</span>
              </div>
            ))}

            {transfers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                কোনো স্টক স্থানান্তরের রেকর্ড পাওয়া যায়নি
              </div>
            )}
          </div>
        </div>

        {/* Modal: Add Branch */}
        {showAddBranchModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 7, 40, 0.7)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '16px' }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '26px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>
                ➕ নতুন শাখা যুক্ত করুন
              </h3>
              <form onSubmit={handleCreateBranch} style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>শাখার নাম:</label>
                  <input
                    type="text"
                    placeholder="যেমন: সাভার বাসস্ট্যান্ড শাখা"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>ঠিকানা / বাজার লোকেশন:</label>
                  <input
                    type="text"
                    placeholder="যেমন: সাভার সিটি সেন্টার, ২য় তলা"
                    value={newBranchLocation}
                    onChange={(e) => setNewBranchLocation(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>ম্যানেজারের নাম:</label>
                    <input
                      type="text"
                      placeholder="যেমন: মোঃ জসিম"
                      value={newBranchManager}
                      onChange={(e) => setNewBranchManager(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>মোবাইল নম্বর:</label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={newBranchPhone}
                      onChange={(e) => setNewBranchPhone(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowAddBranchModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: '800' }}>বাতিল</button>
                  <button type="submit" style={{ flex: 2, padding: '11px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '900', fontSize: '14px' }}>শাখা তৈরি করুন ✓</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 7, 40, 0.7)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '16px' }}>
            <div style={{ background: '#fff', width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '26px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>
                🔄 শাখা টু শাখা স্টক ট্রান্সফার
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>কোথা থেকে পাঠাবেন:</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px', fontSize: '13.5px', outline: 'none' }}
                  >
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#475569' }}>কোন শাখায় যাবে:</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px', fontSize: '13.5px', outline: 'none' }}
                  >
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>পণ্য নির্বাচন করুন বা লিখুন:</label>
                {products.length > 0 && (
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) setTransferItem(prod.banglaName || prod.name);
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', marginTop: '4px', fontSize: '13.5px', outline: 'none', marginBottom: '6px' }}
                  >
                    <option value="">-- মজুদ পণ্যের তালিকা থেকে সিলেক্ট করুন --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.banglaName || p.name} (মজুদ: {p.stock} {p.unit})</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  placeholder="যেমন: মিনিকেট চাল ৫০ কেজি"
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>স্থানান্তরের পরিমাণ:</label>
                <input
                  type="text"
                  placeholder="যেমন: ১০ বস্তা বা ২৫ লিটার"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  style={{ width: '100%', padding: '11px', borderRadius: '12px', border: '1.5px solid #cbd5e1', marginTop: '4px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowTransferModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: '800' }}>বাতিল</button>
                <button onClick={handleCreateTransfer} style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#7c3aed', color: '#fff', fontWeight: '900', fontSize: '15px' }}>ট্রান্সফার নিশ্চিত করুন ✓</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </FeatureGate>
  );
}
