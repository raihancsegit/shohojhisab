'use client';
import React, { useState, useEffect, useRef } from 'react';
import { extractTranscriptFromEvent, cleanSpokenBengali, isEchoedTTSResponse } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';
import { parseVoiceInstallment, VoiceInstallmentParseResult } from '../lib/voiceInstallmentParser';

interface VoiceInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenantId: string;
  existingCustomers?: any[];
  existingProducts?: any[];
  onInstallmentCreated: () => void;
  speakAnnouncement?: (text: string, onComplete?: () => void) => void;
  triggerHaptic?: (type?: any) => void;
}

export default function VoiceInstallmentModal({
  isOpen,
  onClose,
  currentTenantId,
  existingCustomers = [],
  existingProducts = [],
  onInstallmentCreated,
  speakAnnouncement,
  triggerHaptic
}: VoiceInstallmentModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualText, setManualText] = useState('');
  
  // Editable Parsed Fields State
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    productName: '',
    totalAmount: '',
    downPayment: '',
    totalMonths: '4',
    guarantorName: '',
    guarantorPhone: '',
    notes: ''
  });
  
  const [parsedSummary, setParsedSummary] = useState<VoiceInstallmentParseResult | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage('⚠️ আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্রাউজার ব্যবহার করুন।');
      return;
    }

    // Cancel active TTS output
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestTranscriptRef.current = '';
    setLiveTranscript('');
    setStatusMessage('🎙️ শুনছি... কাস্টমারের নাম, পণ্যের নাম, দাম ও কিস্তির মেয়াদ বলুন');
    setIsListening(true);
    playMicStartSound();
    if (triggerHaptic) triggerHaptic('medium');

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const { fullTranscript } = extractTranscriptFromEvent(event);
        if (!fullTranscript) return;

        latestTranscriptRef.current = fullTranscript;
        setLiveTranscript(fullTranscript);

        // Auto-parse on the fly
        const parsed = parseVoiceInstallment(fullTranscript, existingCustomers, existingProducts);
        if (parsed.totalAmount > 0) {
          setParsedSummary(parsed);
          setFormData(prev => ({
            ...prev,
            customerName: parsed.customerName || prev.customerName,
            customerPhone: parsed.customerPhone || prev.customerPhone,
            productName: parsed.productName || prev.productName,
            totalAmount: parsed.totalAmount ? String(parsed.totalAmount) : prev.totalAmount,
            downPayment: parsed.downPayment !== undefined ? String(parsed.downPayment) : prev.downPayment,
            totalMonths: parsed.totalMonths || prev.totalMonths,
            guarantorName: parsed.guarantorName || prev.guarantorName,
            guarantorPhone: parsed.guarantorPhone || prev.guarantorPhone,
          }));
        }

        // Silence timer triggers auto-processing
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && latestTranscriptRef.current.trim()) {
            handleSpokenComplete(latestTranscriptRef.current.trim());
          }
        }, 1200);
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech') return;
        console.warn('Voice error:', err.error);
      };

      recognition.onend = () => {
        if (isMountedRef.current && isListening) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsListening(false);
    playMicStopSound();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  };

  const handleSpokenComplete = (spokenText: string) => {
    if (!spokenText || isEchoedTTSResponse(spokenText)) return;
    const parsed = parseVoiceInstallment(spokenText, existingCustomers, existingProducts);
    
    setParsedSummary(parsed);
    setFormData({
      customerName: parsed.customerName || '',
      customerPhone: parsed.customerPhone || '',
      customerAddress: parsed.customerAddress || '',
      productName: parsed.productName || '',
      totalAmount: parsed.totalAmount ? String(parsed.totalAmount) : '',
      downPayment: parsed.downPayment ? String(parsed.downPayment) : '0',
      totalMonths: parsed.totalMonths || '4',
      guarantorName: parsed.guarantorName || '',
      guarantorPhone: parsed.guarantorPhone || '',
      notes: `ভয়েস এন্ট্রি: "${spokenText}"`
    });

    if (parsed.success) {
      playSuccessChime();
      setStatusMessage(`✓ তথ্য সনাক্ত হয়েছে: ${parsed.customerName} - ${parsed.productName} (৳${parsed.totalAmount})`);
      if (triggerHaptic) triggerHaptic('light');
    } else {
      playWarningSound();
      setStatusMessage('⚠️ মূল্য বা পণ্যের তথ্য অসম্পূর্ণ। নিচের বক্সে এডিট করুন অথবা আবার বলুন।');
    }
  };

  // Submit to Server
  const handleSubmitInstallment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentTenantId) return;

    if (!formData.customerName || !formData.productName || !formData.totalAmount) {
      playWarningSound();
      setStatusMessage('⚠️ গ্রাহকের নাম, পণ্যের নাম এবং মোট মূল্য আবশ্যক।');
      if (triggerHaptic) triggerHaptic('warning');
      return;
    }

    setIsSubmitting(true);
    stopListening();

    try {
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone || '01700000000',
          customerAddress: formData.customerAddress,
          productName: formData.productName,
          totalAmount: Number(formData.totalAmount) || 0,
          downPayment: Number(formData.downPayment) || 0,
          totalMonths: Number(formData.totalMonths) || 4,
          guarantorName: formData.guarantorName,
          guarantorPhone: formData.guarantorPhone,
          notes: formData.notes
        })
      });

      if (res.ok) {
        playSuccessChime();
        if (triggerHaptic) triggerHaptic('success');
        
        const spokenMsg = `${formData.customerName}-এর নামে ${formData.productName} এর ${formData.totalAmount} টাকার কিস্তি সফলভাবে তৈরি হয়েছে`;
        setStatusMessage(`✓ ${spokenMsg}`);

        if (speakAnnouncement) {
          speakAnnouncement(spokenMsg);
        }

        onInstallmentCreated();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        const err = await res.json();
        playWarningSound();
        setStatusMessage(`❌ ত্রুটি: ${err.error || 'সংরক্ষণ করা যায়নি'}`);
      }
    } catch (err) {
      playWarningSound();
      setStatusMessage('❌ কানেকশন সমস্যা! ইন্টারনেট কানেকশন চেক করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      startListening();
    }
    return () => {
      isMountedRef.current = false;
      stopListening();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalNum = Number(formData.totalAmount) || 0;
  const downNum = Number(formData.downPayment) || 0;
  const monthsNum = Math.max(1, Number(formData.totalMonths) || 1);
  const remainingDue = Math.max(0, totalNum - downNum);
  const monthlyInst = Math.round(remainingDue / monthsNum);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '14px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '92vh',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
        border: '1.5px solid #e2e8f0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #4f46e5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: isListening ? '#ef4444' : '#6366f1',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '22px',
              boxShadow: isListening ? '0 0 0 6px rgba(239, 68, 68, 0.3)' : '0 2px 8px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.25s ease'
            }}>
              🎙️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>
                  ভয়েসে নতুন কিস্তি বিক্রি এন্ট্রি
                </h3>
                <span style={{
                  fontSize: '9.5px',
                  fontWeight: '900',
                  padding: '2px 7px',
                  borderRadius: '99px',
                  background: isListening ? '#ef4444' : '#475569',
                  color: '#fff',
                  textTransform: 'uppercase'
                }}>
                  {isListening ? 'Live' : 'Paused'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#c7d2fe' }}>
                মুখে বলুন: নাম, পণ্যের মডেল, মোট দাম, ডাউন পেমেন্ট ও মেয়াদ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '900',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Live Listening Waveform & Transcript Box */}
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{
            background: '#ffffff',
            border: isListening ? '2px solid #6366f1' : '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '14px 16px',
            minHeight: '72px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            transition: 'border 0.2s ease'
          }}>
            {liveTranscript ? (
              <div style={{ fontSize: '15.5px', fontWeight: '800', color: '#0f172a', lineHeight: 1.4 }}>
                &quot;{liveTranscript}&quot;
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '6px', height: '14px', background: '#6366f1', borderRadius: '4px', animation: 'pulse 1s infinite' }} />
                  <span style={{ width: '6px', height: '24px', background: '#4f46e5', borderRadius: '4px', animation: 'pulse 0.8s infinite 0.2s' }} />
                  <span style={{ width: '6px', height: '18px', background: '#6366f1', borderRadius: '4px', animation: 'pulse 1.2s infinite 0.4s' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                  পরিষ্কার বাংলায় বলুন... (স্বয়ংক্রিয়ভাবে কিস্তি হিসেব বের হবে)
                </span>
              </div>
            )}
          </div>

          {statusMessage && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: statusMessage.startsWith('✓') ? '#ecfdf5' : '#fef2f2',
              color: statusMessage.startsWith('✓') ? '#065f46' : '#991b1b',
              border: statusMessage.startsWith('✓') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              fontSize: '12.5px',
              fontWeight: '800',
              lineHeight: 1.4
            }}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* Parsed Live Form & Details */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          
          {/* Calculated KPI Preview */}
          {totalNum > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              border: '1.5px solid #c7d2fe',
              borderRadius: '16px',
              padding: '12px 14px',
              marginBottom: '14px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#4338ca', fontWeight: '800', display: 'block' }}>মোট মূল্য</span>
                <strong className="num-font" style={{ fontSize: '15px', color: '#1e1b4b' }}>৳{totalNum.toLocaleString('en-US')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#4338ca', fontWeight: '800', display: 'block' }}>বাকি কিস্তি</span>
                <strong className="num-font" style={{ fontSize: '15px', color: '#dc2626' }}>৳{remainingDue.toLocaleString('en-US')}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#4338ca', fontWeight: '800', display: 'block' }}>মাসিক কিস্তি ({monthsNum} মাস)</span>
                <strong className="num-font" style={{ fontSize: '15px', color: '#059669' }}>৳{monthlyInst.toLocaleString('en-US')}</strong>
              </div>
            </div>
          )}

          {/* Form Fields for Fine-tuning */}
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>👤 গ্রাহকের নাম:</label>
                <input
                  type="text"
                  placeholder="যেমন: রহিম মিয়া"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>📞 মোবাইল নম্বর:</label>
                <input
                  type="tel"
                  placeholder="017xxxxxxxx"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>📱 পণ্য / মডেলের নাম:</label>
              <input
                type="text"
                placeholder="যেমন: Samsung Galaxy A15 / Walton ফ্রিজ"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>💰 মোট মূল্য (৳):</label>
                <input
                  type="number"
                  placeholder="24000"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="num-font"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>💵 ডাউন পেমেন্ট (৳):</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={formData.downPayment}
                  onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                  className="num-font"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>📅 মেয়াদ (মাস):</label>
                <select
                  value={formData.totalMonths}
                  onChange={(e) => setFormData({ ...formData, totalMonths: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="2">২ মাস</option>
                  <option value="3">৩ মাস</option>
                  <option value="4">৪ মাস</option>
                  <option value="6">৬ মাস</option>
                  <option value="9">৯ মাস</option>
                  <option value="12">১২ মাস</option>
                  <option value="18">১৮ মাস</option>
                  <option value="24">২৪ মাস</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>🤝 জামিনদারের নাম:</label>
                <input
                  type="text"
                  placeholder="জামিনদার (যদি থাকে)"
                  value={formData.guarantorName}
                  onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '3px' }}>📍 ঠিকানা:</label>
                <input
                  type="text"
                  placeholder="ঠিকানা"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Spoken Examples / Test Chips */}
          <div style={{ marginTop: '14px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              💡 মুখে বলার নমুনা (ক্লিক করে টেস্ট করুন):
            </div>
            
            <div style={{ display: 'grid', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleSpokenComplete('রহিম মিয়ার কাছে ২৪০০০ টাকার স্যামসাং মোবাইল কিস্তিতে বিক্রি, ডাউন পেমেন্ট ৬০০০ টাকা, ৪ মাস, ফোন ০১৭৮৮৯৯০০১১')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#334155'
                }}
              >
                <span>&quot;রহিম মিয়ার কাছে ২৪০০০ টাকার স্যামসাং মোবাইল কিস্তিতে বিক্রি, ডাউন পেমেন্ট ৬০০০ টাকা, ৪ মাস...&quot;</span>
                <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#4f46e5', color: '#fff', padding: '2px 6px', borderRadius: '5px' }}>টেস্ট ➔</span>
              </button>

              <button
                type="button"
                onClick={() => handleSpokenComplete('করিম ভাইকে ৪৫ হাজার টাকার ওয়ালটন ফ্রিজ কিস্তিতে দিলাম, নগদ জমা ১৫ হাজার টাকা, ৬ মাস')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#334155'
                }}
              >
                <span>&quot;করিম ভাইকে ৪৫ হাজার টাকার ওয়ালটন ফ্রিজ কিস্তিতে দিলাম, নগদ জমা ১৫ হাজার, ৬ মাস&quot;</span>
                <span style={{ fontSize: '10.5px', fontWeight: '800', background: '#4f46e5', color: '#fff', padding: '2px 6px', borderRadius: '5px' }}>টেস্ট ➔</span>
              </button>
            </div>
          </div>

          {/* Quick Manual Text Fallback */}
          <div style={{ marginTop: '10px' }}>
            <form onSubmit={(e) => { e.preventDefault(); if (manualText.trim()) { handleSpokenComplete(manualText.trim()); setManualText(''); } }} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="অথবা লিখে এন্টার দিন: যেমন রহিমকে ২০০০০ টাকার টিভি কিস্তিতে দিলাম..."
                style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ background: '#334155', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
              >
                সাবমিট
              </button>
            </form>
          </div>
        </div>

        {/* Footer Controls */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            style={{
              background: isListening ? '#ef4444' : '#4f46e5',
              color: '#ffffff',
              border: 'none',
              padding: '9px 15px',
              borderRadius: '10px',
              fontWeight: '900',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isListening ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
          >
            <span>{isListening ? '⏹ মাইক বন্ধ' : '▶ মাইক চালু করুন'}</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '9px 14px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              বন্ধ করুন
            </button>

            <button
              type="button"
              onClick={() => handleSubmitInstallment()}
              disabled={isSubmitting || !formData.customerName || !formData.productName || !formData.totalAmount}
              style={{
                background: (formData.customerName && formData.productName && formData.totalAmount) ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: '900',
                fontSize: '13.5px',
                cursor: (formData.customerName && formData.productName && formData.totalAmount) ? 'pointer' : 'not-allowed',
                boxShadow: (formData.customerName && formData.productName && formData.totalAmount) ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
              }}
            >
              {isSubmitting ? '⏳ সেভ হচ্ছে...' : '✓ কিস্তি তৈরি করুন'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
