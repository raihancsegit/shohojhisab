'use client';
import React, { useState } from 'react';

interface ThermalReceiptProps {
  invoice: any;
  tenant: any;
  onClose: () => void;
}

export default function ThermalReceipt({ invoice, tenant, onClose }: ThermalReceiptProps) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');

  const handlePrint = () => {
    window.print();
  };

  const is58 = paperWidth === '58mm';
  const widthPx = is58 ? '220px' : '300px';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 1000,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPaperWidth('58mm')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: is58 ? '2px solid #0f172a' : '1px solid #cbd5e1',
                background: is58 ? '#0f172a' : '#fff',
                color: is58 ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              ৫৮ মিমি (2-inch)
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: !is58 ? '2px solid #0f172a' : '1px solid #cbd5e1',
                background: !is58 ? '#0f172a' : '#fff',
                color: !is58 ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              ৮০ মিমি (3-inch POS)
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '900'
            }}
          >
            ✕
          </button>
        </div>

        {/* Printable Thermal Receipt Paper Container */}
        <div
          id="thermal-receipt-paper"
          style={{
            width: widthPx,
            background: '#ffffff',
            padding: is58 ? '14px 10px' : '18px 14px',
            border: '1px dashed #94a3b8',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#000000',
            fontSize: is58 ? '11px' : '12.5px',
            lineHeight: 1.35,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
            marginBottom: '18px'
          }}
        >
          {/* Shop Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: is58 ? '15px' : '18px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              {tenant?.shopName || 'সহজ হিসাব স্টোর'}
            </div>
            <div style={{ fontSize: is58 ? '10px' : '11.5px' }}>
              {tenant?.location || 'বাজার রোড, বাংলাদেশ'}
            </div>
            <div style={{ fontSize: is58 ? '10px' : '11.5px' }}>
              মোবাইল: {tenant?.phone || '01XXXXXXXXX'}
            </div>
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
          </div>

          {/* Invoice Meta */}
          <div style={{ marginBottom: '6px', fontSize: is58 ? '10px' : '11.5px' }}>
            <div><strong>মেমো নং:</strong> {invoice?.invoiceNo || invoice?.id || 'INV-001'}</div>
            <div><strong>তারিখ:</strong> {invoice?.createdAt ? invoice.createdAt.slice(0, 16).replace('T', ' ') : new Date().toLocaleString()}</div>
            {invoice?.customerName && (
              <div><strong>ক্রেতা:</strong> {invoice.customerName}</div>
            )}
            <div><strong>ক্যাশিয়ার:</strong> {invoice?.cashier || tenant?.ownerName || 'কাউন্টার-১'}</div>
            <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                <th style={{ padding: '2px 0' }}>পণ্য</th>
                <th style={{ padding: '2px 0', textAlign: 'center' }}>পরিমাণ</th>
                <th style={{ padding: '2px 0', textAlign: 'right' }}>দাম</th>
              </tr>
            </thead>
            <tbody>
              {(invoice?.items || []).map((item: any, i: number) => {
                const itemName = item.product?.banglaName || item.product?.name || item.productName || item.banglaName || item.name || 'পণ্য';
                const itemPrice = item.totalPrice || ((item.unitPrice || item.sellingPrice || item.product?.sellingPrice || 0) * item.quantity);
                return (
                  <tr key={i} style={{ borderBottom: '0.5px dotted #ccc' }}>
                    <td style={{ padding: '3px 0', fontWeight: '600' }}>{itemName}</td>
                    <td style={{ padding: '3px 0', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: '700' }}>৳{itemPrice}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }} />

          {/* Totals Calculation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>মোট মূল্য (Subtotal):</span>
            <strong>৳{invoice?.subtotal || invoice?.totalAmount || 0}</strong>
          </div>
          {Number(invoice?.discount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>ডিসকাউন্ট/ছাড়:</span>
              <strong>- ৳{invoice.discount}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0', fontSize: is58 ? '13px' : '15px', fontWeight: '900', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '3px 0' }}>
            <span>সর্বমোট বিল:</span>
            <span>৳{invoice?.totalAmount || 0}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>পরিশোধ (নগদ/{invoice?.paymentMethod || 'ক্যাশ'}):</span>
            <strong>৳{invoice?.paidAmount || invoice?.totalAmount || 0}</strong>
          </div>
          {Number(invoice?.dueAmount || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', color: '#000', fontWeight: '900' }}>
              <span>বকেয়া বাকি:</span>
              <strong>৳{invoice.dueAmount}</strong>
            </div>
          )}

          {/* Footer Barcode & Thank you message */}
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <div style={{ letterSpacing: '4px', fontSize: '18px', fontWeight: '900', margin: '4px 0' }}>
              ||| | |||| | ||| | ||
            </div>
            <div style={{ fontSize: '10px' }}>{invoice?.invoiceNo || invoice?.id || 'SHO-INV-2026'}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '6px' }}>
              ধন্যবাদ, আবার আসবেন!
            </div>
            <div style={{ fontSize: '9.5px', color: '#333' }}>
              Powered by ShohojHisab OS
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 2,
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span>🖨️ প্রিন্ট রসিদ (Print POS)</span>
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Global CSS for Print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-paper, #thermal-receipt-paper * {
            visibility: visible;
          }
          #thermal-receipt-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: ${widthPx} !important;
            margin: 0 !important;
            padding: 4px !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
