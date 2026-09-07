'use client';
import React, { useState, useEffect, useRef } from 'react';
import { playVoiceBeep, parseBanglaNumber, VoiceFieldOptions } from '../lib/voiceFieldUtils';

export default function VoiceFieldHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<VoiceFieldOptions | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('কথা বলুন, শুনছি...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    const handleOpenHUD = (e: CustomEvent<VoiceFieldOptions>) => {
      const opts = e.detail;
      if (!opts || !opts.onResult) return;
      setCurrentOptions(opts);
      setLiveTranscript('');
      setErrorMessage('');
      setIsSuccess(false);
      setStatusMessage(opts.isNumeric ? 'টাকার অংক বা সংখ্যা মুখে বলুন...' : 'যা লিখতে চান মুখে বলুন...');
      setIsOpen(true);
      startListening(opts);
    };

    window.addEventListener('open-voice-field-hud' as any, handleOpenHUD as any);
    return () => {
      window.removeEventListener('open-voice-field-hud' as any, handleOpenHUD as any);
      stopListening();
    };
  }, []);

  const startListening = (opts: VoiceFieldOptions) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। দয়া করে গুগল ক্রোম ব্যবহার করুন।');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const rec = new SpeechRecognition();
      rec.lang = 'bn-BD';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;

      playVoiceBeep(880, 'sine', 0.12);
      setIsListening(true);
      setErrorMessage('');

      rec.onstart = () => {
        setIsListening(true);
        setStatusMessage(opts.isNumeric ? '🎙️ টাকার অংক বা সংখ্যা বলুন (শুনছি...)' : '🎙️ কথা বলুন (শুনছি...)');
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          setLiveTranscript(spoken);

          // Reset silence timer on new words
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            handleComplete(spoken, opts);
          }, 1400);
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Voice recognition error:', e.error);
        if (e.error === 'no-speech') {
          setStatusMessage('কোনো কথা শোনা যায়নি। মাইক্রোফোনের কাছে এসে আবার বলুন...');
        } else if (e.error === 'not-allowed') {
          setErrorMessage('মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
          setIsListening(false);
        } else {
          setStatusMessage('পুনরায় শুনছি... কথা বলুন');
        }
      };

      rec.onend = () => {
        if (isListening && !isSuccess) {
          // If ended without final, keep or restart
          setIsListening(false);
        }
      };

      rec.start();
    } catch (e: any) {
      console.error('Failed to start recognition:', e);
      setErrorMessage('ভয়েস সার্ভিস চালু করা যায়নি। আবার চেষ্টা করুন।');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleComplete = (textToUse?: string, optsToUse?: VoiceFieldOptions | null) => {
    const opts = optsToUse || currentOptions;
    const raw = textToUse || liveTranscript;
    if (!opts || !raw) {
      closeHUD();
      return;
    }

    stopListening();
    setIsSuccess(true);
    playVoiceBeep(1200, 'triangle', 0.18);

    let processed = raw.trim();
    if (opts.isNumeric) {
      processed = parseBanglaNumber(processed);
    }

    // Call recipient setter
    opts.onResult(processed);

    setTimeout(() => {
      closeHUD();
    }, 600);
  };

  const handleRetry = () => {
    if (!currentOptions) return;
    setLiveTranscript('');
    setIsSuccess(false);
    setErrorMessage('');
    startListening(currentOptions);
  };

  const closeHUD = () => {
    stopListening();
    setIsOpen(false);
    setCurrentOptions(null);
    setLiveTranscript('');
    setIsSuccess(false);
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={closeHUD}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '460px',
          borderRadius: '28px',
          padding: '24px 20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: isSuccess ? '2px solid #22c55e' : '2px solid #6366f1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={closeHUD}
          style={{
            position: 'absolute',
            top: '14px',
            right: '16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '800',
            color: '#64748b'
          }}
        >
          ✕
        </button>

        {/* Target Field Header Badge */}
        <div
          style={{
            background: isSuccess ? '#dcfce7' : '#eef2ff',
            color: isSuccess ? '#15803d' : '#4338ca',
            padding: '4px 14px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: '800',
            marginBottom: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>{currentOptions?.label ? `📝 ${currentOptions.label}` : '🎙️ ভয়েস ইনপুট'}</span>
          {currentOptions?.isNumeric && <span>(সংখ্যা / টাকা)</span>}
        </div>

        {/* Animated Microphone Pulse & Live Waveform */}
        <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '14px' }}>
          {isListening && (
            <div
              style={{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                animation: 'voicePulse 1.4s infinite'
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: isSuccess ? '#22c55e' : isListening ? '#ef4444' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: '#fff',
              boxShadow: isListening ? '0 10px 25px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {isSuccess ? '✓' : '🎙️'}
          </div>
        </div>

        {/* Live Audio Waveform Bars (Active Visual Cue) */}
        {isListening && (
          <div style={{ display: 'flex', gap: '4px', height: '24px', alignItems: 'center', marginBottom: '12px' }}>
            {[14, 22, 10, 24, 18, 24, 12, 20].map((h, i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: `${h}px`,
                  background: '#ef4444',
                  borderRadius: '99px',
                  animation: `waveform 0.6s ease-in-out infinite alternate ${i * 0.08}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Status Text */}
        <strong
          style={{
            fontSize: '15px',
            color: isSuccess ? '#15803d' : '#0f172a',
            fontWeight: '800',
            marginBottom: '6px'
          }}
        >
          {isSuccess ? '✓ সফলভাবে গ্রহণ করা হয়েছে!' : statusMessage}
        </strong>

        {/* Live Spoken Text Preview Box */}
        <div
          style={{
            width: '100%',
            minHeight: '54px',
            background: isSuccess ? '#f0fdf4' : '#f8fafc',
            border: isSuccess ? '1.5px solid #86efac' : '1.5px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '800',
            color: liveTranscript ? (isSuccess ? '#15803d' : '#0f172a') : '#94a3b8',
            marginBottom: '16px',
            boxSizing: 'border-box'
          }}
        >
          {liveTranscript ? (
            <span>
              &ldquo;{liveTranscript}&rdquo;
              {currentOptions?.isNumeric && (
                <span style={{ display: 'block', fontSize: '13px', color: '#059669', marginTop: '2px' }}>
                  ➔ সংখ্যা: {parseBanglaNumber(liveTranscript)}
                </span>
              )}
            </span>
          ) : (
            <span style={{ fontSize: '13.5px', fontWeight: '600' }}>
              (মুখে কথা বললেই এখানে স্বয়ংক্রিয়ভাবে লেখা উঠবে...)
            </span>
          )}
        </div>

        {/* Error Notification if any */}
        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '12px',
              width: '100%'
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Action Buttons: Done / Retry / Cancel */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {isListening ? (
            <button
              type="button"
              onClick={() => handleComplete()}
              disabled={!liveTranscript}
              style={{
                flex: 2,
                background: liveTranscript ? '#10b981' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: liveTranscript ? 'pointer' : 'not-allowed',
                boxShadow: liveTranscript ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              ✓ সম্পন্ন করুন
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetry}
              style={{
                flex: 2,
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                padding: '12px',
                borderRadius: '14px',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🔄 আবার বলুন
            </button>
          )}

          <button
            type="button"
            onClick={closeHUD}
            style={{
              flex: 1,
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              padding: '12px',
              borderRadius: '14px',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            বাতিল
          </button>
        </div>
      </div>
    </div>
  );
}
