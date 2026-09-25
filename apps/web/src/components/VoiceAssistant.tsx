'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { useAuth } from '../context/AuthContext';

export default function VoiceAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant } = useAuth();
  const [showTypeInput, setShowTypeInput] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);
  const [isScanningInvoice, setIsScanningInvoice] = useState<boolean>(false);
  const [scannedInvoiceData, setScannedInvoiceData] = useState<any>(null);
  const [isCommittingStock, setIsCommittingStock] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    isProcessing,
    liveTranscript,
    feedbackText,
    feedbackType,
    currentMode,
    activeSpeaker,
    isSupported,
    lastResult,
    startListening,
    cancelVoice,
    executeCommand,
    triggerBriefing,
    undoAction
  } = useVoiceAgent();

  const effectiveTenantId = tenant?.id || (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('lbos_active_tenant') : null;
      if (raw) return JSON.parse(raw)?.id;
    } catch (e) {}
    return 'default';
  })();

  // Track Online / Offline State
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to global voice assistant triggers
  useEffect(() => {
    const handleTrigger = () => {
      startListening();
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => {
      window.removeEventListener('trigger-voice-assistant', handleTrigger);
    };
  }, [startListening]);

  // Mobile Screen Responsive Check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(typeof window !== 'undefined' && window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Superpower Action Chips
  const superpowerChips = [
    { label: '🌅 সকালের ব্রিফিং', action: () => triggerBriefing('morning') },
    { label: '🌙 রাতের হিসাব', action: () => triggerBriefing('evening') },
    { label: '📦 ডিলার অর্ডার', cmd: 'ডিলারের জন্য অর্ডারের লিস্ট বানাও' },
    { label: '📷 চালান স্ক্যান', isCamera: true },
    { label: '📊 আজকের লাভ-ক্ষতি', cmd: 'আজকের বিক্রি ও লাভ কত' },
    { label: '📖 বাজারে বাকি কত?', cmd: 'বাজারে মোট বাকি কত' }
  ];

  // Handle Photo / Camera capture for Dealer Invoice OCR
  const handleChallanPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    setScannedInvoiceData(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const res = await fetch('/api/ai/scan-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: effectiveTenantId,
            image: base64,
            mimeType: file.type || 'image/jpeg'
          })
        });

        const data = await res.json();
        setIsScanningInvoice(false);

        if (data.success && data.items?.length > 0) {
          setScannedInvoiceData(data);
        } else {
          alert(data.error || 'চালান থেকে পণ্যের তথ্য পড়া যায়নি। দয়া করে স্পষ্ট ছবি তুলুন।');
        }
      } catch (err) {
        setIsScanningInvoice(false);
        alert('চালান স্ক্যানিং সার্ভারে সংযোগ করা যায়নি।');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Commit scanned invoice items directly to stock
  const handleCommitScannedInvoice = async () => {
    if (!scannedInvoiceData) return;
    setIsCommittingStock(true);
    try {
      const res = await fetch('/api/ai/commit-scanned-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: effectiveTenantId,
          invoiceData: scannedInvoiceData
        })
      });

      const result = await res.json();
      setIsCommittingStock(false);

      if (result.success) {
        setScannedInvoiceData(null);
        window.dispatchEvent(new CustomEvent('voice-trigger-add-stock'));
        router.push('/stock');
      } else {
        alert(result.error || 'স্টকে যুক্ত করতে সমস্যা হয়েছে।');
      }
    } catch (e) {
      setIsCommittingStock(false);
      alert('সার্ভার এরর');
    }
  };

  if (!isSupported || pathname === '/login') return null;

  return (
    <>
      {/* Hidden File Input for Dealer Challan Camera / Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleChallanPhotoSelect}
        style={{ display: 'none' }}
      />

      {/* Tap outside to dismiss active listening/feedback popup */}
      {(feedbackType || scannedInvoiceData || isScanningInvoice) && (
        <div
          onClick={() => {
            cancelVoice();
            setScannedInvoiceData(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* 📄 Scanned Invoice Review & 1-Tap Stock-In Modal */}
      {scannedInvoiceData && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: isMobileScreen ? '10px' : '24px',
          left: isMobileScreen ? '10px' : 'auto',
          maxWidth: '440px',
          zIndex: 9999,
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
          border: '1.5px solid rgba(59, 130, 246, 0.4)',
          fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
          animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📷</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>চালানের ছবি স্ক্যান সম্পন্ন!</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ডিলার: {scannedInvoiceData.supplierName || 'ডিলার'} | চালান: {scannedInvoiceData.challanNo || 'CH'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setScannedInvoiceData(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', padding: '4px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '240px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '11.5px', color: '#cbd5e1', fontWeight: '700' }}>
              শনাক্তকৃত পণ্যের তালিকা ({scannedInvoiceData.items?.length || 0}টি):
            </div>
            {scannedInvoiceData.items?.map((it: any, idx: number) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>{it.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    পরিমাণ: <strong style={{ color: '#38bdf8' }}>{it.qty} {it.unit}</strong> | কেনা দর: ৳{it.unitCost}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#34d399' }}>৳{it.totalCost?.toLocaleString('en-US')}</div>
                  {it.isMatched ? (
                    <span style={{ fontSize: '9.5px', color: '#86efac', background: 'rgba(34, 197, 94, 0.2)', padding: '1px 6px', borderRadius: '8px' }}>স্টকে আছে</span>
                  ) : (
                    <span style={{ fontSize: '9.5px', color: '#fde047', background: 'rgba(234, 179, 8, 0.2)', padding: '1px 6px', borderRadius: '8px' }}>নতুন পণ্য</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>মোট চালানের টাকা:</div>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#38bdf8' }}>৳{Number(scannedInvoiceData.totalAmount || 0).toLocaleString('en-US')}</div>
            </div>
            <button
              onClick={handleCommitScannedInvoice}
              disabled={isCommittingStock}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              {isCommittingStock ? 'স্টকে যোগ হচ্ছে...' : '✓ সব মাল স্টকে তুলুন'}
            </button>
          </div>
        </div>
      )}

      {/* Scanning Loader Popup */}
      {isScanningInvoice && (
        <div style={{
          position: 'fixed',
          bottom: '84px',
          right: isMobileScreen ? '10px' : '24px',
          zIndex: 9999,
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
          border: '1.5px solid rgba(59, 130, 246, 0.5)',
          fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px', animation: 'spin 1.5s linear infinite' }}>⚙️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>চালানের ছবি স্ক্যান হচ্ছে...</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Gemini Vision দিয়ে পণ্য ও দাম পড়া হচ্ছে</div>
          </div>
        </div>
      )}

      <div className="floating-voice-widget">
        {/* 💬 Live Transcript / Feedback Pop-up */}
        {feedbackType && (
          <div style={{
            background: feedbackType === 'error'
              ? 'linear-gradient(135deg, #991b1b, #7f1d1d)'
              : feedbackType === 'success'
                ? 'linear-gradient(135deg, #065f46, #047857)'
                : 'linear-gradient(135deg, #1e1b4b, #312e81)',
            color: '#ffffff',
            padding: '14px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '700',
            maxWidth: '380px',
            width: 'calc(100vw - 36px)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
          }}>
            {/* Header: Mode Badge & Dismiss button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px' }}>
                  {feedbackType === 'listening' ? '🎙️' : feedbackType === 'processing' ? '⚡' : feedbackType === 'success' ? '✅' : '⚠️'}
                </span>
                {currentMode && currentMode !== 'stranger' && feedbackType !== 'error' && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: currentMode === 'owner' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                    border: currentMode === 'owner' ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(59, 130, 246, 0.5)',
                    color: currentMode === 'owner' ? '#fef08a' : '#bfdbfe',
                    fontWeight: '800'
                  }}>
                    {currentMode === 'owner' ? `👑 মালিক (${activeSpeaker?.name || 'মালিক'})` : `👔 কর্মচারী (${activeSpeaker?.name || 'স্টাফ'})`}
                  </span>
                )}
                <span style={{ fontSize: '13px' }}>
                  {feedbackText || (isListening ? 'শুনছি... মুখে বলুন' : '')}
                </span>
              </div>
              <button
                type="button"
                onClick={cancelVoice}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  opacity: 0.8,
                  fontSize: '14px',
                  padding: '2px 6px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Rich Markdown / Result Card Display on Success */}
            {feedbackType === 'success' && lastResult && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '12px',
                lineHeight: '1.5',
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
                  {lastResult.reply || lastResult.speech}
                </div>

                {/* Interactive Action Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {/* Action Link (e.g. "খাতায় দেখুন →" or "হোয়াটসঅ্যাপে পাঠান") */}
                  {lastResult.actionLink && (
                    <a
                      href={lastResult.actionLink.href}
                      target={lastResult.actionLink.href.startsWith('http') ? '_blank' : '_self'}
                      rel="noreferrer"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#ffffff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      {lastResult.actionLink.text}
                    </a>
                  )}

                  {/* 1-Tap Undo Button */}
                  {lastResult.undoAvailable && (
                    <button
                      type="button"
                      onClick={() => undoAction()}
                      style={{
                        background: 'rgba(239, 68, 68, 0.25)',
                        border: '1px solid rgba(239, 68, 68, 0.6)',
                        color: '#fca5a5',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      ↩️ ভুল হয়েছে? বাতিল করুন
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Voice-First Live Heard Display */}
            {feedbackType === 'listening' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '20px', animation: isListening ? 'pulse 1s infinite' : 'none' }}>
                    🎙️
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{liveTranscript ? '🟢 রেকর্ড হচ্ছে:' : isListening ? '🎙️ মাইক প্রস্তুত, মুখে বলুন...' : 'কথা শেষে স্বয়ংক্রিয় প্রসেস হবে'}</span>
                      {isListening && !liveTranscript && (
                        <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#34d399' }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: liveTranscript ? '15px' : '13px',
                      color: liveTranscript ? '#34d399' : 'rgba(255,255,255,0.75)',
                      fontWeight: '800',
                      marginTop: '3px',
                      wordBreak: 'break-word',
                      minHeight: '22px'
                    }}>
                      {liveTranscript || 'যেমন: "২ কেজি চিনি বিক্রি" বা "আজকের বিক্রি কত"'}
                    </div>
                  </div>
                  {liveTranscript && (
                    <button
                      type="button"
                      onClick={() => executeCommand(liveTranscript)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '10px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      যাও →
                    </button>
                  )}
                </div>

                {/* Optional Manual Typing input */}
                {showTypeInput ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = manualText.trim();
                      if (q) {
                        executeCommand(q);
                        setManualText('');
                        setShowTypeInput(false);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <input
                      type="text"
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="হিসাব বা কমান্ড লিখে জানান..."
                      style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        borderRadius: '10px',
                        padding: '7px 12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        outline: 'none',
                        fontWeight: '600'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      পাঠান
                    </button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowTypeInput(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#cbd5e1',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        opacity: 0.85
                      }}
                    >
                      ⌨️ লিখে জানাতে চাপুন
                    </button>
                  </div>
                )}

                {/* ⚡ Superpower 1-Tap Quick Action Chips */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '5px',
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  {superpowerChips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (chip.isCamera) {
                          fileInputRef.current?.click();
                        } else if (chip.action) {
                          chip.action();
                        } else if (chip.cmd) {
                          executeCommand(chip.cmd);
                        }
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        color: '#e0e7ff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🎙️ Floating Circular FAB (Pure Round Button, No Text) */}
        <button
          type="button"
          onClick={() => {
            if (feedbackType) {
              cancelVoice();
            } else {
              startListening();
            }
          }}
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            color: '#ffffff',
            border: '2.5px solid rgba(255, 255, 255, 0.45)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '22px',
            cursor: 'pointer',
            boxShadow: isListening
              ? '0 0 24px rgba(239, 68, 68, 0.75), 0 8px 24px rgba(0, 0, 0, 0.35)'
              : '0 8px 24px rgba(79, 70, 229, 0.45), 0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: isListening ? 'scale(1.08)' : 'scale(1)',
            outline: 'none'
          }}
          title="স্মার্ট ডিজিটাল সহকারী"
          aria-label="ভয়েস সহকারী"
        >
          <span style={{
            display: 'inline-block',
            animation: isListening ? 'bounce 0.8s infinite alternate' : 'none'
          }}>
            🎙️
          </span>
        </button>
      </div>
    </>
  );
}
