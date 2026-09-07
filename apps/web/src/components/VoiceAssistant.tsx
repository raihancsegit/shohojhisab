'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getIndustryVoiceConfig } from '../lib/industryConfig';
import { extractTranscriptFromEvent, cleanSpokenBengali, isEchoedTTSResponse } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';

export default function VoiceAssistant() {
  const { tenant, userRole, triggerHaptic, speakAnnouncement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
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
      if (!isListeningRef.current) {
        handleStartListening();
      }
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => window.removeEventListener('trigger-voice-assistant', handleTrigger);
  }, []);

  const stopAndProcess = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    setIsListening(false);
    playMicStopSound();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const finalSpoken = latestTranscriptRef.current.trim();
    if (finalSpoken) {
      processUniversalVoiceCommand(finalSpoken);
    } else {
      playWarningSound();
      setFeedback('কোনো কথা শোনা যায়নি। আবার বলুন।');
      setTimeout(() => setFeedback(''), 3500);
    }
  };

  const handleStartListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে বাংলা স্পিচ রিকগনিশন সাপোর্ট করে না। Google Chrome ব্যবহার করুন।');
      return;
    }

    // Cancel active TTS output so microphone doesn't transcribe speaker audio
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    triggerHaptic('medium');
    playMicStartSound();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    latestTranscriptRef.current = '';
    setLiveTranscript('');
    setFeedback('🎙️ শুনছি... পরিষ্কার বাংলায় বলুন');
    isListeningRef.current = true;
    setIsListening(true);

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

        // Reset and start 1.3-second smart silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && latestTranscriptRef.current.trim()) {
            stopAndProcess();
          }
        }, 1300);
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech') return; // Ignore silent pause, keep listening
        console.warn('Speech error:', err.error);
      };

      recognition.onend = () => {
        // If still listening and disconnected unexpectedly by browser, auto-resume
        if (isListeningRef.current) {
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

  const handleCancelListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
    setLiveTranscript('');
    setFeedback('');
  };

  const processUniversalVoiceCommand = async (rawText: string) => {
    if (!rawText || !tenant?.id) return;
    const currentTenantId = tenant.id;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setFeedback(`শোনা গেছে: "${rawText}"`);

    try {
      const res = await fetch('/api/voice-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenantId, text: rawText })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          playSuccessChime();
          setFeedback(`✓ ${result.speech}`);
          triggerHaptic('success');

          if (result.speech) {
            speakAnnouncement(result.speech);
          }

          // Trigger live refresh event across active pages
          window.dispatchEvent(new CustomEvent('voice-action-success', { detail: result }));

          if (result.action === 'add_to_cart') {
            if (pathname !== '/pos') {
              router.push('/pos');
            }
            window.dispatchEvent(new CustomEvent('voice-add-to-cart', { detail: result.data }));
          }

          if (result.action === 'multi_items_add') {
            if (pathname !== '/pos') {
              router.push('/pos');
            }
            window.dispatchEvent(new CustomEvent('voice-multi-items-add', { detail: result.data }));
          }

          if (result.action === 'checkout_cash') {
            window.dispatchEvent(new CustomEvent('voice-checkout-cash', { detail: result.data }));
          }

          if (result.navigateTo) {
            router.push(result.navigateTo);
          }

          if (result.action === 'trigger_print') {
            window.dispatchEvent(new CustomEvent('voice-trigger-print'));
            setTimeout(() => window.print(), 600);
          }

          setTimeout(() => {
            setFeedback('');
          }, 4000);
          return;
        } else {
          playWarningSound();
          setFeedback(result.speech || 'কথাটি বুঝতে পারিনি। আবার চেষ্টা করুন।');
          setTimeout(() => setFeedback(''), 4000);
          return;
        }
      }
    } catch (e) {
      console.error('Voice action error:', e);
    }

    // POS Navigation fallback if user said buy items across ANY shop type
    if (/নাপা|ঔষধ|ট্যাবলেট|সিরাপ|ব্যান্ডেজ|ওরস্যালাইন|চিনি|ডাল|তেল|সাবান|সিগারেট|চাল|মেমো|বিক্রি|পাঞ্জাবি|শার্ট|প্যান্ট|লুঙ্গি|টি-শার্ট|পাইপ|বাল্ব|ট্যাপ|কলা|পরোটা|চা|আড্ডা|খাতা/i.test(rawText) && pathname !== '/pos') {
      triggerHaptic('medium');
      setFeedback(`✓ পিওএস কাউন্টারে যাচ্ছি: "${rawText}"`);
      router.push(`/pos?voiceQuery=${encodeURIComponent(rawText)}`);
      setTimeout(() => setFeedback(''), 3000);
      return;
    }

    setFeedback(`শোনা গেছে: "${rawText}"`);
    setTimeout(() => setFeedback(''), 3000);
  };

  if (!isSupported || userRole === 'admin' || pathname === '/login') return null;

  return (
    <>
      {/* Floating Smart Voice Button (Carefully positioned above the bottom dock) */}
      <div style={{
        position: 'fixed',
        bottom: pathname === '/pos' ? '180px' : '76px',
        right: '14px',
        zIndex: 55,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
        transition: 'bottom 0.2s ease'
      }}>
        {feedback && (
          <div style={{
            background: '#0f172a',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '11.5px',
            fontWeight: '700',
            maxWidth: '240px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            border: '1.5px solid #334155',
            lineHeight: 1.4,
            animation: 'fadeIn 0.2s ease'
          }}>
            {feedback}
          </div>
        )}

        <button
          onClick={isListening ? stopAndProcess : handleStartListening}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isListening
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #5b50e6 0%, #4338ca 100%)',
            color: '#ffffff',
            border: '2px solid #ffffff',
            display: 'grid',
            placeItems: 'center',
            fontSize: '22px',
            cursor: 'pointer',
            boxShadow: isListening
              ? '0 0 0 8px rgba(239, 68, 68, 0.35), 0 6px 16px rgba(239, 68, 68, 0.5)'
              : '0 6px 18px rgba(91, 80, 230, 0.4)',
            transition: 'all 0.2s ease'
          }}
          className="clickable-card"
          title="মুখে বলে বাকি লেখা, টাকা জমা বা বিক্রি করতে চাপুন"
        >
          {isListening ? '⏹️' : '🎙️'}
        </button>
      </div>

      {/* Voice Assistant Visualizer Modal while Listening */}
      {isListening && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '28px',
            padding: '32px 24px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Pulsating Voice Mic Animation */}
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              color: '#dc2626',
              display: 'inline-grid',
              placeItems: 'center',
              fontSize: '42px',
              marginBottom: '16px',
              boxShadow: '0 0 0 12px rgba(239, 68, 68, 0.2)',
              animation: 'pulse 1.5s infinite'
            }}>
              🎙️
            </div>

            <h3 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
              পরিষ্কার বাংলায় কথা বলুন...
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b' }}>
              থামালে সফটওয়্যার স্বয়ংক্রিয়ভাবে হিসাব সম্পন্ন করবে
            </p>

            {/* Real-Time Live Transcript Subtitle Display */}
            <div style={{
              minHeight: '70px',
              background: liveTranscript ? '#ecfdf5' : '#f8fafc',
              border: liveTranscript ? '2px solid #10b981' : '1.5px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              {liveTranscript ? (
                <span style={{ fontSize: '17px', fontWeight: '800', color: '#065f46', lineHeight: 1.4 }}>
                  "{liveTranscript}"
                </span>
              ) : (
                <span style={{ fontSize: '13.5px', color: '#94a3b8', fontWeight: '700' }}>
                  🔊 কথা শুনছি... (যেমন: "স্বপন ভাই ৫০ টাকা বাকি নিল")
                </span>
              )}
            </div>

            {/* Action Buttons: Finish Now / Cancel */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={stopAndProcess}
                style={{
                  flex: 2,
                  background: liveTranscript ? '#10b981' : '#0f172a',
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
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}
              >
                <span>✓</span>
                <span>{liveTranscript ? 'হিসাব সম্পন্ন করুন' : 'কথা শেষ করুন'}</span>
              </button>

              <button
                type="button"
                onClick={handleCancelListening}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                বাতিল
              </button>
            </div>

            {/* Bangla Voice Suggestions */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11.5px',
              color: '#334155'
            }}>
              <span style={{ fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                💡 মুখে বলুন অথবা ট্যাপ করুন:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '2px' }}>
                {getIndustryVoiceConfig(tenant?.industryId).assistantSuggestions.map((eg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                      isListeningRef.current = false;
                      setIsListening(false);
                      if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch (e) {}
                      }
                      processUniversalVoiceCommand(eg);
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#1e293b',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    💬 {eg}
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
