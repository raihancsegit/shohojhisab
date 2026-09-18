'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { cleanSpokenBengali, isEchoedTTSResponse, extractTranscriptFromEvent } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';
import { getIndustryVoiceConfig } from '../lib/industryConfig';
import { executeOfflineAiShopCommand } from '../lib/offlineAiEngine';
import { verifyCurrentVoice, pingVoiceVerification, isSpeakerLockEnabled, ensureBiometricMonitoring } from '../lib/speakerProfileEngine';
import { voiceProximityManager } from '../lib/voiceProximityGate';

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
  const [showTypeInput, setShowTypeInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isOnline, setIsOnline] = useState(true);

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

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const autoDismissTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
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

  const resetInactivityWatchdog = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !latestTranscriptRef.current.trim()) {
        cancelVoice();
      }
    }, 14000);
  };

  const spawnRecognitionInstance = () => {
    if (!isListeningRef.current || isProcessing) return;
    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SpeechRecognition) return;

    // Clean up any previous recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      // On mobile Android, continuous MUST be false so native SpeechRecognizer returns events!
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (isListeningRef.current) {
          setIsListening(true);
        }
      };

      recognition.onresult = (event: any) => {
        const { fullTranscript, isFinal } = extractTranscriptFromEvent(event);
        if (!fullTranscript) return;

        resetInactivityWatchdog();
        latestTranscriptRef.current = fullTranscript;
        setLiveTranscript(fullTranscript);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const waitMs = isFinal ? (isMobile ? 450 : 400) : (isMobile ? 1100 : 800);
        silenceTimerRef.current = setTimeout(() => {
          if (latestTranscriptRef.current.trim()) {
            stopAndExecute(latestTranscriptRef.current.trim());
          }
        }, waitMs);
      };

      recognition.onerror = (err: any) => {
        console.warn('[VoiceAssistant] Recognition error:', err.error);
        if (err.error === 'not-allowed') {
          setFeedbackType('error');
          setFeedbackText('মাইক্রোফোন পারমিশন বন্ধ আছে। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
          stopListeningOnly();
          return;
        }
        if (err.error === 'audio-capture') {
          setFeedbackType('error');
          setFeedbackText('মাইক্রোফোন চালু করা যায়নি। অন্য অ্যাপের মাইক বন্ধ করুন।');
          stopListeningOnly();
          return;
        }
        if (err.error === 'network') {
          if (latestTranscriptRef.current.trim()) {
            stopAndExecute(latestTranscriptRef.current.trim());
            return;
          }
          setFeedbackType('listening');
          setFeedbackText('ভয়েস নেটওয়ার্ক ড্রপ করেছে। আবার বলুন বা লিখুন।');
          return;
        }
        // 'no-speech' is expected when user is thinking/pausing; onend will seamlessly restart!
      };

      recognition.onend = () => {
        // If we already have a spoken phrase and user paused
        if (latestTranscriptRef.current.trim() && isMobile) {
          if (!silenceTimerRef.current) {
            stopAndExecute(latestTranscriptRef.current.trim());
            return;
          }
        }

        // Re-spawn a FRESH instance on Android/desktop to continue listening without InvalidStateError
        if (isListeningRef.current && !isProcessing) {
          setTimeout(() => {
            if (isListeningRef.current && !isProcessing) {
              spawnRecognitionInstance();
            }
          }, 150);
        } else {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[VoiceAssistant] Start exception, retrying:', err);
      if (isListeningRef.current && !isProcessing) {
        setTimeout(() => {
          if (isListeningRef.current && !isProcessing) {
            spawnRecognitionInstance();
          }
        }, 300);
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SpeechRecognition) {
      setFeedbackType('error');
      setFeedbackText('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট নেই। Google Chrome ব্যবহার করুন।');
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
    setShowTypeInput(false);
    setManualText('');
    setFeedbackType('listening');
    setFeedbackText('');
    isListeningRef.current = true;
    setIsListening(true);
    setIsProcessing(false);

    // On mobile devices, ensure proximity monitor / Web Audio is stopped so SpeechRecognition has 100% exclusive mic access
    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        voiceProximityManager.stop();
      } catch (e) {}
    } else {
      ensureBiometricMonitoring().catch(() => {});
    }

    resetInactivityWatchdog();
    spawnRecognitionInstance();
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

    // On mobile devices, bypass desktop acoustic centroid check so SpeechRecognition always executes!
    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const tenantKey = tenant?.id || 'default';
    if (!isMobile && isSpeakerLockEnabled(tenantKey)) {
      const speakerCheck = verifyCurrentVoice(tenantKey);
      if (!speakerCheck.isAuthorized) {
        triggerHaptic?.('warning');
        playWarningSound();
        setFeedbackType('error');
        if (speakerCheck.reason === 'background_noise_or_tv') {
          setFeedbackText('🛡️ ল্যাপটপ / টিভির সাউন্ড ফিল্টার হয়েছে (বাতিল)');
        } else {
          setFeedbackText('🛡️ অননুমোদিত ব্যক্তির কণ্ঠ ফিল্টার হয়েছে (শুধু মালিকের কণ্ঠ)');
        }
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 3500);
        return;
      }
    }

    setLastSpoken(query);
    setIsProcessing(true);
    setFeedbackType('processing');
    setFeedbackText(`"${query}" প্রসেস হচ্ছে...`);
    triggerHaptic?.('medium');

    try {
      const savedAssistantName = typeof window !== 'undefined' ? localStorage.getItem('lbos_assistant_name') || 'সহজহিসাব' : 'সহজহিসাব';
      const effectiveTenantId = tenant?.id || (() => {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('lbos_active_tenant') : null;
          if (raw) return JSON.parse(raw)?.id;
        } catch (e) {}
        return 'tenant-1';
      })();

      let data: any = null;
      try {
        const res = await fetch('/api/voice-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: effectiveTenantId, text: query, assistantName: savedAssistantName })
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.log('[VoiceAssistant] Running offline fallback AI command...');
      }

      // Offline Engine Fallback if server failed or offline
      if (!data || !data.success) {
        data = executeOfflineAiShopCommand(effectiveTenantId, query, savedAssistantName);
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
    { label: '📊 আজকের বিক্রি ও লাভ', cmd: 'আজকের বিক্রি ও লাভ কত' },
    { label: '📦 মোট স্টক কত?', cmd: 'আজকের স্টক কত' },
    { label: '🛒 POS কাউন্টার', cmd: 'পস পেজে যাও' },
    { label: '📖 বাকির খাতা', cmd: 'খাতায় যাও' },
    { label: '📖 বাজারে বাকি কত?', cmd: 'বাজারে মোট বাকি কত' },
    { label: '➕ নাপা ৫০ পাতা স্টক', cmd: 'নাপা ৫০ পাতা স্টক যোগ করো' },
    { label: '☕ চা নাস্তা ৬০ টাকা খরচ', cmd: 'চা নাস্তা ৬০ টাকা খরচ লেখো' },
    { label: '📊 সম্পূর্ণ রিপোর্ট', cmd: 'রিপোর্ট পেজে যাও' }
  ];

  if (!isSupported || pathname === '/login') return null;

  return (
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
          padding: '12px 16px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '700',
          maxWidth: '340px',
          width: 'calc(100vw - 40px)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>
                {feedbackType === 'listening' ? '🎙️' : feedbackType === 'processing' ? '⚡' : feedbackType === 'success' ? '✅' : '⚠️'}
              </span>
              <span style={{ fontSize: '13px' }}>
                {feedbackText || (isListening ? 'শুনছি... মুখে বলুন' : '')}
              </span>
            </div>
            <button
              onClick={cancelVoice}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: 0.8,
                fontSize: '12px',
                padding: '2px 6px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Voice-First Live Heard Display (No autoFocus input = No unwanted mobile keyboard) */}
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
                    fontSize: (liveTranscript || latestTranscriptRef.current) ? '15px' : '13px',
                    color: (liveTranscript || latestTranscriptRef.current) ? '#34d399' : 'rgba(255,255,255,0.75)',
                    fontWeight: '800',
                    marginTop: '3px',
                    wordBreak: 'break-word',
                    minHeight: '22px'
                  }}>
                    {liveTranscript || latestTranscriptRef.current || 'যেমন: "২ কেজি চিনি বিক্রি" বা "ব্যবসা কেমন চলছে"'}
                  </div>
                </div>
                {(liveTranscript || latestTranscriptRef.current) && (
                  <button
                    type="button"
                    onClick={() => stopAndExecute(liveTranscript || latestTranscriptRef.current)}
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

              {/* Optional Manual Typing input (NO autoFocus so keyboard never opens automatically) */}
              {showTypeInput ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = manualText.trim();
                    if (q) stopAndExecute(q);
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
            </div>
          )}

          {/* Quick Action Chips ONLY when offline */}
          {feedbackType === 'listening' && !isOnline && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '5px',
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div style={{ width: '100%', fontSize: '10.5px', color: '#93c5fd', fontWeight: '700' }}>
                🟢 অফলাইন কমান্ডের তালিকা:
              </div>
              {quickOfflineChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => stopAndExecute(chip.cmd)}
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
  );
}
