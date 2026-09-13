'use client';
import React, { useState, useEffect } from 'react';
import { playSuccessChime, playWarningSound } from '../lib/audioFeedbackUtils';

export interface SmartVoiceActionData {
  actionId?: string;
  customerName?: string;
  amount?: number;
  previousDue?: number;
  newDue?: number;
  invoiceNo?: string;
  items?: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unit?: string;
    unitPrice?: number;
    lineTotal?: number;
  }>;
  note?: string;
}

interface SmartVoiceConfirmationCardProps {
  data: SmartVoiceActionData;
  currentTenantId: string;
  onDismiss: () => void;
  onActionUndone?: () => void;
  triggerHaptic?: (type?: any) => void;
  autoDismissSeconds?: number;
}

export default function SmartVoiceConfirmationCard({
  data,
  currentTenantId,
  onDismiss,
  onActionUndone,
  triggerHaptic,
  autoDismissSeconds = 5
}: SmartVoiceConfirmationCardProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(autoDismissSeconds);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');

  useEffect(() => {
    if (isUndoing || undoMessage) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isUndoing, undoMessage, onDismiss]);

  const handleUndo = async () => {
    if (!currentTenantId) return;
    setIsUndoing(true);
    if (triggerHaptic) triggerHaptic('warning');

    try {
      const res = await fetch('/api/ai/undo-last-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenantId })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        playWarningSound();
        setUndoMessage('✓ এন্ট্রি বাতিল হয়েছে এবং স্টক পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে');
        if (onActionUndone) onActionUndone();
        setTimeout(() => {
          onDismiss();
        }, 2200);
      } else {
        setUndoMessage(result.message || 'বাতিল করা সম্ভব হয়নি');
      }
    } catch (e) {
      setUndoMessage('সার্ভারের সাথে যোগাযোগে সমস্যা হয়েছে');
    } finally {
      setIsUndoing(false);
    }
  };

  const progressPercent = Math.max(0, (secondsRemaining / autoDismissSeconds) * 100);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '20px',
      left: '20px',
      maxWidth: '440px',
      margin: '0 auto',
      zIndex: 9999,
      background: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.35), 0 0 0 1.5px #10b981',
      overflow: 'hidden',
      animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Top Countdown Progress Bar */}
      <div style={{
        height: '4px',
        background: '#e2e8f0',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
          width: `${progressPercent}%`,
          transition: 'width 1s linear'
        }} />
      </div>

      <div style={{ padding: '16px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'grid',
              placeItems: 'center',
              fontSize: '14px',
              fontWeight: '900'
            }}>
              ✓
            </span>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>
              ভয়েস এন্ট্রি সম্পন্ন হয়েছে
            </strong>
          </div>

          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
            {secondsRemaining}s অটো কনফার্ম
          </span>
        </div>

        {/* Undo Status Feedback if triggered */}
        {undoMessage ? (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '800'
          }}>
            {undoMessage}
          </div>
        ) : (
          <>
            {/* Customer & Amount Pill */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '10px 14px',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                  👤 {data.customerName || 'খুচরা গ্রাহক'}
                </span>
                <strong className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>
                  +৳{(data.amount || 0).toLocaleString('en-US')} বাকি
                </strong>
              </div>

              {data.newDue !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                  <span>পূর্বের বকেয়া: ৳{(data.previousDue || 0).toLocaleString('en-US')}</span>
                  <span style={{ fontWeight: '800', color: '#0f172a' }}>
                    মোট বকেয়া: ৳{data.newDue.toLocaleString('en-US')}
                  </span>
                </div>
              )}
            </div>

            {/* Taken Items List (if itemized) */}
            {data.items && data.items.length > 0 && (
              <div style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '8px 10px',
                marginBottom: '12px',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>
                  📦 স্টক থেকে বাদ যাওয়া পণ্য:
                </div>
                {data.items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155', padding: '2px 0' }}>
                    <span>• {it.productName} ({it.quantity} {it.unit || 'টি'})</span>
                    {it.lineTotal ? <span className="num-font" style={{ fontWeight: '800' }}>৳{it.lineTotal}</span> : null}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons: [✓ ঠিক আছে] & [✕ ভুল হয়েছে? বাতিল করুন] */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={onDismiss}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                <span>✓</span> ঠিক আছে
              </button>

              <button
                type="button"
                disabled={isUndoing}
                onClick={handleUndo}
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1.5px solid #fecaca',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isUndoing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                title="এই ভুল এন্ট্রিটি ডাটাবেজ ও স্টক থেকে বাতিল করুন"
              >
                <span>✕</span> {isUndoing ? 'বাতিল হচ্ছে...' : 'ভুল হয়েছে? বাতিল'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
