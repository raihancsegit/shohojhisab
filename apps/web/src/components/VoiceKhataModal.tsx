'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getIndustryVoiceConfig } from '../lib/industryConfig';
import { extractTranscriptFromEvent, cleanSpokenBengali } from '../lib/banglaSpeechUtils';

interface VoiceKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenantId: string;
  customers: any[];
  products: any[];
  industryId?: string;
  onActionCompleted: () => void;
  speakAnnouncement?: (text: string) => void;
  triggerHaptic?: (type?: any) => void;
}

export default function VoiceKhataModal({
  isOpen,
  onClose,
  currentTenantId,
  customers,
  products,
  industryId = 'cat-grocery',
  onActionCompleted,
  speakAnnouncement,
  triggerHaptic
}: VoiceKhataModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastActionMessage, setLastActionMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualText, setManualText] = useState('');

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(false);

  const voiceConfig = getIndustryVoiceConfig(industryId);

  // Play auditory feedback beep
  const playBeep = (freq = 900, type: OscillatorType = 'sine', duration = 0.12) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLastActionMessage('⚠️ আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্যবহার করুন।');
      return;
    }

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestTranscriptRef.current = '';
    setLiveTranscript('');
    setLastActionMessage('🎙️ শুনছি... কাস্টমারের নাম, টাকা ও পণ্যের নাম বলুন');
    setIsListening(true);
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

        // Smart silence timer (1.3 seconds of pause triggers auto-processing)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && latestTranscriptRef.current.trim()) {
            handleProcessCommand(latestTranscriptRef.current.trim());
          }
        }, 1300);
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech') return;
        console.warn('Voice recognition error:', err.error);
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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  };

  const handleProcessCommand = async (spokenText: string) => {
    if (!spokenText || !currentTenantId) return;
    setIsProcessing(true);
    stopListening();
    playBeep(1100);

    setLastActionMessage(`প্রসেস হচ্ছে: "${spokenText}"...`);

    try {
      const res = await fetch('/api/voice-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenantId, text: spokenText })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          playBeep(1300);
          if (triggerHaptic) triggerHaptic('success');
          setLastActionMessage(`✓ ${result.speech}`);
          if (speakAnnouncement) speakAnnouncement(result.speech);
          onActionCompleted();
          setLiveTranscript('');
          latestTranscriptRef.current = '';
          
          // Auto restart listening after 2 seconds for continuous multi-customer entry
          setTimeout(() => {
            if (isMountedRef.current) {
              startListening();
            }
          }, 2200);
          return;
        } else {
          setLastActionMessage(result.speech || 'কথাটি বুঝতে পারিনি। পরিষ্কারভাবে আবার বলুন।');
          if (triggerHaptic) triggerHaptic('warning');
        }
      } else {
        setLastActionMessage('সার্ভার থেকে রেসপন্স পাওয়া যায়নি।');
      }
    } catch (e) {
      setLastActionMessage('কানেকশন সমস্যা! ইন্টারনেট চেক করুন।');
    } finally {
      setIsProcessing(false);
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

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.82)',
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
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: isListening ? '#ef4444' : '#64748b',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              boxShadow: isListening ? '0 0 0 6px rgba(239, 68, 68, 0.25)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              🎙️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#ffffff' }}>
                  ভয়েসে বাকি খাতা এন্ট্রি ও সহকারী
                </h3>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '900',
                  padding: '2px 6px',
                  borderRadius: '99px',
                  background: isListening ? '#ef4444' : '#475569',
                  color: '#fff',
                  textTransform: 'uppercase'
                }}>
                  {isListening ? 'Live' : 'Paused'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                মুখে বলুন: নাম, টাকা, অথবা নেওয়া পণ্যের নাম
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#334155',
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
        <div style={{ padding: '18px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{
            background: '#ffffff',
            border: isListening ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '16px',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            transition: 'border 0.2s ease'
          }}>
            {isProcessing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '800', fontSize: '14px' }}>
                <span className="animate-spin">⏳</span>
                <span>খাতায় এন্ট্রি হচ্ছে...</span>
              </div>
            ) : liveTranscript ? (
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', lineHeight: 1.4 }}>
                &quot;{liveTranscript}&quot;
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '6px', height: '14px', background: '#ef4444', borderRadius: '4px', animation: 'pulse 1s infinite' }} />
                  <span style={{ width: '6px', height: '24px', background: '#ef4444', borderRadius: '4px', animation: 'pulse 0.8s infinite 0.2s' }} />
                  <span style={{ width: '6px', height: '18px', background: '#ef4444', borderRadius: '4px', animation: 'pulse 1.2s infinite 0.4s' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                  পরিষ্কার বাংলায় বলুন... (AI স্বয়ংক্রিয়ভাবে বুঝে নিবে)
                </span>
              </div>
            )}
          </div>

          {lastActionMessage && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: lastActionMessage.startsWith('✓') ? '#ecfdf5' : '#fef2f2',
              color: lastActionMessage.startsWith('✓') ? '#065f46' : '#991b1b',
              border: lastActionMessage.startsWith('✓') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              fontSize: '12.5px',
              fontWeight: '800',
              lineHeight: 1.4
            }}>
              {lastActionMessage}
            </div>
          )}
        </div>

        {/* Example Voice Commands Guide */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            💡 কীভাবে মুখে বলবেন (ক্লিক করে টেস্ট করুন):
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleProcessCommand(voiceConfig.dueVoiceExample || 'রহিম এর খাতায় ৫০০ টাকা বাকি লেখো')}
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '10px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#991b1b', display: 'block' }}>
                  🔴 বাকি দেওয়ার সময়:
                </strong>
                <span style={{ fontSize: '12px', color: '#b91c1c' }}>
                  &quot;{voiceConfig.dueVoiceExample || 'রহিম এর খাতায় ৫০০ টাকা বাকি লেখো'}&quot;
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: '6px' }}>
                টেস্ট ➔
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleProcessCommand('করিম ভাই ২০০ টাকা বাকি জমা দিল')}
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '12px',
                padding: '10px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#065f46', display: 'block' }}>
                  🟢 বাকি টাকা জমা নেওয়ার সময়:
                </strong>
                <span style={{ fontSize: '12px', color: '#047857' }}>
                  &quot;করিম ভাই ২০০ টাকা বাকি জমা দিল&quot;
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#10b981', color: '#fff', padding: '3px 8px', borderRadius: '6px' }}>
                টেস্ট ➔
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleProcessCommand('রহিমের বাকি কত?')}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '10px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block' }}>
                  🔍 বকেয়া ব্যালেন্স জানার সময়:
                </strong>
                <span style={{ fontSize: '12px', color: '#2563eb' }}>
                  &quot;রহিমের বাকি কত?&quot; বা &quot;আজকে কার কার টাকা দেওয়ার কথা?&quot;
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#3b82f6', color: '#fff', padding: '3px 8px', borderRadius: '6px' }}>
                টেস্ট ➔
              </span>
            </button>
          </div>

          {/* Quick Manual Text Fallback */}
          <div style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
              অথবা নিচে লিখে এন্টার দিন:
            </label>
            <form onSubmit={(e) => { e.preventDefault(); if (manualText.trim()) { handleProcessCommand(manualText.trim()); setManualText(''); } }} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="যেমন: রহিম এর খাতায় ৩০০ টাকা বাকি লেখো"
                style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <button
                type="submit"
                style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '12.5px', cursor: 'pointer' }}
              >
                সাবমিট
              </button>
            </form>
          </div>
        </div>

        {/* Footer Controls */}
        <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            style={{
              background: isListening ? '#ef4444' : '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isListening ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span>{isListening ? '⏹ মাইক বন্ধ' : '▶ মাইক চালু করুন'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              padding: '10px 16px',
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
    </div>
  );
}
