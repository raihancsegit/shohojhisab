'use client';
import React, { useState, useEffect, useRef } from 'react';
import { parseBanglaNumber, VoiceFieldOptions } from '../lib/voiceFieldUtils';
import { extractTranscriptFromEvent, cleanSpokenBengali, isEchoedTTSResponse } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';

export default function VoiceFieldHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<VoiceFieldOptions | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('শুনছি... মুখে বলুন');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const currentOptionsRef = useRef<VoiceFieldOptions | null>(null);
  const liveTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  useEffect(() => {
    currentOptionsRef.current = currentOptions;
  }, [currentOptions]);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    const handleOpenHUD = (e: CustomEvent<VoiceFieldOptions>) => {
      const opts = e.detail;
      if (!opts || !opts.onResult) return;
      
      // Stop TTS if speaking
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      setCurrentOptions(opts);
      currentOptionsRef.current = opts;
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      setErrorMessage('');
      setIsSuccess(false);
      setStatusMessage(opts.isNumeric ? 'টাকার পরিমাণ বা সংখ্যা মুখে বলুন...' : 'যা লিখতে চান মুখে বলুন...');
      setIsOpen(true);

      // Auto start listening immediately
      setTimeout(() => {
        startListening(opts);
      }, 100);
    };

    window.addEventListener('open-voice-field-hud' as any, handleOpenHUD as any);
    return () => {
      window.removeEventListener('open-voice-field-hud' as any, handleOpenHUD as any);
      stopListening();
    };
  }, []);

  const startListening = (opts?: VoiceFieldOptions) => {
    const activeOpts = opts || currentOptionsRef.current;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। গুগল ক্রোম ব্রাউজার ব্যবহার করুন।');
      return;
    }

    // Stop previous instance
    stopListening();

    try {
      playMicStartSound();
      const rec = new SpeechRecognition();
      rec.lang = 'bn-BD';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;

      isListeningRef.current = true;
      setIsListening(true);
      setErrorMessage('');

      rec.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setStatusMessage(activeOpts?.isNumeric ? '🎙️ শুনছি... সংখ্যা বা টাকার পরিমাণ বলুন' : '🎙️ শুনছি... কথা বলুন');
      };

      rec.onresult = (event: any) => {
        const { fullTranscript } = extractTranscriptFromEvent(event);
        if (!fullTranscript || isEchoedTTSResponse(fullTranscript)) return;

        setLiveTranscript(fullTranscript);
        liveTranscriptRef.current = fullTranscript;

        // Auto-complete after 1.2 seconds of silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (isListeningRef.current && liveTranscriptRef.current.trim()) {
            handleComplete(liveTranscriptRef.current.trim(), activeOpts);
          }
        }, 1200);
      };

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech') {
          setStatusMessage('কোনো কথা শোনা যায়নি। স্পষ্ট করে বলুন...');
          return;
        }
        if (e.error === 'not-allowed') {
          setErrorMessage('মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
          setIsListening(false);
          isListeningRef.current = false;
          return;
        }
        console.warn('Voice recognition error:', e.error);
      };

      rec.onend = () => {
        if (isListeningRef.current && !isSuccess) {
          try {
            rec.start();
          } catch (err) {
            setIsListening(false);
            isListeningRef.current = false;
          }
        }
      };

      rec.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setErrorMessage('ভয়েস সার্ভিস চালু করা যায়নি। আবার চেষ্টা করুন।');
      setIsListening(false);
      isListeningRef.current = false;
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const handleComplete = (textToUse?: string, optsToUse?: VoiceFieldOptions | null) => {
    const opts = optsToUse || currentOptionsRef.current || currentOptions;
    const raw = textToUse || liveTranscriptRef.current || liveTranscript;
    if (!opts || !raw) {
      closeHUD();
      return;
    }

    stopListening();
    setIsSuccess(true);
    playSuccessChime();

    let processed = cleanSpokenBengali(raw.trim());
    if (opts.isNumeric) {
      processed = parseBanglaNumber(processed);
    }

    // Call recipient setter
    opts.onResult(processed);

    setTimeout(() => {
      closeHUD();
    }, 500);
  };

  const handleRetry = () => {
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setIsSuccess(false);
    setErrorMessage('');
    startListening();
  };

  const closeHUD = () => {
    stopListening();
    setIsOpen(false);
    setCurrentOptions(null);
    currentOptionsRef.current = null;
    setLiveTranscript('');
    liveTranscriptRef.current = '';
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
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={closeHUD}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '420px',
          borderRadius: '24px',
          padding: '24px 20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          border: isSuccess ? '2.5px solid #22c55e' : '2px solid #ef4444',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
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
        <div style={{ marginBottom: '14px' }}>
          <span
            style={{
              background: isSuccess ? '#dcfce7' : '#fee2e2',
              color: isSuccess ? '#15803d' : '#991b1b',
              padding: '5px 14px',
              borderRadius: '99px',
              fontSize: '13px',
              fontWeight: '800',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{currentOptions?.label ? `📝 ${currentOptions.label}` : '🎙️ ভয়েস ইনপুট'}</span>
            {currentOptions?.isNumeric && <span>(সংখ্যা)</span>}
          </span>
        </div>

        {/* Pulsing Mic Visualizer */}
        <div
          onClick={() => {
            if (isListening) {
              stopListening();
            } else {
              startListening();
            }
          }}
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: isSuccess
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : isListening
              ? 'radial-gradient(circle, #ef4444 0%, #dc2626 100%)'
              : '#f1f5f9',
            color: isListening || isSuccess ? '#ffffff' : '#64748b',
            display: 'grid',
            placeItems: 'center',
            fontSize: '32px',
            cursor: 'pointer',
            boxShadow: isListening
              ? '0 0 0 10px rgba(239, 68, 68, 0.2), 0 0 0 20px rgba(239, 68, 68, 0.1)'
              : isSuccess
              ? '0 0 0 10px rgba(16, 185, 129, 0.2)'
              : 'none',
            transition: 'all 0.2s ease',
            margin: '10px 0 14px'
          }}
        >
          {isSuccess ? '✓' : '🎙️'}
        </div>

        {/* Status Message */}
        <div style={{ fontSize: '13.5px', fontWeight: '800', color: isListening ? '#dc2626' : '#475569', marginBottom: '14px' }}>
          {isSuccess ? '✓ সম্পন্ন হয়েছে!' : statusMessage}
        </div>

        {/* Error Message Display if any */}
        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecdd3', color: '#991b1b', padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', marginBottom: '12px' }}>
            {errorMessage}
          </div>
        )}

        {/* Live Transcript Box */}
        <div
          style={{
            width: '100%',
            minHeight: '70px',
            maxHeight: '110px',
            overflowY: 'auto',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxSizing: 'border-box'
          }}
        >
          {liveTranscript ? (
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              "{liveTranscript}"
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
              {isListening ? 'শুনছি... এখন কথা বলুন...' : 'মাইক্রোফোনে চাপ দিয়ে কথা বলুন'}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={closeHUD}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '12px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontWeight: '800',
              fontSize: '13.5px',
              cursor: 'pointer'
            }}
          >
            বাতিল
          </button>

          {liveTranscript ? (
            <button
              type="button"
              onClick={() => handleComplete()}
              style={{
                flex: 2,
                padding: '11px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
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
                padding: '11px',
                borderRadius: '12px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              🎙️ আবার বলুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
