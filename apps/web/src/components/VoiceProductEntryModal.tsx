'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { parseVoiceProductEntry, VoiceProductEntryResult } from '../lib/voicePOSParser';
import { getIndustryTheme, getIndustryVoiceConfig, getIndustryProductSuggestions } from '../lib/industryConfig';
import { extractTranscriptFromEvent } from '../lib/banglaSpeechUtils';
import IndustryUnitSelect from './IndustryUnitSelect';

interface VoiceProductEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (newProduct: any) => void;
}

export default function VoiceProductEntryModal({
  isOpen,
  onClose,
  onProductCreated
}: VoiceProductEntryModalProps) {
  const { tenant, triggerHaptic, speakAnnouncement, isSoundboxEnabled } = useAuth();
  const currentTenantId = tenant?.id || 'tenant-1';
  const voiceConfig = getIndustryVoiceConfig(tenant?.industryId);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parsedProduct, setParsedProduct] = useState<VoiceProductEntryResult | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string>(`মাইক চালু আছে। সরাসরি মুখে বলুন: যেমন "${voiceConfig.productEntryHint}"`);

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
        const { fullTranscript, isFinal } = extractTranscriptFromEvent(event);
        if (fullTranscript) {
          setLiveTranscript(fullTranscript);
        }

        if (isFinal && fullTranscript) {
          handleProcessVoiceInput(fullTranscript);
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
    const result = parseVoiceProductEntry(spokenText);
    console.log('Voice Product Parsed:', result);

    if (result.success) {
      playBeep(1100);
      triggerHaptic('success');
      setParsedProduct(result);
      setLastActionMessage(`✓ শনাক্ত হয়েছে: ${result.explanation}`);
    } else {
      setLastActionMessage(`⚠️ "${spokenText}" থেকে পণ্যের নাম ও দাম বোঝা যায়নি`);
    }
  };

  const handleSaveProduct = async () => {
    if (!parsedProduct || !parsedProduct.banglaName || isSubmitting) return;
    setIsSubmitting(true);
    triggerHaptic('medium');

    const payload = {
      tenantId: currentTenantId,
      categoryId: parsedProduct.categoryId,
      banglaName: parsedProduct.banglaName,
      name: parsedProduct.name,
      barcode: '894' + Math.floor(10000000 + Math.random() * 90000000),
      purchasePrice: parsedProduct.purchasePrice,
      sellingPrice: parsedProduct.sellingPrice,
      stock: parsedProduct.stock,
      unit: parsedProduct.unit,
      genericName: parsedProduct.genericName || null,
      size: parsedProduct.size || null,
      color: parsedProduct.color || null
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        playBeep(1200);
        onProductCreated(created);
        setParsedProduct(null);
        setLastActionMessage(`✓ "${parsedProduct.banglaName}" সফলভাবে ক্যাটালগে যুক্ত হয়েছে!`);
      } else {
        alert('পণ্য যোগ করতে সমস্যা হয়েছে');
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
    <div className="voice-entry-overlay" style={{
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
          .voice-entry-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .voice-entry-container {
            max-height: 100dvh !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
          }
        }
      `}</style>
      <div className="voice-entry-container" style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
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
                মুখে বলে নতুন পণ্য যোগ (Voice Product Entry)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.85, fontWeight: '600' }}>
                টাইপ না করে সরাসরি মুখে বলুন — AI স্বয়ংক্রিয়ভাবে ফিল্ড পূরণ করবে
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
                (বাংলায় কথা বলুন)
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
              {liveTranscript ? `"${liveTranscript}"` : 'যেমন: "নাপা এক্সট্রা ৫০ পাতা কেনা ২০ বিক্রয় ৩০"'}
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
              কুইক ভয়েস টেস্ট সিমুলেশন ({getIndustryTheme(tenant?.industryId).name}):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {getIndustryProductSuggestions(tenant?.industryId).slice(0, 4).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleProcessVoiceInput(`${s.name} ৫০ ${s.unit} কেনা দর ${s.costPrice || Math.round(s.price * 0.75)} টাকা বিক্রয় দর ${s.price} টাকা`)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {s.icon} {s.name} ({s.unit})
                </button>
              ))}
            </div>
          </div>

          {/* Parsed Product Preview Cockpit */}
          {parsedProduct ? (
            <div style={{
              background: '#f8fafc',
              border: '2px solid #818cf8',
              borderRadius: '16px',
              padding: '18px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.08)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#4338ca' }}>
                  ✓ AI সনাক্তকৃত নতুন পণ্যের বিবরণ
                </span>
                <span style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {getIndustryTheme(parsedProduct.categoryId || tenant?.industryId).icon} {getIndustryTheme(parsedProduct.categoryId || tenant?.industryId).name}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>পণ্যের নাম</label>
                  <input
                    type="text"
                    value={parsedProduct.banglaName}
                    onChange={e => setParsedProduct({ ...parsedProduct, banglaName: e.target.value, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>একক (Unit)</label>
                  <IndustryUnitSelect
                    value={parsedProduct.unit}
                    onChange={val => setParsedProduct({ ...parsedProduct, unit: val })}
                    industryId={tenant?.industryId}
                    style={{ padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>ক্রয় মূল্য (টাকা)</label>
                  <input
                    type="number"
                    value={parsedProduct.purchasePrice}
                    onChange={e => setParsedProduct({ ...parsedProduct, purchasePrice: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>বিক্রয় মূল্য (টাকা)</label>
                  <input
                    type="number"
                    value={parsedProduct.sellingPrice}
                    onChange={e => setParsedProduct({ ...parsedProduct, sellingPrice: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '900', color: '#059669', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>প্রারম্ভিক স্টক (Quantity)</label>
                  <input
                    type="number"
                    value={parsedProduct.stock}
                    onChange={e => setParsedProduct({ ...parsedProduct, stock: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '800', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>সম্ভাব্য লাভ / ইউনিট</label>
                  <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfdf5', fontWeight: '900', color: '#059669', fontSize: '14px' }}>
                    ৳{(parsedProduct.sellingPrice - parsedProduct.purchasePrice).toFixed(0)} ({Math.round(((parsedProduct.sellingPrice - parsedProduct.purchasePrice) / (parsedProduct.purchasePrice || 1)) * 100)}%)
                  </div>
                </div>
              </div>

              {parsedProduct.size && (
                <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '800', color: '#4338ca' }}>
                  🏷️ সাইজ/পাওয়ার: {parsedProduct.size}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '30px 20px',
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              color: '#64748b'
            }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎙️</div>
              <p style={{ fontWeight: '800', fontSize: '14px', margin: '0 0 6px 0', color: '#334155' }}>
                কোনো পণ্য মুখে বলুন অথবা উপরের বাটনে ক্লিক করুন
              </p>
              <p style={{ fontSize: '12px', margin: '0 0 12px', color: '#94a3b8' }}>
                AI আপনার কথার মধ্য থেকে নাম, স্টক, কেনা দর ও বিক্রয় দর স্বয়ংক্রিয়ভাবে আলাদা করবে
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                {voiceConfig.quickSaleSuggestions.slice(0, 4).map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleProcessVoiceInput(sample)}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    🎙️ &quot;{sample}&quot;
                  </button>
                ))}
              </div>
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
            onClick={handleSaveProduct}
            disabled={!parsedProduct || isSubmitting}
            style={{
              background: parsedProduct ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#cbd5e1',
              border: 'none',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '14px',
              cursor: parsedProduct ? 'pointer' : 'not-allowed',
              boxShadow: parsedProduct ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            {isSubmitting ? 'সেভ হচ্ছে...' : '✓ পণ্যটি ক্যাটালগে সেভ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
