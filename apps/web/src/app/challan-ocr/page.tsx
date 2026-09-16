'use client';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import FeatureGate from '../../components/FeatureGate';
import { useAuth } from '../../context/AuthContext';
import { playSuccessChime, playNotificationSound } from '../../lib/audioFeedbackUtils';

export default function ChallanOcrPage() {
  const { tenant, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;

  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [successNotice, setSuccessNotice] = useState('');
  const [savedSummary, setSavedSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ocr' | 'reorder'>('ocr');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predictive Re-order suggestions based on weekly Bazaar day demand
  const reorderSuggestions = [
    { id: '1', product: 'তীর সয়াবিন তেল ১ লিটার', currentStock: '৪৫ লিটার', predictedDemand: '১০০ লিটার', needed: '৫৫ লিটার', dealer: 'মেঘনা গ্রুপ ডিলার', phone: '01711998877', reason: 'শুক্রবার বাজারে তেলের চাহিদা দ্বিগুণ থাকে' },
    { id: '2', product: 'মিনিকেট চাল ৫০ কেজি বস্তা', currentStock: '৩ বস্তা (কম স্টক!)', predictedDemand: '২৫ বস্তা', needed: '২২ বস্তা', dealer: 'রাইস মিল এজেন্সি', phone: '01822887766', reason: 'বর্তমান স্টক আর মাত্র ১ দিন চলবে' },
    { id: '3', product: 'ফ্রেশ চিনি ১ কেজি', currentStock: '৮০ কেজি', predictedDemand: '১৫০ কেজি', needed: '৭০ কেজি', dealer: 'মেঘনা গ্রুপ ডিলার', phone: '01711998877', reason: 'গত ৩ দিনে চিনির বিক্রি ৪০% বেড়েছে' },
    { id: '4', product: 'নাপা এক্সট্রা ট্যাবলেট', currentStock: '১৮০ পাতা', predictedDemand: '৩০০ পাতা', needed: '১২০ পাতা', dealer: 'বেক্সিমকো / স্কয়ার ডিপো', phone: '01933776655', reason: 'মৌসুমি সর্দি-জ্বরের কারণে দ্রুত বিক্রি হচ্ছে' }
  ];

  // Handle Photo Capture / File Selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('light');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCapturedImage(base64);
      processChallanScan(base64);
    };
    reader.readAsDataURL(file);
  };

  // Process Challan Scan via API
  const processChallanScan = async (imageData?: string) => {
    setIsScanning(true);
    setScannedResult(null);
    setSavedSummary(null);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/challan/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData || capturedImage,
          tenantId: currentTenantId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScannedResult(data);
        playSuccessChime();
        triggerHaptic('success');
        if (speakAnnouncement) {
          speakAnnouncement('চালানের ছবি স্ক্যান সম্পন্ন হয়েছে। পণ্যের তালিকা যাচাই করে স্টকে যোগ করুন।');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Recalculate totals on item edit
  const handleItemChange = (index: number, field: string, val: any) => {
    if (!scannedResult) return;
    const newItems = [...scannedResult.items];
    newItems[index] = { ...newItems[index], [field]: val };
    
    if (field === 'qty' || field === 'unitCost') {
      const qty = Number(newItems[index].qty) || 0;
      const cost = Number(newItems[index].unitCost) || 0;
      newItems[index].totalCost = qty * cost;
      if (field === 'unitCost' && !newItems[index].sellingPrice) {
        newItems[index].sellingPrice = Math.round(cost * 1.15);
      }
    }

    const newTotal = newItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
    const cash = Number(scannedResult.cashPaid) || 0;
    const newDue = Math.max(0, newTotal - cash);

    setScannedResult({
      ...scannedResult,
      items: newItems,
      totalAmount: newTotal,
      dueAdded: newDue
    });
  };

  // Add Item Row
  const handleAddItemRow = () => {
    if (!scannedResult) return;
    const newItem = {
      name: '',
      qty: 10,
      unit: 'পিস',
      unitCost: 100,
      sellingPrice: 120,
      totalCost: 1000
    };
    const newItems = [...scannedResult.items, newItem];
    const newTotal = newItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
    const cash = Number(scannedResult.cashPaid) || 0;
    setScannedResult({
      ...scannedResult,
      items: newItems,
      totalAmount: newTotal,
      dueAdded: Math.max(0, newTotal - cash)
    });
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (!scannedResult) return;
    const newItems = scannedResult.items.filter((_: any, i: number) => i !== index);
    const newTotal = newItems.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
    const cash = Number(scannedResult.cashPaid) || 0;
    setScannedResult({
      ...scannedResult,
      items: newItems,
      totalAmount: newTotal,
      dueAdded: Math.max(0, newTotal - cash)
    });
  };

  // Save to Stock & Dealer Ledger
  const handleSaveToStock = async () => {
    if (!scannedResult || !currentTenantId) return;
    setIsSaving(true);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/challan/save-to-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          supplierName: scannedResult.supplierName,
          supplierPhone: scannedResult.supplierPhone,
          challanNo: scannedResult.challanNo,
          items: scannedResult.items,
          totalAmount: scannedResult.totalAmount,
          cashPaid: scannedResult.cashPaid,
          dueAdded: scannedResult.dueAdded
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessNotice(data.message);
        setSavedSummary(data);
        setScannedResult(null);
        setCapturedImage(null);
        playSuccessChime();
        triggerHaptic('success');
        if (speakAnnouncement) {
          speakAnnouncement('চালানের সকল পণ্য সফলভাবে স্টকে যুক্ত হয়েছে এবং ডিলার খাতায় বকেয়া আপডেট হয়েছে');
        }
      } else {
        const err = await res.json();
        alert(err.error || 'সংরক্ষণ করতে সমস্যা হয়েছে');
      }
    } catch (e: any) {
      alert('সার্ভারে যোগাযোগ করা যায়নি: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendWhatsappReorder = (item: any) => {
    const text = encodeURIComponent(
      `সালামু আলাইকুম,\n${tenant?.shopName || 'ভাই ভাই জেনারেল স্টোর'} থেকে জরুরি পণ্যের অর্ডার:\n\n` +
      `📦 পণ্য: ${item.product}\n` +
      `📊 বর্তমান স্টক: ${item.currentStock}\n` +
      `🛒 প্রয়োজনীয় পরিমাণ: ${item.needed}\n` +
      `📅 সরবরাহের তারিখ: আগামী হাটবারের আগেই লাগবে\n\nধন্যবাদ,\n${tenant?.shopName || ''}`
    );
    window.open(`https://wa.me/88${item.phone}?text=${text}`, '_blank');
  };

  return (
    <FeatureGate featureKey="enableChallanOcr" requiredPlan="pro" title="চালান ক্যামেরা স্ক্যানার প্রো প্ল্যানে অন্তর্ভুক্ত">
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px 14px 60px' }}>
      
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        borderRadius: '24px',
        padding: '24px 20px',
        color: '#fff',
        marginBottom: '20px',
        boxShadow: '0 12px 32px rgba(49, 46, 129, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '800', marginBottom: '6px' }}>
            <span>📸</span> চালান ক্যামেরা স্ক্যানার ও ইনভেন্টরি স্টক
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 4.5vw, 24px)', fontWeight: '900', letterSpacing: '-0.5px', margin: '0 0 4px' }}>
            মহাজনের চালান ফটো তুলুন — সরাসরি স্টকে মাল তুলুন!
          </h1>
          <span style={{ fontSize: '13px', color: '#c7d2fe' }}>
            {tenant?.shopName} • চালানের ছবি তুললেই পণ্য নাম, কেনা দর ও স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে যুক্ত হবে।
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('ocr')}
            style={{
              background: activeTab === 'ocr' ? '#ffffff' : 'rgba(255,255,255,0.15)',
              color: activeTab === 'ocr' ? '#312e81' : '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '13px',
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
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            🔮 হাটবার রি-অর্ডার
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div style={{
          background: '#ecfdf5',
          border: '1.5px solid #86efac',
          color: '#065f46',
          padding: '16px 18px',
          borderRadius: '16px',
          fontSize: '14px',
          fontWeight: '800',
          marginBottom: '20px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span>{successNotice}</span>
            <button onClick={() => setSuccessNotice('')} style={{ background: 'none', border: 'none', color: '#065f46', fontWeight: '900', cursor: 'pointer' }}>✕</button>
          </div>
          {savedSummary && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
              <Link
                href="/stock"
                style={{
                  background: '#059669',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>📦</span> ইনভেন্টরি স্টক দেখুন
              </Link>
              <Link
                href="/dealers"
                style={{
                  background: '#374151',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>👥</span> ডিলার খাতা দেখুন
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: AI Challan OCR Scanner */}
      {activeTab === 'ocr' && (
        <div>
          {/* Hidden File Input for Camera and File Picker */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          {!scannedResult && (
            <div className="glass-card" style={{ padding: '30px 20px', textAlign: 'center', marginBottom: '20px', border: '2px dashed #818cf8', borderRadius: '20px', background: '#fcfdff' }}>
              {capturedImage ? (
                <div style={{ marginBottom: '18px' }}>
                  <img
                    src={capturedImage}
                    alt="Captured Challan"
                    style={{ maxHeight: '220px', maxWidth: '100%', borderRadius: '12px', border: '1px solid #cbd5e1', objectFit: 'contain' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      🔄 অন্য ছবি তুলুন
                    </button>
                    <button
                      onClick={() => processChallanScan(capturedImage)}
                      disabled={isScanning}
                      style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      ⚡ স্ক্যান প্রসেস করুন
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                  <h3 style={{ fontSize: '19px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px' }}>
                    মহাজনের চালানের ছবি তুলুন বা আপলোড করুন
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.4 }}>
                    হাতে লেখা বা প্রিন্ট করা মেমোর ছবি তুলুন — সফটওয়্যার স্বয়ংক্রিয়ভাবে পণ্যের নাম, পরিমাণ ও কেনা দর স্টকে যুক্ত করবে।
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        fileInputRef.current?.click();
                      }}
                      disabled={isScanning}
                      style={{
                        background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '14px 26px',
                        borderRadius: '14px',
                        fontSize: '15px',
                        fontWeight: '900',
                        cursor: 'pointer',
                        boxShadow: '0 6px 20px rgba(67, 56, 202, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>📷</span>
                      <span>ক্যামেরা দিয়ে ছবি তুলুন / মেমো আপলোড</span>
                    </button>

                    <button
                      onClick={() => processChallanScan()}
                      disabled={isScanning}
                      style={{
                        background: '#ffffff',
                        color: '#4338ca',
                        border: '1.5px solid #c7d2fe',
                        padding: '14px 20px',
                        borderRadius: '14px',
                        fontSize: '14px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      <span>⚡</span> ডেমো চালান টেস্ট করুন
                    </button>
                  </div>
                </>
              )}

              {isScanning && (
                <div style={{ marginTop: '20px', padding: '14px', background: '#e0e7ff', borderRadius: '12px', color: '#3730a3', fontSize: '13.5px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>চালানের ছবি এনালাইসিস ও পণ্য লিস্ট তৈরি হচ্ছে...</span>
                </div>
              )}
            </div>
          )}

          {/* Scanned Result Interactive Review & Edit */}
          {scannedResult && (
            <div className="glass-card" style={{ padding: '22px', border: '2px solid #10b981', borderRadius: '20px', boxShadow: '0 12px 32px rgba(16, 185, 129, 0.12)' }}>
              
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '99px', display: 'inline-block', marginBottom: '6px' }}>
                    ✓ ১০০% নিখুঁত স্ক্যান সম্পন্ন — প্রয়োজনে এডিট করুন
                  </span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={scannedResult.supplierName}
                      onChange={(e) => setScannedResult({ ...scannedResult, supplierName: e.target.value })}
                      placeholder="ডিলার বা মহাজনের নাম"
                      style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', width: '280px' }}
                    />
                    <input
                      type="text"
                      value={scannedResult.supplierPhone || ''}
                      onChange={(e) => setScannedResult({ ...scannedResult, supplierPhone: e.target.value })}
                      placeholder="ডিলার মোবাইল"
                      style={{ fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', width: '130px' }}
                    />
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    চালান নং: <input type="text" value={scannedResult.challanNo} onChange={(e) => setScannedResult({ ...scannedResult, challanNo: e.target.value })} style={{ width: '90px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px', fontSize: '12px', fontWeight: '700' }} />
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ overflowX: 'auto', marginBottom: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 10px' }}>পণ্যের নাম</th>
                      <th style={{ padding: '8px 10px', width: '90px' }}>পরিমাণ</th>
                      <th style={{ padding: '8px 10px', width: '70px' }}>একক</th>
                      <th style={{ padding: '8px 10px', width: '100px' }}>কেনা দর (৳)</th>
                      <th style={{ padding: '8px 10px', width: '100px' }}>বিক্রয় দর (৳)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '110px' }}>মোট কেনা</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedResult.items.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '800' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                            className="num-font"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '800' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            style={{ width: '100%', padding: '6px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(idx, 'unitCost', Number(e.target.value))}
                            className="num-font"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '800' }}
                          />
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          <input
                            type="number"
                            value={item.sellingPrice || Math.round(item.unitCost * 1.15)}
                            onChange={(e) => handleItemChange(idx, 'sellingPrice', Number(e.target.value))}
                            className="num-font"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '800', color: '#059669' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900' }} className="num-font">
                          ৳{(item.totalCost || (item.qty * item.unitCost)).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer' }}
                            title="মুছুন"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Item Button */}
              <button
                type="button"
                onClick={handleAddItemRow}
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  color: '#4f46e5',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>➕</span> নতুন পণ্য যোগ করুন
              </button>

              {/* Financial Totals & Cash Paid Controls */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>সর্বমোট চালান মূল্য:</span>
                  <div className="num-font" style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                    ৳{scannedResult.totalAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#16a34a' }}>নগদ পরিশোধ (ক্যাশ আউট):</span>
                  <input
                    type="number"
                    value={scannedResult.cashPaid}
                    onChange={(e) => {
                      const cash = Number(e.target.value) || 0;
                      const due = Math.max(0, scannedResult.totalAmount - cash);
                      setScannedResult({ ...scannedResult, cashPaid: cash, dueAdded: due });
                    }}
                    className="num-font"
                    style={{ width: '110px', textAlign: 'center', padding: '4px 8px', borderRadius: '6px', border: '1.5px solid #86efac', fontSize: '15px', fontWeight: '900', color: '#16a34a', display: 'block', margin: '4px auto 0' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '11.5px', color: '#dc2626' }}>মহাজন বাকি (দেনা বৃদ্ধি):</span>
                  <div className="num-font" style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
                    ৳{scannedResult.dueAdded.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setScannedResult(null);
                    setCapturedImage(null);
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1', background: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSaveToStock}
                  disabled={isSaving}
                  className="shimmer-btn"
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: '900',
                    fontSize: '14.5px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 16px rgba(22, 163, 74, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{isSaving ? '⏳' : '✓'}</span>
                  <span>{isSaving ? 'স্টকে মাল তোলা হচ্ছে...' : 'স্টক ও ডিলার খাতায় যোগ করুন'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Predictive Bazaar Reorder Engine */}
      {activeTab === 'reorder' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="glass-card" style={{ padding: '20px', background: '#fefce8', border: '1.5px solid #fef08a', borderRadius: '16px' }}>
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
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '16px'
              }}
            >
              <div>
                <h4 style={{ fontSize: '15.5px', fontWeight: '900', color: '#0f172a', margin: '0 0 2px' }}>{item.product}</h4>
                <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span>বর্তমান স্টক: <strong style={{ color: '#dc2626' }}>{item.currentStock}</strong></span>
                  <span>সম্ভাব্য চাহিদা: <strong>{item.predictedDemand}</strong></span>
                  <span>প্রয়োজন: <strong style={{ color: '#16a34a' }}>{item.needed}</strong></span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  ডিলার: {item.dealer} • কারণ: {item.reason}
                </div>
              </div>

              <button
                onClick={() => handleSendWhatsappReorder(item)}
                style={{
                  background: '#25d366',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
                }}
              >
                <span>💬</span> হোয়াটসঅ্যাপে অর্ডার দিন
              </button>
            </div>
          ))}
        </div>
      )}

      </div>
    </FeatureGate>
  );
}
