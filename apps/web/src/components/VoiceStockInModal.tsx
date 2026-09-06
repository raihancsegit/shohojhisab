'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { parseVoiceStockIn, VoiceStockInResult } from '../lib/voicePOSParser';

interface VoiceStockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onStockUpdated: () => void;
}

export default function VoiceStockInModal({
  isOpen,
  onClose,
  products,
  onStockUpdated
}: VoiceStockInModalProps) {
  const { tenant, triggerHaptic, speakAnnouncement, isSoundboxEnabled } = useAuth();
  const currentTenantId = tenant?.id || 'tenant-1';

  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parsedStock, setParsedStock] = useState<VoiceStockInResult | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string>('মাইক চালু আছে। সরাসরি মুখে বলুন: যেমন "নাপা এক্সট্রা ৫০ পাতা স্টক যোগ করো কেনা ২২"');

  const recognitionRef = useRef<any>(null);
  const isComponentMounted = useRef<boolean>(true);

  // Sound generator
  const playBeep = (freq = 880) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  const startContinuousListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট করে না। Google Chrome ব্যবহার করুন।');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (isComponentMounted.current) {
          setIsListening(true);
        }
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const currentSaid = (finalChunk || interimText).trim();
        if (currentSaid) {
          setLiveTranscript(currentSaid);
        }

        if (finalChunk.trim()) {
          handleProcessVoiceInput(finalChunk.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.log('Speech error:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
          setLastActionMessage('⚠️ মাইক্রোফোন ব্যবহারের অনুমতি দিন');
        }
      };

      recognition.onend = () => {
        if (isComponentMounted.current && !isMuted) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {}
          }, 300);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start continuous speech recognition', err);
    }
  };

  const handleProcessVoiceInput = (spokenText: string) => {
    // Cancel any active speech output
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const result = parseVoiceStockIn(spokenText, products);
    console.log('Voice Stock-In Parsed:', result);

    if (result.success) {
      playBeep(1100);
      triggerHaptic('success');
      setParsedStock(result);
      setLastActionMessage(`✓ শনাক্ত হয়েছে: ${result.explanation}`);
    } else {
      setLastActionMessage(`⚠️ "${spokenText}" থেকে পণ্যের স্টক বোঝা যায়নি`);
    }
  };

  const handleApplyStockIn = async () => {
    if (!parsedStock || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');

    try {
      if (parsedStock.product) {
        // Update existing product stock & prices
        const currentStock = Number(parsedStock.product.stock || 0);
        const newStock = currentStock + parsedStock.quantityToAdd;

        const payload = {
          ...parsedStock.product,
          stock: newStock,
          purchasePrice: parsedStock.purchasePrice || parsedStock.product.purchasePrice,
          sellingPrice: parsedStock.sellingPrice || parsedStock.product.sellingPrice
        };

        const res = await fetch(`/api/products/${parsedStock.product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          playBeep(1200);
          onStockUpdated();
          setParsedStock(null);
          setLastActionMessage(`✓ "${parsedStock.productName}" এর স্টক আপডেট হয়েছে! (মোট: ${newStock} ${parsedStock.unit})`);
        }
      } else {
        // Product not yet in DB, create new
        const payload = {
          tenantId: currentTenantId,
          categoryId: 'cat-grocery',
          banglaName: parsedStock.productName,
          name: parsedStock.productName,
          barcode: '894' + Math.floor(10000000 + Math.random() * 90000000),
          purchasePrice: parsedStock.purchasePrice || 80,
          sellingPrice: parsedStock.sellingPrice || 100,
          stock: parsedStock.quantityToAdd,
          unit: parsedStock.unit
        };

        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          playBeep(1200);
          onStockUpdated();
          setParsedStock(null);
          setLastActionMessage(`✓ নতুন পণ্য "${parsedStock.productName}" স্টকে যুক্ত হয়েছে!`);
        }
      }
    } catch (e) {
      console.error(e);
    }

    setIsSubmitting(false);
  };

  useEffect(() => {
    isComponentMounted.current = true;
    if (isOpen) {
      startContinuousListening();
    }
    return () => {
      isComponentMounted.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="voice-stockin-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>{`
        @media (max-width: 640px) {
          .voice-stockin-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .voice-stockin-container {
            max-height: 100dvh !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
          }
        }
      `}</style>
      <div className="voice-stockin-container" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '660px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 60%, #059669 100%)',
          padding: '18px 22px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              🎙️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', letterSpacing: '-0.3px' }}>
                মুখে বলে স্টক ও চালান এন্ট্রি (Voice Stock-In)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.85, fontWeight: '600' }}>
                নতুন মাল বা চালান দোকানে ঢুকলে মুখে বলুন — সাথে সাথে স্টক আপডেট হবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Audio Waves & Speech Banner */}
        <div style={{
          background: isListening ? '#f0fdf4' : '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                setIsMuted(true);
                if (recognitionRef.current) recognitionRef.current.stop();
                setIsListening(false);
              } else {
                setIsMuted(false);
                startContinuousListening();
              }
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: isListening ? '#10b981' : '#64748b',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
              flexShrink: 0
            }}
          >
            {isListening ? '🎙️' : '🔇'}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '900',
                padding: '2px 8px',
                borderRadius: '6px',
                background: isListening ? '#dcfce7' : '#e2e8f0',
                color: isListening ? '#15803d' : '#475569',
                textTransform: 'uppercase'
              }}>
                {isListening ? '● AI ভয়েস লিসেনিং অন' : '○ মাইক বন্ধ'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                (চালান বা পণ্যের স্টক বলুন)
              </span>
            </div>
            <div style={{
              fontSize: '13.5px',
              fontWeight: '800',
              color: liveTranscript ? '#0f172a' : '#94a3b8',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {liveTranscript ? `"${liveTranscript}"` : 'যেমন: "নাপা এক্সট্রা ৫০ পাতা স্টক যোগ করো কেনা ২২"'}
            </div>
          </div>
        </div>

        {/* Action Status Notice */}
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '8px 20px',
          fontSize: '12px',
          fontWeight: '800',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📢</span>
          <span>{lastActionMessage}</span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Quick Simulation Samples */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              কুইক টেস্ট সিমুলেশন (১-ক্লিক করুন):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                { label: '💊 নাপা এক্সট্রা (+৫০ পাতা)', text: 'নাপা এক্সট্রা ৫০ পাতা স্টক যোগ করো কেনা ২২' },
                { label: '🍚 চিনি (+১০০ কেজি)', text: 'চিনি ১০০ কেজি স্টক ইন কেনা ১৩০ বিক্রয় ১৪০' },
                { label: '🛢️ সয়াবিন তেল (+২০ লিটার)', text: 'সয়াবিন তেল ২০ লিটার নতুন চালান' },
                { label: '👕 পোলো শার্ট (+১৫ পিস)', text: 'পোলো শার্ট ১৫ পিস নতুন স্টক' }
              ].map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleProcessVoiceInput(s.text)}
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parsed Stock-In Preview Cockpit */}
          {parsedStock ? (
            <div style={{
              background: '#f8fafc',
              border: '2px solid #10b981',
              borderRadius: '16px',
              padding: '18px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#047857' }}>
                  ✓ AI সনাক্তকৃত স্টক ইন বিবরণ
                </span>
                <span style={{
                  background: parsedStock.product ? '#dcfce7' : '#fef3c7',
                  color: parsedStock.product ? '#15803d' : '#92400e',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {parsedStock.product ? '✓ বিদ্যমান পণ্য' : '✦ নতুন পণ্য হিসেবে যুক্ত হবে'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>পণ্যের নাম</label>
                  <input
                    type="text"
                    value={parsedStock.productName}
                    onChange={e => setParsedStock({ ...parsedStock, productName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>নতুন যুক্ত হবে (Quantity)</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      value={parsedStock.quantityToAdd}
                      onChange={e => setParsedStock({ ...parsedStock, quantityToAdd: Number(e.target.value) })}
                      style={{ width: '70%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '900', color: '#059669', fontSize: '14px' }}
                    />
                    <input
                      type="text"
                      value={parsedStock.unit}
                      onChange={e => setParsedStock({ ...parsedStock, unit: e.target.value })}
                      style={{ width: '30%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '12px' }}
                    />
                  </div>
                </div>

                {parsedStock.product && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>বর্তমান মজুদ</label>
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#f1f5f9', fontWeight: '800', color: '#475569', fontSize: '13px' }}>
                      {parsedStock.product.stock || 0} {parsedStock.unit}
                    </div>
                  </div>
                )}

                {parsedStock.product && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>আপডেট পরবর্তী মোট মজুদ</label>
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfdf5', fontWeight: '900', color: '#059669', fontSize: '14px' }}>
                      {(Number(parsedStock.product.stock || 0) + parsedStock.quantityToAdd)} {parsedStock.unit}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>ক্রয় দর (টাকা)</label>
                  <input
                    type="number"
                    value={parsedStock.purchasePrice || ''}
                    placeholder={parsedStock.product ? String(parsedStock.product.purchasePrice) : 'দর'}
                    onChange={e => setParsedStock({ ...parsedStock, purchasePrice: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>বিক্রয় দর (টাকা)</label>
                  <input
                    type="number"
                    value={parsedStock.sellingPrice || ''}
                    placeholder={parsedStock.product ? String(parsedStock.product.sellingPrice) : 'বিক্রয় দর'}
                    onChange={e => setParsedStock({ ...parsedStock, sellingPrice: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '900', color: '#059669', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '30px 20px',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📦</div>
              <p style={{ fontWeight: '800', fontSize: '14px', margin: '0 0 6px 0', color: '#334155' }}>
                কোনো পণ্য ও চালানের পরিমাণ মুখে বলুন অথবা উপরের বাটনে ক্লিক করুন
              </p>
              <p style={{ fontSize: '12px', margin: 0, color: '#94a3b8' }}>
                AI আপনার কথ্য কথার ভিত্তিতে ক্যাটালগের সঠিক পণ্য খুঁজে নিয়ে বর্তমান স্টকের সাথে যোগ করবে
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#475569',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            বন্ধ করুন
          </button>

          <button
            type="button"
            onClick={handleApplyStockIn}
            disabled={!parsedStock || isSubmitting}
            style={{
              background: parsedStock ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#cbd5e1',
              border: 'none',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '14px',
              cursor: parsedStock ? 'pointer' : 'not-allowed',
              boxShadow: parsedStock ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            {isSubmitting ? 'আপডেট হচ্ছে...' : '✓ স্টক আপডেট সম্পন্ন করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
