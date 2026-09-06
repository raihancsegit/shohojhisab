'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import FeatureGate from '../../components/FeatureGate';

export default function ChallanOcrPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'ocr' | 'reorder'>('ocr');

  // Predictive Re-order suggestions based on weekly Bazaar day demand
  const reorderSuggestions = [
    { id: '1', product: 'তীর সয়াবিন তেল ১ লিটার', currentStock: '৪৫ লিটার', predictedDemand: '১০০ লিটার', needed: '৫৫ লিটার', dealer: 'মেঘনা গ্রুপ ডিলার', phone: '01711998877', reason: 'শুক্রবার বাজারে তেলের চাহিদা দ্বিগুণ থাকে' },
    { id: '2', product: 'মিনিকেট চাল ৫০ কেজি বস্তা', currentStock: '৩ বস্তা (কম স্টক!)', predictedDemand: '২৫ বস্তা', needed: '২২ বস্তা', dealer: 'রাইস মিল এজেন্সি', phone: '01822887766', reason: 'বর্তমান স্টক আর মাত্র ১ দিন চলবে' },
    { id: '3', product: 'ফ্রেশ চিনি ১ কেজি', currentStock: '৮০ কেজি', predictedDemand: '১৫০ কেজি', needed: '৭০ কেজি', dealer: 'মেঘনা গ্রুপ ডিলার', phone: '01711998877', reason: 'গত ৩ দিনে চিনির বিক্রি ৪০% বেড়েছে' },
    { id: '4', product: 'নাপা এক্সট্রা ট্যাবলেট', currentStock: '১৮০ পাতা', predictedDemand: '৩০০ পাতা', needed: '১২০ পাতা', dealer: 'বেক্সিমকো / স্কয়ার ডিপো', phone: '01933776655', reason: 'মৌসুমি সর্দি-জ্বরের কারণে দ্রুত বিক্রি হচ্ছে' }
  ];

  // Simulate AI Vision OCR Analysis of a paper invoice
  const handleSimulateScan = () => {
    setIsScanning(true);
    setScannedResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScannedResult({
        supplierName: 'মেঘনা গ্রুপ অব ইন্ডাস্ট্রিজ (ধামরাই ডিপো)',
        challanNo: 'CH-88492',
        date: '০১ সেপ্টেম্বর, ২০২৬',
        items: [
          { name: 'তীর সয়াবিন তেল ১ লিটার', qty: 50, unit: 'লিটার', unitCost: 165, totalCost: 8250 },
          { name: 'ফ্রেশ চিনি ১ কেজি প্যাকেট', qty: 100, unit: 'কেজি', unitCost: 130, totalCost: 13000 },
          { name: 'ফ্রেশ আটা ২ কেজি', qty: 30, unit: 'প্যাকেট', unitCost: 110, totalCost: 3300 },
        ],
        totalAmount: 24550,
        cashPaid: 10000,
        dueAdded: 14550
      });
    }, 2000);
  };

  const handleSaveToStock = () => {
    setSuccessNotice('🎉 চালানের ৩টি পণ্য সফলভাবে ইনভেন্টরি স্টকে যোগ হয়েছে এবং ডিলার খাতায় ৳১৪,৫৫০ বকেয়া রেকর্ড হয়েছে!');
    setScannedResult(null);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const handleSendWhatsappReorder = (item: any) => {
    const text = encodeURIComponent(
      `সালামু আলাইকুম,\nভাই ভাই জেনারেল স্টোর থেকে জরুরি পণ্যের অর্ডার:\n\n` +
      `📦 পণ্য: ${item.product}\n` +
      `📊 বর্তমান স্টক: ${item.currentStock}\n` +
      `🛒 প্রয়োজনীয় পরিমাণ: ${item.needed}\n` +
      `📅 সরবরাহের তারিখ: আগামী হাটবারের আগেই লাগবে\n\nধন্যবাদ,\nভাই ভাই জেনারেল স্টোর`
    );
    window.open(`https://wa.me/88${item.phone}?text=${text}`, '_blank');
  };

  return (
    <FeatureGate requiredPlan="pro" title="এআই চালান স্ক্যানার (Challan OCR) প্রো প্ল্যানে অন্তর্ভুক্ত">
      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '24px 16px 40px' }}>
      
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        borderRadius: '28px',
        padding: '30px 26px',
        color: '#fff',
        marginBottom: '24px',
        boxShadow: '0 16px 40px rgba(49, 46, 129, 0.28)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
            <span>📸</span> এআই চালান স্ক্যানার ও স্মার্ট রি-অর্ডার
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            কাগজের চালান ফটো তুলুন — টাইপ ছাড়াই স্টক তুলুন!
          </h1>
          <span style={{ fontSize: '13.5px', color: '#c7d2fe' }}>
            মহাজনের চালানের ছবি তুললেই এআই নাম, দাম ও পরিমাণ স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে যুক্ত করে দেয়।
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('ocr')}
            style={{
              background: activeTab === 'ocr' ? '#ffffff' : 'rgba(255,255,255,0.15)',
              color: activeTab === 'ocr' ? '#312e81' : '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: 'pointer'
            }}
          >
            📸 চালান স্ক্যানার
          </button>
          <button
            onClick={() => setActiveTab('reorder')}
            style={{
              background: activeTab === 'reorder' ? '#ffffff' : 'rgba(255,255,255,0.15)',
              color: activeTab === 'reorder' ? '#312e81' : '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: 'pointer'
            }}
          >
            🔮 হাটবার প্রেডিকশন
          </button>
        </div>
      </div>

      {successNotice && (
        <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', color: '#15803d', padding: '14px 18px', borderRadius: '16px', fontSize: '14px', fontWeight: '700', marginBottom: '20px' }}>
          {successNotice}
        </div>
      )}

      {/* Tab 1: AI Challan OCR Scanner */}
      {activeTab === 'ocr' && (
        <div>
          <div className="glass-card" style={{ padding: '30px', textAlign: 'center', marginBottom: '24px', border: '2px dashed #818cf8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📷</div>
            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>
              মহাজনের চালানের ছবি তুলুন বা আপলোড করুন
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px' }}>
              হাতে লেখা বা প্রিন্ট করা মেমো ক্যামেরার সামনে ধরুন — এআই স্বয়ংক্রিয়ভাবে মালের তালিকা বের করে দেবে।
            </p>

            <button
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="shimmer-btn"
              style={{
                background: isScanning ? '#64748b' : 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                color: '#fff',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: '900',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(67, 56, 202, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span>{isScanning ? '⏳' : '⚡'}</span>
              <span>{isScanning ? 'এআই চালান প্রসেস করছে...' : 'চালান স্ক্যান সিমুলেশন করুন'}</span>
            </button>
          </div>

          {/* Scanned Result Preview */}
          {scannedResult && (
            <div className="glass-card" style={{ padding: '26px', border: '2px solid #22c55e', boxShadow: '0 16px 40px rgba(34, 197, 94, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11.5px', fontWeight: '800', padding: '3px 10px', borderRadius: '99px' }}>
                    ✓ ১০০% নিখুঁত এআই এক্সট্রাকশন
                  </span>
                  <h4 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>{scannedResult.supplierName}</h4>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>চালান নং: {scannedResult.challanNo} • তারিখ: {scannedResult.date}</span>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px' }}>পণ্যের নাম</th>
                      <th style={{ padding: '10px 12px' }}>পরিমাণ</th>
                      <th style={{ padding: '10px 12px' }}>কেনা দর</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>মোট টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedResult.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: '800', color: '#0f172a' }}>{item.name}</td>
                        <td style={{ padding: '12px' }}>{item.qty} {item.unit}</td>
                        <td style={{ padding: '12px' }} className="num-font">৳{item.unitCost}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900' }} className="num-font">৳{item.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>সর্বমোট চালান:</span>
                  <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>৳{scannedResult.totalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#16a34a' }}>নগদ পরিশোধ:</span>
                  <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>৳{scannedResult.cashPaid.toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#dc2626' }}>ডিলার বাকি:</span>
                  <div className="num-font" style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626' }}>৳{scannedResult.dueAdded.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setScannedResult(null)}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: '800', cursor: 'pointer' }}
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSaveToStock}
                  className="shimmer-btn"
                  style={{ flex: 2, padding: '14px', borderRadius: '14px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: '900', fontSize: '15.5px', cursor: 'pointer', boxShadow: '0 6px 16px rgba(22, 163, 74, 0.3)' }}
                >
                  স্টক ও ডিলার খাতায় যোগ করুন ✓
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Predictive Bazaar Reorder Engine */}
      {activeTab === 'reorder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-card" style={{ padding: '20px', background: '#fefce8', border: '1.5px solid #fef08a' }}>
            <strong style={{ fontSize: '15px', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔮</span> হাটবার ও সাপ্তাহিক চাহিদার পূর্বাভাস
            </strong>
            <p style={{ fontSize: '13px', color: '#a16207', marginTop: '4px', lineHeight: 1.5 }}>
              সফটওয়্যার বিগত ৩ সপ্তাহের বিক্রির গতিবিধি বিশ্লেষণ করে দেখেছে যে আগামী শুক্রবার ও হাটবারে নিচের পণ্যগুলো শেষ হয়ে যেতে পারে। ১ ক্লিকেই ডিলারকে হোয়াটসঅ্যাপে অর্ডার পাঠাতে পারবেন:
            </p>
          </div>

          {reorderSuggestions.map((item) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{item.product}</strong>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  বর্তমান স্টক: <strong style={{ color: '#0f172a' }}>{item.currentStock}</strong> | সম্ভাব্য চাহিদা: {item.predictedDemand}
                </span>
                <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '700' }}>
                  💡 {item.reason}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>অর্ডার প্রয়োজন:</span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a' }}>
                    {item.needed}
                  </div>
                </div>

                <button
                  onClick={() => handleSendWhatsappReorder(item)}
                  className="shimmer-btn"
                  style={{
                    background: '#25D366',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <span>💬</span> ডিলারকে অর্ডার পাঠান
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>
    </FeatureGate>
  );
}
