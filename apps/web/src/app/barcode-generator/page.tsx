'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function BarcodeGeneratorPage() {
  const { tenant, triggerHaptic } = useAuth();
  const currentTenantId = tenant?.id;

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [quantity, setQuantity] = useState(12);
  const [labelSize, setLabelSize] = useState<'50x30' | '38x25' | 'a4_sheet'>('50x30');
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  useEffect(() => {
    if (!currentTenantId) return;
    fetch(`/api/products?tenantId=${currentTenantId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
          if (data.length > 0) {
            handleSelectProduct(data[0]);
          }
        }
      })
      .catch(() => {});
  }, [currentTenantId]);

  const handleSelectProduct = (p: any) => {
    setSelectedProductId(p.id);
    setCustomName(p.banglaName || p.name);
    setCustomPrice(String(p.sellingPrice));
    setCustomBarcode(p.barcode || '894' + Math.floor(100000 + Math.random() * 900000));
    setCustomSize(p.size || '');
  };

  const handlePrint = () => {
    triggerHaptic('success');
    window.print();
  };

  const generateBarcodeLines = (code: string) => {
    // Generate visual deterministic barcode stripes based on character codes
    const stripes: { width: number; isBlack: boolean }[] = [];
    stripes.push({ width: 2, isBlack: true }, { width: 2, isBlack: false }, { width: 2, isBlack: true });
    
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      stripes.push({ width: (charCode % 3) + 1, isBlack: true });
      stripes.push({ width: ((charCode * 2) % 3) + 1, isBlack: false });
      stripes.push({ width: ((charCode * 3) % 2) + 1, isBlack: true });
      stripes.push({ width: 1, isBlack: false });
    }
    stripes.push({ width: 2, isBlack: true }, { width: 2, isBlack: false }, { width: 2, isBlack: true });
    return stripes;
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
            🏷️ বারকোড ও প্রাইস স্টিকার জেনারেটর
          </h1>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            {tenant?.shopName} • জামাকাপড়, জুতা, কসমেটিক্স ও খোলা পণ্যের স্টিকার প্রিন্ট
          </span>
        </div>

        <button
          onClick={handlePrint}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '14px',
            fontWeight: '900',
            fontSize: '15px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)'
          }}
        >
          <span>🖨️</span> স্টিকার প্রিন্ট করুন
        </button>
      </div>

      {/* Control Panel (Hidden during Print) */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: Product Selection & Details */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            📦 পণ্য নির্বাচন ও কাস্টম তথ্য
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>স্টক থেকে পণ্য বাছুন:</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const p = products.find(prod => prod.id === e.target.value);
                  if (p) handleSelectProduct(p);
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff' }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.banglaName || p.name} — ৳{p.sellingPrice}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>পণ্যের নাম:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>বিক্রয় দর (৳):</label>
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="num-font"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>বারকোড নম্বর:</label>
                <input
                  type="text"
                  value={customBarcode}
                  onChange={(e) => setCustomBarcode(e.target.value)}
                  className="num-font"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>সাইজ / কালার (ঐচ্ছিক):</label>
                <input
                  type="text"
                  placeholder="যেমন: XL / 32 / রেড"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Print Layout & Quantity */}
        <div className="ui-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            ⚙️ স্টিকার সাইজ ও বিন্যাস
          </h3>

          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>স্টিকারের ধরণ:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: '50x30', label: '৫০x৩০ মিমি', sub: 'থার্মাল লেবেল' },
                  { id: '38x25', label: '৩৮x২৫ মিমি', sub: 'মিনি স্টিকার' },
                  { id: 'a4_sheet', label: 'A4 শিট', sub: '২৪টি প্রতি পেজ' },
                ].map(s => (
                  <div
                    key={s.id}
                    onClick={() => { setLabelSize(s.id as any); triggerHaptic('light'); }}
                    style={{
                      padding: '8px',
                      borderRadius: '10px',
                      border: labelSize === s.id ? '2px solid #10b981' : '1.5px solid #cbd5e1',
                      background: labelSize === s.id ? '#ecfdf5' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <strong style={{ fontSize: '12.5px', color: '#0f172a', display: 'block' }}>{s.label}</strong>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{s.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>প্রিন্ট সংখ্যা (কপি):</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="num-font"
                  style={{ width: '100px', padding: '10px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '16px', fontWeight: '800', textAlign: 'center', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[6, 12, 24, 48].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      style={{ background: quantity === qty ? '#4f46e5' : '#f1f5f9', color: quantity === qty ? '#fff' : '#475569', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {qty}টি
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                <input type="checkbox" checked={showShopName} onChange={(e) => setShowShopName(e.target.checked)} />
                দোকানের নাম দেখান
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                বিক্রয় মূল্য (৳) দেখান
              </label>
            </div>
          </div>
        </div>

      </div>

      {/* Live Printable Preview Area */}
      <div>
        <h3 className="no-print" style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
          👁️ স্টিকার লাইভ প্রিভিউ ({quantity} টি লেবেল)
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: labelSize === '38x25'
            ? 'repeat(auto-fill, minmax(140px, 1fr))'
            : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
          background: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          border: '1.5px dashed #cbd5e1'
        }}>
          {Array.from({ length: quantity }).map((_, idx) => (
            <div
              key={idx}
              className="sticker-label"
              style={{
                border: '1px solid #94a3b8',
                borderRadius: '8px',
                padding: '10px 8px',
                textAlign: 'center',
                background: '#ffffff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: labelSize === '38x25' ? '105px' : '130px',
                boxSizing: 'border-box'
              }}
            >
              {/* Shop Name */}
              {showShopName && (
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tenant?.shopName || 'দোকান'}
                </div>
              )}

              {/* Product Name */}
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', margin: '2px 0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {customName || 'পণ্যের নাম'} {customSize ? `(${customSize})` : ''}
              </div>

              {/* Graphical Barcode Simulation */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '36px', gap: '1.5px', margin: '2px 0', overflow: 'hidden' }}>
                {generateBarcodeLines(customBarcode).map((stripe, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      width: `${stripe.width}px`,
                      height: '100%',
                      background: stripe.isBlack ? '#000000' : 'transparent'
                    }}
                  />
                ))}
              </div>

              {/* Barcode Number */}
              <div className="num-font" style={{ fontSize: '10.5px', color: '#334155', fontWeight: '700', letterSpacing: '1px' }}>
                {customBarcode}
              </div>

              {/* Price MRP */}
              {showPrice && (
                <div style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', borderTop: '1px dashed #cbd5e1', paddingTop: '2px', marginTop: '2px' }}>
                  ম.খু.মূ: <span className="num-font">৳{customPrice}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Print CSS Rules */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print, header, nav, .mobile-bottom-nav, button {
            display: none !important;
          }
          .app-container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .sticker-label {
            page-break-inside: avoid !important;
            border: 1px solid #000000 !important;
          }
        }
      `}</style>

    </div>
  );
}
