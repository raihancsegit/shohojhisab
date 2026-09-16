'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { cleanSpokenBengali, isEchoedTTSResponse } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';
import { getIndustryVoiceConfig } from '../lib/industryConfig';
import { executeOfflineAiShopCommand } from '../lib/offlineAiEngine';

export default function VoiceAssistant() {
  const { tenant, userRole, triggerHaptic, speakAnnouncement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const voiceConfig = getIndustryVoiceConfig(tenant?.industryId || (tenant as any)?.industry_category_id);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastSpoken, setLastSpoken] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState<'listening' | 'processing' | 'success' | 'error' | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const autoDismissTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    const handleTrigger = () => {
      startListening();
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => {
      window.removeEventListener('trigger-voice-assistant', handleTrigger);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedbackType('error');
      setFeedbackText('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট নেই। Chrome ব্যবহার করুন।');
      return;
    }

    // Stop any active speech and reset TTS locks
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      (window as any).__IS_TTS_SPEAKING__ = false;
      (window as any).__LAST_TTS_TEXT__ = '';
    }

    triggerHaptic?.('medium');
    playMicStartSound();

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    latestTranscriptRef.current = '';
    setLiveTranscript('');
    setFeedbackType('listening');
    setFeedbackText('');
    isListeningRef.current = true;
    setIsListening(true);
    setIsProcessing(false);

    // Auto dismiss after 10s if nothing is spoken
    inactivityTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !latestTranscriptRef.current.trim()) {
        cancelVoice();
      }
    }, 10000);

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0] && item[0].transcript) {
            full += (full ? ' ' : '') + item[0].transcript;
          }
        }
        const cleaned = cleanSpokenBengali(full);
        if (!cleaned) return;

        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        latestTranscriptRef.current = cleaned;
        setLiveTranscript(cleaned);

        // Auto-complete after 700ms silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (latestTranscriptRef.current.trim()) {
            stopAndExecute(latestTranscriptRef.current.trim());
          }
        }, 700);
      };

      recognition.onerror = (err: any) => {
        console.warn('Voice recognition error:', err.error);
        if (err.error === 'not-allowed') {
          setFeedbackType('error');
          setFeedbackText('মাইক্রোফোন পারমিশন বন্ধ আছে। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
          setIsListening(false);
          isListeningRef.current = false;
        } else if (err.error === 'network' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          setFeedbackType('listening');
          setFeedbackText('🟢 অফলাইন মোড: নিচের বাটনে ট্যাপ করুন');
          setIsListening(false);
          isListeningRef.current = false;
        } else if (err.error !== 'no-speech') {
          if (latestTranscriptRef.current.trim()) {
            stopAndExecute(latestTranscriptRef.current.trim());
          }
        }
      };

      recognition.onend = () => {
        if (latestTranscriptRef.current.trim()) {
          stopAndExecute(latestTranscriptRef.current.trim());
          return;
        }

        if (isListeningRef.current && !isProcessing) {
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
      isListeningRef.current = false;
      setFeedbackType('listening');
      setFeedbackText('🟢 অফলাইন মোড: নিচের কুইক-কমান্ড ট্যাপ করুন');
    }
  };

  const stopListeningOnly = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    isListeningRef.current = false;
    setIsListening(false);
    playMicStopSound();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const stopAndExecute = async (spokenText?: string) => {
    stopListeningOnly();
    const raw = spokenText || latestTranscriptRef.current || liveTranscript;
    const query = cleanSpokenBengali(raw);
    if (!query) {
      setFeedbackType('error');
      setFeedbackText('কথা বোঝা যায়নি, আবার বলুন।');
      autoDismissTimerRef.current = setTimeout(() => {
        setFeedbackType(null);
      }, 3000);
      return;
    }

    setLastSpoken(query);
    setIsProcessing(true);
    setFeedbackType('processing');
    setFeedbackText(`"${query}" প্রসেস হচ্ছে...`);
    triggerHaptic?.('medium');

    try {
      const savedAssistantName = typeof window !== 'undefined' ? localStorage.getItem('lbos_assistant_name') || 'সহজহিসাব' : 'সহজহিসাব';
      let data: any = null;
      try {
        const res = await fetch('/api/voice-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: tenant?.id || 'tenant-1', text: query, assistantName: savedAssistantName })
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.log('[VoiceAssistant] Running offline fallback AI command...');
      }

      // Offline Engine Fallback
      if (!data) {
        data = executeOfflineAiShopCommand(tenant?.id || 'tenant-1', query, savedAssistantName);
      }

      setIsProcessing(false);

      if (data && data.success) {
        playSuccessChime();
        triggerHaptic?.('success');
        setFeedbackType('success');
        setFeedbackText((data.speech || 'কাজ সম্পন্ন হয়েছে।') + (data.isOffline ? ' (🟢 অফলাইন)' : ''));

        // Trigger live refresh event across active pages
        window.dispatchEvent(new CustomEvent('voice-action-success', { detail: data }));

        if (data.action === 'trigger_add_stock') {
          window.dispatchEvent(new CustomEvent('voice-trigger-add-stock', { detail: data }));
        }

        // Directly speak out loud with forceSpeak = true
        if (data.speech) {
          speakAnnouncement(data.speech, undefined, true);
        }

        if (data.navigateTo) {
          if (pathname !== data.navigateTo) {
            router.push(data.navigateTo);
          }
        }

        if (data.action === 'trigger_print') {
          window.dispatchEvent(new CustomEvent('voice-trigger-print'));
          setTimeout(() => window.print(), 600);
        }

        // Auto-dismiss feedback bubble after 4.5s
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 4500);
      } else {
        playWarningSound();
        setFeedbackType('error');
        setFeedbackText(data?.reply || data?.speech || 'কমান্ড বুঝতে সমস্যা হয়েছে। আবার বলুন।');
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 4000);
      }
    } catch (err) {
      setIsProcessing(false);
      playWarningSound();
      setFeedbackType('error');
      setFeedbackText('সহকারী চালাতে সমস্যা হয়েছে।');
      autoDismissTimerRef.current = setTimeout(() => {
        setFeedbackType(null);
      }, 3500);
    }
  };

  const cancelVoice = () => {
    stopListeningOnly();
    setFeedbackType(null);
    setLiveTranscript('');
  };

  const quickOfflineChips = [
    { label: '📊 বিক্রি ও লাভ', cmd: 'আজকের বিক্রি ও লাভ কত' },
    { label: '📦 মোট স্টক', cmd: 'আজকের স্টক কত' },
    { label: '📖 বাজারে বাকি', cmd: 'বাজারে মোট বাকি কত' },
    { label: '➕ নাপা ৫০ পাতা স্টক', cmd: 'নাপা ৫০ পাতা স্টক যোগ করো' }
  ];

  if (!isSupported || userRole === 'admin' || pathname === '/login') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px'
    }}>
      {/* 🟢 Offline / Quick Action Pills */}
      {feedbackType === 'listening' && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          justifyContent: 'flex-end',
          maxWidth: '340px',
          animation: 'fadeIn 0.2s ease'
        }}>
          {quickOfflineChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => stopAndExecute(chip.cmd)}
              style={{
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                color: '#ecfdf5',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                borderRadius: '16px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* 💬 Live Transcript / Feedback Pop-up */}
      {feedbackType && (
        <div style={{
          background: feedbackType === 'error'
            ? 'linear-gradient(135deg, #991b1b, #7f1d1d)'
            : feedbackType === 'success'
              ? 'linear-gradient(135deg, #065f46, #047857)'
              : 'linear-gradient(135deg, #1e1b4b, #312e81)',
          color: '#ffffff',
          padding: '10px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '700',
          maxWidth: '320px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>
                {feedbackType === 'listening' ? '🎙️' : feedbackType === 'processing' ? '⚡' : feedbackType === 'success' ? '✅' : '⚠️'}
              </span>
              <span>
                {feedbackText || (isListening ? (liveTranscript || 'কথা বলুন...') : '')}
              </span>
            </div>
            <button
              onClick={cancelVoice}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: 0.7,
                fontSize: '11px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 📖 Direct Link to Voice Guide */}
      {feedbackType === 'listening' && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          maxWidth: '320px',
          animation: 'fadeInUp 0.15s ease'
        }}>
          <Link
            href="/voice-guide"
            onClick={cancelVoice}
            style={{
              background: 'rgba(5, 150, 105, 0.92)',
              color: '#ecfdf5',
              border: '1px solid rgba(110, 231, 183, 0.4)',
              borderRadius: '12px',
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: '700',
              textDecoration: 'none',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📖 সকল ভয়েস কমান্ড গাইড →
          </Link>
        </div>
      )}

      {/* 🎙️ Floating Smart Voice Button */}
      <button
        type="button"
        onClick={() => {
          if (isListening) {
            if (latestTranscriptRef.current) {
              stopAndExecute(latestTranscriptRef.current);
            } else {
              cancelVoice();
            }
          } else {
            startListening();
          }
        }}
        style={{
          height: '46px',
          padding: isListening ? '0 18px' : '0 16px 0 12px',
          borderRadius: '99px',
          background: isListening
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
          color: '#ffffff',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '900',
          cursor: 'pointer',
          boxShadow: isListening
            ? '0 0 20px rgba(239, 68, 68, 0.6), 0 8px 24px rgba(239, 68, 68, 0.4)'
            : '0 8px 24px rgba(79, 70, 229, 0.4)',
          transition: 'all 0.2s ease',
          transform: isListening ? 'scale(1.05)' : 'scale(1)'
        }}
        title="মুখের কথায় যেকোনো পেজে যান বা হিসাব জানুন"
      >
        <span style={{
          fontSize: '18px',
          display: 'inline-block',
          animation: isListening ? 'bounce 0.8s infinite alternate' : 'none'
        }}>
          {isListening ? '🎙️' : '🏪'}
        </span>
        <span>
          {isListening ? 'শুনছি... (থামুন)' : 'হিসাব সহকারী'}
        </span>
        {!isListening && (
          <span style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '99px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: '800'
          }}>
            🎙️ বলুন
          </span>
        )}
      </button>
    </div>
  );
}
