'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { getIndustryVoiceConfig } from '../lib/industryConfig';
import { extractTranscriptFromEvent, cleanSpokenBengali, isEchoedTTSResponse } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';

export default function VoiceAssistant() {
  const { tenant, userRole, triggerHaptic, speakAnnouncement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastSpoken, setLastSpoken] = useState('');
  const [actionResult, setActionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    const handleTrigger = () => {
      openAssistantAndListen();
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => window.removeEventListener('trigger-voice-assistant', handleTrigger);
  }, []);

  const openAssistantAndListen = () => {
    setIsOpen(true);
    setActionResult(null);
    setErrorMessage('');
    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setTimeout(() => {
      startListening();
    }, 150);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('আপনার ব্রাউজারে বাংলা স্পিচ সাপোর্ট নেই। Google Chrome ব্যবহার করুন।');
      return;
    }

    // Stop active TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    triggerHaptic('medium');
    playMicStartSound();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestTranscriptRef.current = '';
    setLiveTranscript('');
    setErrorMessage('');
    setActionResult(null);
    isListeningRef.current = true;
    setIsListening(true);
    setIsProcessing(false);

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
        if (!fullTranscript || isEchoedTTSResponse(fullTranscript)) return;

        latestTranscriptRef.current = fullTranscript;
        setLiveTranscript(fullTranscript);

        // Auto-complete after 1.2s silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && latestTranscriptRef.current.trim()) {
            stopAndExecute(latestTranscriptRef.current.trim());
          }
        }, 1200);
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech') return;
        if (err.error === 'not-allowed') {
          setErrorMessage('মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
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
    }
  };

  const stopListeningOnly = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
    const query = cleanSpokenBengali(spokenText || latestTranscriptRef.current || liveTranscript);
    if (!query || isEchoedTTSResponse(query)) {
      setErrorMessage('কোনো স্পষ্ট কথা শোনা যায়নি। আবার বলুন।');
      return;
    }

    setLastSpoken(query);
    setIsProcessing(true);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/voice-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant?.id || 'tenant-1', text: query })
      });

      if (res.ok) {
        const data = await res.json();
        setIsProcessing(false);
        setActionResult(data);

        if (data.success) {
          playSuccessChime();
          triggerHaptic('success');

          if (data.speech) {
            speakAnnouncement(data.speech);
          }

          // Trigger live refresh event across active pages
          window.dispatchEvent(new CustomEvent('voice-action-success', { detail: data }));

          if (data.navigateTo) {
            router.push(data.navigateTo);
          }

          if (data.action === 'trigger_print') {
            window.dispatchEvent(new CustomEvent('voice-trigger-print'));
            setTimeout(() => window.print(), 600);
          }
        } else {
          playWarningSound();
          setErrorMessage(data.speech || 'কথাটি বুঝতে পারিনি। আবার চেষ্টা করুন।');
        }
      } else {
        setIsProcessing(false);
        playWarningSound();
        setErrorMessage('সার্ভার থেকে রেসপন্স পাওয়া যায়নি।');
      }
    } catch (err) {
      setIsProcessing(false);
      playWarningSound();
      setErrorMessage('সার্ভার সংযোগে ত্রুটি। ইন্টারনেট বা নেটওয়ার্ক চেক করুন।');
    }
  };

  const closeAssistant = () => {
    stopListeningOnly();
    setIsOpen(false);
    setActionResult(null);
    setErrorMessage('');
    setLiveTranscript('');
  };

  if (!isSupported || userRole === 'admin' || pathname === '/login') return null;

  return (
    <>
      {/* Floating Smart AI Assistant Button */}
      <div style={{
        position: 'fixed',
        bottom: pathname === '/pos' ? '180px' : '76px',
        right: '14px',
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={openAssistantAndListen}
          style={{
            height: '46px',
            padding: '0 16px 0 12px',
            borderRadius: '99px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13.5px',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.4)',
            transition: 'all 0.2s ease'
          }}
          className="shimmer-btn"
          title="এআই সহকারী — মুখে বলে যেকোনো কাজ করাতে চাপুন"
        >
          <span style={{ fontSize: '18px', animation: 'spin 4s linear infinite' }}>🤖</span>
          <span>এআই সহকারী</span>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '99px',
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: '800'
          }}>
            🎙️ বলুন
          </span>
        </button>
      </div>

      {/* Full AI Assistant Interactive Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(10px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '28px 22px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.45)',
            border: '1.5px solid rgba(255,255,255,0.8)',
            animation: 'fadeIn 0.2s ease-out',
            position: 'relative'
          }}>
            
            {/* Close Cross */}
            <button
              onClick={closeAssistant}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: '14px'
              }}
            >
              ✕
            </button>

            {/* Glowing AI Voice Pulse Orb */}
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              margin: '0 auto 16px',
              background: isListening
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : isProcessing
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : actionResult?.success
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '40px',
              boxShadow: isListening
                ? '0 0 0 14px rgba(239, 68, 68, 0.25), 0 0 35px rgba(239, 68, 68, 0.4)'
                : '0 0 0 8px rgba(99, 102, 241, 0.2)',
              animation: isListening ? 'pulse 1.4s infinite' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {isListening ? '🎙️' : isProcessing ? '⏳' : actionResult?.success ? '✓' : '🤖'}
            </div>

            {/* Assistant Name Badge & Customizer */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#e0e7ff',
              color: '#4338ca',
              padding: '4px 12px',
              borderRadius: '99px',
              fontSize: '12px',
              fontWeight: '800',
              marginBottom: '12px'
            }}>
              <span>🤖 সহকারীর নাম:</span>
              <input
                type="text"
                defaultValue={typeof window !== 'undefined' ? localStorage.getItem('lbos_assistant_name') || 'সহজহিসাব' : 'সহজহিসাব'}
                onChange={(e) => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('lbos_assistant_name', e.target.value.trim() || 'সহজহিসাব');
                  }
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #c7d2fe',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  fontSize: '12px',
                  fontWeight: '800',
                  color: '#3730a3',
                  width: '80px',
                  textAlign: 'center'
                }}
                title="এআই সহকারীর নাম পরিবর্তন করুন"
              />
              <span style={{ fontSize: '10px', color: '#6366f1' }}>✎ ডাকনাম</span>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px' }}>
              {isListening
                ? 'পরিষ্কার বাংলায় বলুন, কাজ হয়ে যাবে...'
                : isProcessing
                ? 'এআই হিসাব প্রসেস করছে...'
                : actionResult?.success
                ? 'কাজ সম্পন্ন হয়েছে!'
                : 'এআই সহকারী প্রস্তুত'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              {isListening
                ? 'বাকি লেখা, টাকা জমা, স্টক বাড়ানো বা বিক্রি জানতে কথা বলুন'
                : 'মুখে বলুন অথবা নিচে ক্লিক করে নির্দেশ দিন'}
            </p>

            {/* Real-time Subtitle / Spoken Transcript */}
            <div style={{
              minHeight: '68px',
              background: liveTranscript ? '#f0fdf4' : '#f8fafc',
              border: liveTranscript ? '2px solid #22c55e' : '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              {liveTranscript ? (
                <span style={{ fontSize: '16.5px', fontWeight: '800', color: '#15803d', lineHeight: 1.4 }}>
                  "{liveTranscript}"
                </span>
              ) : isListening ? (
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                  🔊 আপনার কথা শুনছি... (যেমন: "আজকের স্টক কত" বা "রিয়ানের ২০ টাকা বাকি")
                </span>
              ) : lastSpoken ? (
                <span style={{ fontSize: '14px', color: '#475569', fontWeight: '700' }}>
                  শোনা গেছে: "{lastSpoken}"
                </span>
              ) : (
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  মাইক চালু করতে নিচের "শুনুন" বাটনে চাপুন
                </span>
              )}
            </div>

            {/* AI Action Result Success Box */}
            {actionResult?.success && (
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '16px',
                animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {actionResult.reply || actionResult.speech}
                </div>

                {actionResult.actionLink && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <Link
                      href={actionResult.actionLink.href}
                      onClick={closeAssistant}
                      style={{
                        background: '#6366f1',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        textDecoration: 'none',
                        display: 'inline-block'
                      }}
                    >
                      {actionResult.actionLink.text}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Error Message Box */}
            {errorMessage && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                padding: '12px',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: '700',
                marginBottom: '16px'
              }}>
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              {isListening ? (
                <button
                  type="button"
                  onClick={() => stopAndExecute()}
                  style={{
                    flex: 1,
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '14px',
                    fontWeight: '900',
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  ✓ কথা শেষ (হিসাব সম্পন্ন করুন)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startListening}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '14px',
                    fontWeight: '900',
                    fontSize: '14.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                  }}
                >
                  <span>🎙️</span>
                  <span>{actionResult ? 'আরও কিছু বলুন' : 'কথা বলা শুরু করুন'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeAssistant}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                বন্ধ
              </button>
            </div>

            {/* Fast Suggestion Chips */}
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#64748b' }}>
                💡 মুখে বলুন অথবা ট্যাপ করুন:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {[
                  '📦 আজকের স্টক কত?',
                  '📊 আজকের বিক্রি কত?',
                  '➕ নাপা ৫০ পাতা স্টক যোগ করো',
                  '📖 রিয়ানের ২০ টাকা বাকি',
                  '💵 রিয়ান ২০ টাকা জমা দিল',
                  '☕ চা নাস্তা ৬০ টাকা খরচ লেখো',
                  '⚠️ কোন কোন মালের স্টক কম?',
                  '📖 বাজারে মোট বাকি কত?'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      stopListeningOnly();
                      stopAndExecute(chip.replace(/^[^\s]+\s+/, ''));
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
