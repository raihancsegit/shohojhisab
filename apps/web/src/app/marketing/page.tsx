'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DataLoader from '../../components/DataLoader';

export default function MarketingPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [template, setTemplate] = useState<'due_reminder' | 'eid_offer' | 'friday_bazaar'>('due_reminder');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [smsBalance, setSmsBalance] = useState<number>(tenant?.smsBalance || 50);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?tenantId=${currentTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch (e) {}

    try {
      const stRes = await fetch(`/api/tenants/${currentTenantId}/subscription-status`);
      if (stRes.ok) {
        const stData = await stRes.json();
        if (stData.smsBalance !== undefined) setSmsBalance(stData.smsBalance);
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentTenantId]);

  const dueCustomers = customers.filter(c => Number(c.totalDue || c.total_due || 0) > 0);
  const targetCustomers = template === 'due_reminder' ? (dueCustomers.length > 0 ? dueCustomers : customers) : customers;

  const getMessagePreview = (name: string, due: number) => {
    const shopName = tenant?.shopName || 'আমাদের দোকানে';
    if (template === 'due_reminder') {
      return `আসসালামু আলাইকুম ${name}, ${shopName}-এ আপনার বর্তমান বাকি ৳${due}। দ্রুত পরিশোধের অনুরোধ করা হলো। ধন্যবাদ!`;
    }
    if (template === 'eid_offer') {
      return `ঈদ মোবারক ${name}! ${shopName}-এ ঈদের বিশেষ ছাড়ে সকল পণ্যে পাচ্ছেন আকর্ষণীয় ক্যাশব্যাক ও বিশেষ মূল্যছাড়। আজই আসুন!`;
    }
    return `সম্মানিত ${name}, আগামীকাল জুমার দিনের সাপ্তাহিক হাটে ${shopName}-এ স্পেশাল অফারে বিশেষ মূল্যছাড় চলছে!`;
  };

  const getWhatsAppLink = (phone: string, name: string, due: number) => {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '88' + cleanPhone;
    const text = encodeURIComponent(getMessagePreview(name, due));
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const handleSendBulk = async () => {
    if (targetCustomers.length === 0 || !currentTenantId) return;
    setSending(true);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/marketing/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          recipients: targetCustomers.map(c => ({ id: c.id, name: c.name, phone: c.phone, due: Number(c.totalDue || c.total_due || 0) })),
          channel,
          templateType: template
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`✓ সফলভাবে ${data.sentCount} জন গ্রাহকের কাছে ${channel.toUpperCase()} বার্তা পাঠানো হয়েছে!`);
        await loadData();
      } else {
        setNotice(`⚠️ ${data.error || 'পাঠাতে সমস্যা হয়েছে!'}`);
      }
    } catch (e) {
      setNotice('⚠️ সার্ভার সংযোগ এরর!');
    }
    setSending(false);
    setTimeout(() => setNotice(''), 5000);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px 40px' }}>
      
      {/* Marketing Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
        borderRadius: '28px',
        padding: '30px 26px',
        color: '#fff',
        marginBottom: '24px',
        boxShadow: '0 16px 40px rgba(5, 150, 105, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <span style={{ fontSize: '13px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontWeight: '700' }}>
            📢 WhatsApp ও SMS অটোমেশন মার্কেটিং
          </span>
          <h1 style={{ fontSize: '30px', fontWeight: '900', margin: '8px 0 4px' }}>
            মার্কেটিং ও ডিজিটাল তাগাদা বট
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            বাকি তাগাদা, উৎসবের অফার এবং সাপ্তাহিক হাটের প্রচার সরাসরি কাস্টমারের হোয়াটসঅ্যাপে পাঠান
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '14px', textAlign: 'right' }}>
            <span style={{ fontSize: '11.5px', opacity: 0.9 }}>📩 SMS ব্যালেন্স</span>
            <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: '#fef08a' }}>
              {smsBalance} টি
            </div>
          </div>

          <button
            onClick={handleSendBulk}
            disabled={sending || targetCustomers.length === 0}
            style={{
              background: '#fff',
              color: '#065f46',
              border: 'none',
              borderRadius: '14px',
              padding: '12px 20px',
              fontWeight: '900',
              fontSize: '14px',
              cursor: targetCustomers.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
            }}
          >
            {sending ? 'পাঠানো হচ্ছে...' : `🚀 সবাইকে পাঠান (${targetCustomers.length} জন)`}
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ background: notice.startsWith('✓') ? '#ecfdf5' : '#fef2f2', border: `1px solid ${notice.startsWith('✓') ? '#a7f3d0' : '#fecaca'}`, color: notice.startsWith('✓') ? '#065f46' : '#dc2626', padding: '14px 18px', borderRadius: '16px', marginBottom: '20px', fontSize: '14px', fontWeight: '700' }}>
          {notice}
        </div>
      )}

      {/* Channel & Template Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'due_reminder', label: '📖 ডিজিটাল বাকি তাগাদা', icon: '💬', desc: `${dueCustomers.length} জনের বকেয়া বাকি আছে` },
          { id: 'eid_offer', label: '🌙 ঈদ ও স্পেশাল অফার', icon: '🎁', desc: 'সকল কাস্টমারদের জন্য' },
          { id: 'friday_bazaar', label: '🛒 সাপ্তাহিক হাট ডিসকাউন্ট', icon: '🏷️', desc: 'ফ্রেশ অফার ও ছাড়' },
        ].map(t => (
          <div
            key={t.id}
            onClick={() => { setTemplate(t.id as any); triggerHaptic('light'); }}
            style={{
              background: template === t.id ? '#ecfdf5' : '#fff',
              border: template === t.id ? '2px solid #059669' : '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '13.5px',
              color: template === t.id ? '#065f46' : '#475569'
            }}
          >
            <span style={{ fontSize: '22px', display: 'block', marginBottom: '4px' }}>{t.icon}</span>
            <div style={{ fontWeight: '800', color: template === t.id ? '#065f46' : '#1e293b' }}>{t.label}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Live Customers List with 1-Click WhatsApp Direct Links */}
      <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1e293b' }}>
            দোকানের রিয়েল কাস্টমার তালিকা ({targetCustomers.length} জন)
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setChannel('whatsapp')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: channel === 'whatsapp' ? '2px solid #059669' : '1px solid #cbd5e1',
                background: channel === 'whatsapp' ? '#ecfdf5' : '#fff',
                color: channel === 'whatsapp' ? '#065f46' : '#64748b',
                fontWeight: '800',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              💬 WhatsApp মোড
            </button>
            <button
              onClick={() => setChannel('sms')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: channel === 'sms' ? '2px solid #059669' : '1px solid #cbd5e1',
                background: channel === 'sms' ? '#ecfdf5' : '#fff',
                color: channel === 'sms' ? '#065f46' : '#64748b',
                fontWeight: '800',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              📩 SMS মোড
            </button>
          </div>
        </div>

        {loading ? (
          <DataLoader type="skeleton-list" count={3} text="কাস্টমার তালিকা লোড হচ্ছে..." />
        ) : targetCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
            কোনো কাস্টমার পাওয়া যায়নি। <Link href="/khata" style={{ color: '#059669', fontWeight: '800' }}>খাতায় নতুন কাস্টমার যুক্ত করুন →</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {targetCustomers.map((c) => {
              const due = Number(c.totalDue || c.total_due || 0);
              const preview = getMessagePreview(c.name, due);
              const waLink = getWhatsAppLink(c.phone, c.name, due);

              return (
                <div key={c.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#166534' }}>
                      👤 {c.name} ({c.phone}) • {due > 0 ? <strong style={{ color: '#dc2626' }}>বাকি: ৳{due}</strong> : <span style={{ color: '#059669' }}>পরিশোধিত ✓</span>}
                    </span>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#25D366',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>💬 সরাসরি WhatsApp পাঠান</span>
                    </a>
                  </div>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5, background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                    {preview}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
