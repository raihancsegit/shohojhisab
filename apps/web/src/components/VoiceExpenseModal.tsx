'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { extractTranscriptFromEvent, cleanSpokenBengali } from '../lib/banglaSpeechUtils';

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenantId: string;
  onExpenseCreated: () => void;
}

export default function VoiceExpenseModal({
  isOpen,
  onClose,
  currentTenantId,
  onExpenseCreated
}: VoiceExpenseModalProps) {
  const { triggerHaptic, speakAnnouncement } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback('⚠️ আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্যবহার করুন।');
      return;
    }

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestTranscriptRef.current = '';
    setLiveTranscript('');
    setFeedback('🎙️ শুনছি... খরচ ও টাকার পরিমাণ বলুন');
    setIsListening(true);
    triggerHaptic('medium');

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

        // 1.3-second smart silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && latestTranscriptRef.current.trim()) {
            handleProcessExpense(latestTranscriptRef.current.trim());
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

  const handleProcessExpense = async (spokenText: string) => {
    if (!spokenText || !currentTenantId) return;
    setSubmitting(true);
    stopListening();
    setFeedback(`প্রসেস হচ্ছে: "${spokenText}"...`);

    try {
      const res = await fetch('/api/voice-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenantId, text: spokenText })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          triggerHaptic('success');
          setFeedback(`✓ ${result.speech}`);
          speakAnnouncement(result.speech);
          onExpenseCreated();
          setLiveTranscript('');
          latestTranscriptRef.current = '';

          // Auto restart listening after 2 seconds for another entry
          setTimeout(() => {
            if (isMountedRef.current) {
              startListening();
            }
          }, 2200);
          return;
        } else {
          setFeedback(result.speech || 'খরচের পরিমাণ বুঝতে পারিনি। যেমন: "চা নাস্তা ৬০ টাকা" বলুন।');
          triggerHaptic('warning');
        }
      } else {
        setFeedback('সার্ভার থেকে রেসপন্স পাওয়া যায়নি।');
      }
    } catch (e) {
      setFeedback('কানেকশন সমস্যা! ইন্টারনেট চেক করুন।');
    } finally {
      setSubmitting(false);
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
        maxWidth: '520px',
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
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: isListening ? '#ef4444' : 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px',
              boxShadow: isListening ? '0 0 0 6px rgba(239, 68, 68, 0.3)' : 'none'
            }}>
              🎙️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>ভয়েসে দৈনিক খরচ এন্ট্রি</span>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: '4px' }}>AI</span>
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', opacity: 0.85 }}>
                {isListening ? 'কথা বলুন, অটো সেভ হবে' : 'মাইক্রোফোনে ট্যাপ করে শুরু করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#fff',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', overflowY: 'auto' }}>
          
          {/* Big Interactive Mic Button */}
          <button
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: isListening
                ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: '4px solid #ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '34px',
              cursor: 'pointer',
              boxShadow: isListening
                ? '0 0 0 12px rgba(239, 68, 68, 0.25), 0 10px 25px rgba(239, 68, 68, 0.4)'
                : '0 8px 20px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.2s ease',
              marginTop: '8px'
            }}
          >
            {isListening ? '⏹️' : '🎙️'}
          </button>

          <span style={{ fontSize: '12px', fontWeight: '800', color: isListening ? '#dc2626' : '#059669' }}>
            {isListening ? '● শুনছি... থামতে বাটনে চাপুন' : 'শুরু করতে বাটনে চাপুন'}
          </span>

          {/* Live Transcript / Result Box */}
          <div style={{
            width: '100%',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px',
            minHeight: '60px',
            boxSizing: 'border-box'
          }}>
            {liveTranscript ? (
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block', marginBottom: '2px' }}>লাইভ শোনা যাচ্ছে:</span>
                <strong style={{ fontSize: '15px', color: '#0f172a' }}>{liveTranscript}</strong>
              </div>
            ) : feedback ? (
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: feedback.startsWith('✓') ? '#059669' : '#334155' }}>
                {feedback}
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                পরিষ্কার বাংলায় খরচের বিবরণ ও টাকার অংক বলুন...
              </span>
            )}
          </div>

          {/* Sample Voice Hints */}
          <div style={{ width: '100%' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>
              💡 যেভাবে সহজে বলবেন (ক্লিক করে সরাসরি টেস্ট করুন):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                'চা নাস্তা ৬০ টাকা',
                'দোকান ভাড়া ৫০০০ টাকা',
                'বিদ্যুৎ বিল ১২০০ টাকা',
                'কর্মচারী বেতন ৮০০০ টাকা',
                'মালামাল পরিবহন ভাড়া ২৫০ টাকা',
                'দোকান মেরামত ৫০০ টাকা'
              ].map((hint, idx) => (
                <button
                  key={idx}
                  onClick={() => handleProcessExpense(hint)}
                  disabled={submitting}
                  style={{
                    textAlign: 'left',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12.5px',
                    color: '#991b1b',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>🗣️ "{hint}"</span>
                  <span style={{ fontSize: '11px', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                    এন্ট্রি করুন ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '800',
              color: '#334155',
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
