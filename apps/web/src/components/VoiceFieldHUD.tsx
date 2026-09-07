'use client';
import React, { useState, useEffect, useRef } from 'react';
import { playVoiceBeep, parseBanglaNumber, getNearFieldAudioStream, VoiceFieldOptions } from '../lib/voiceFieldUtils';

export default function VoiceFieldHUD() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<VoiceFieldOptions | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('কথা বলুন, শুনছি...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for near-field volume level
  const [inputMode, setInputMode] = useState<'hold' | 'tap'>('hold'); // 'hold' = Push-to-talk (best for noisy shops), 'tap' = auto-listen
  const [isHolding, setIsHolding] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentOptionsRef = useRef<VoiceFieldOptions | null>(null);
  const liveTranscriptRef = useRef<string>('');

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
      setCurrentOptions(opts);
      currentOptionsRef.current = opts;
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      setErrorMessage('');
      setIsSuccess(false);
      setAudioLevel(0);
      setIsHolding(false);
      setStatusMessage(
        inputMode === 'hold'
          ? '👇 লাল বাটনে চাপ দিয়ে ধরে মুখের কাছে এনে বলুন'
          : opts.isNumeric
          ? 'টাকার অংক বা সংখ্যা মুখে বলুন...'
          : 'যা লিখতে চান মুখে বলুন...'
      );
      setIsOpen(true);

      // In tap mode, start immediately; in hold mode, user presses the button
      if (inputMode === 'tap') {
        startListening(opts);
      }
    };

    window.addEventListener('open-voice-field-hud' as any, handleOpenHUD as any);
    return () => {
      window.removeEventListener('open-voice-field-hud' as any, handleOpenHUD as any);
      stopListening();
    };
  }, [inputMode]);

  const startListening = async (opts: VoiceFieldOptions) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('আপনার ব্রাউজারে ভয়েস সাপোর্ট নেই। দয়া করে গুগল ক্রোম ব্যবহার করুন।');
      return;
    }

    try {
      // 1. Stop any existing listeners & streams
      stopListening();

      // 2. Engage Hardware Echo Cancellation, Noise Suppression & Bandpass Filter via getUserMedia
      const { stream, analyser, audioCtx } = await getNearFieldAudioStream();
      mediaStreamRef.current = stream;
      audioCtxRef.current = audioCtx;

      // 3. Audio Volume / Proximity meter loop
      if (analyser) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioMeter = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalize volume 0 to 100 with sensitivity curve
          const level = Math.min(100, Math.round((avg / 128) * 100 * 1.6));
          setAudioLevel(level);
          animationFrameRef.current = requestAnimationFrame(updateAudioMeter);
        };
        updateAudioMeter();
      }

      // 4. Start Web Speech Recognition
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
        setStatusMessage(
          inputMode === 'hold'
            ? '🎙️ শুনছি... কথা শেষ হলে আঙ্গুল তুলে নিন'
            : opts.isNumeric
            ? '🎙️ টাকার অংক বা সংখ্যা বলুন (শুনছি...)'
            : '🎙️ কথা বলুন (শুনছি...)'
        );
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
          liveTranscriptRef.current = spoken;

          // In tap mode, silence timer auto-completes
          if (inputMode === 'tap') {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              handleComplete(spoken, opts);
            }, 1400);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.warn('Voice recognition error:', e.error);
        if (e.error === 'no-speech') {
          setStatusMessage('কোনো কথা শোনা যায়নি। মুখের একদম কাছে এনে স্পষ্ট করে বলুন...');
        } else if (e.error === 'not-allowed') {
          setErrorMessage('মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে গিয়ে অনুমতি দিন।');
          setIsListening(false);
        } else {
          setStatusMessage('পুনরায় শুনছি... স্পষ্ট করে কথা বলুন');
        }
      };

      rec.onend = () => {
        if (isListening && !isSuccess && inputMode === 'tap') {
          try {
            rec.start();
          } catch (err) {
            setIsListening(false);
          }
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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setIsListening(false);
  };

  // Push-To-Talk Handlers (Hold to speak)
  const handleHoldStart = () => {
    if (!currentOptions) return;
    setIsHolding(true);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    startListening(currentOptions);
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    // Give speech server 350ms to deliver final chunk, then complete
    setTimeout(() => {
      const text = liveTranscriptRef.current || liveTranscript;
      if (text) {
        handleComplete(text, currentOptionsRef.current);
      } else {
        stopListening();
        setStatusMessage('কোনো কথা শোনা যায়নি। বাটনে চেপে ধরে আবার বলুন।');
      }
    }, 450);
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

  const handleQuickAddValue = (val: string) => {
    if (!currentOptions) return;
    if (currentOptions.isNumeric) {
      const currentNum = Number(parseBanglaNumber(liveTranscript || '0')) || 0;
      const addNum = Number(val) || 0;
      const total = addNum ? String(currentNum + addNum) : val;
      setLiveTranscript(total);
      liveTranscriptRef.current = total;
    } else {
      const next = liveTranscript ? `${liveTranscript} ${val}` : val;
      setLiveTranscript(next);
      liveTranscriptRef.current = next;
    }
  };

  const handleRetry = () => {
    if (!currentOptions) return;
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setIsSuccess(false);
    setErrorMessage('');
    startListening(currentOptions);
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
    setAudioLevel(0);
    setIsHolding(false);
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
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
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
          padding: '20px 18px 18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: isSuccess ? '2.5px solid #22c55e' : '2px solid #4f46e5',
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

        {/* Target Field Header Badge & Mode Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            <div
              style={{
                background: isSuccess ? '#dcfce7' : '#eef2ff',
                color: isSuccess ? '#15803d' : '#4338ca',
                padding: '4px 12px',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{currentOptions?.label ? `📝 ${currentOptions.label}` : '🎙️ ভয়েস ইনপুট'}</span>
              {currentOptions?.isNumeric && <span>(সংখ্যা / টাকা)</span>}
            </div>

            <div
              style={{
                background: '#ecfdf5',
                color: '#065f46',
                padding: '4px 10px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid #a7f3d0'
              }}
              title="ভোকাল ফিল্টার ও হার্ডওয়্যার নয়েজ সাপ্রেশন সক্রিয়"
            >
              <span>🛡️ ভোকাল ফিল্টার সক্রিয়</span>
            </div>
          </div>

          {/* Mode Switch Tabs (Hold to Talk vs Tap) */}
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '99px',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setInputMode('hold');
                stopListening();
                setStatusMessage('👇 লাল বাটনে চাপ দিয়ে ধরে কথা বলুন');
              }}
              style={{
                background: inputMode === 'hold' ? '#ef4444' : 'transparent',
                color: inputMode === 'hold' ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              🔘 চাপ দিয়ে ধরে বলুন (ভিড়ের মধ্যে সেরা)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('tap');
                if (currentOptions) startListening(currentOptions);
              }}
              style={{
                background: inputMode === 'tap' ? '#4f46e5' : 'transparent',
                color: inputMode === 'tap' ? '#ffffff' : '#64748b',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '99px',
                fontSize: '11px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⚡ একটানা শুনুন
            </button>
          </div>
        </div>

        {/* Big Interactive Microphone Button (Push-to-Talk & Tap) */}
        <div style={{ position: 'relative', width: '92px', height: '92px', marginBottom: '10px' }}>
          {(isListening || isHolding) && (
            <div
              style={{
                position: 'absolute',
                inset: `-${Math.min(22, 6 + Math.round(audioLevel / 5))}px`,
                borderRadius: '50%',
                background: audioLevel > 20 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.25)',
                animation: 'voicePulse 1.1s infinite',
                transition: 'inset 0.1s ease'
              }}
            />
          )}

          <button
            type="button"
            onMouseDown={inputMode === 'hold' ? handleHoldStart : undefined}
            onMouseUp={inputMode === 'hold' ? handleHoldEnd : undefined}
            onTouchStart={inputMode === 'hold' ? (e) => { e.preventDefault(); handleHoldStart(); } : undefined}
            onTouchEnd={inputMode === 'hold' ? (e) => { e.preventDefault(); handleHoldEnd(); } : undefined}
            onClick={inputMode === 'tap' ? (isListening ? stopListening : () => currentOptions && startListening(currentOptions)) : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: isSuccess
                ? '#22c55e'
                : isHolding || (isListening && audioLevel > 25)
                ? '#dc2626'
                : isListening
                ? '#ef4444'
                : '#4f46e5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: isHolding || isListening ? '0 12px 28px rgba(239, 68, 68, 0.45)' : '0 6px 16px rgba(79, 70, 229, 0.3)',
              transform: isHolding ? 'scale(0.95)' : 'scale(1)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none'
            }}
          >
            <span style={{ fontSize: '32px', lineHeight: 1 }}>{isSuccess ? '✓' : '🎙️'}</span>
            <span style={{ fontSize: '10px', fontWeight: '900', marginTop: '2px' }}>
              {isSuccess ? 'সফল' : inputMode === 'hold' ? (isHolding ? 'শুনছি...' : 'চাপুন') : isListening ? 'শুনছি' : 'শুরু'}
            </span>
          </button>
        </div>

        {/* Live Audio Level & Near-Field Indicator */}
        {(isListening || isHolding) && (
          <div style={{ width: '100%', maxWidth: '280px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: audioLevel > 20 ? '#16a34a' : '#64748b', marginBottom: '4px' }}>
              <span>🎯 {audioLevel > 20 ? 'স্পষ্ট কণ্ঠ ধরা পড়ছে' : 'মুখের কাছে এনে স্পষ্ট করে বলুন'}</span>
              <span className="num-font">{audioLevel}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(8, audioLevel))}%`,
                  background: audioLevel > 50 ? '#16a34a' : audioLevel > 20 ? '#22c55e' : '#f59e0b',
                  borderRadius: '99px',
                  transition: 'width 0.08s ease, background 0.15s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* Status Text */}
        <strong
          style={{
            fontSize: '14.5px',
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
            minHeight: '52px',
            background: isSuccess ? '#f0fdf4' : '#f8fafc',
            border: isSuccess ? '1.5px solid #86efac' : '1.5px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '800',
            color: liveTranscript ? (isSuccess ? '#15803d' : '#0f172a') : '#94a3b8',
            marginBottom: '10px',
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
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#64748b' }}>
              {inputMode === 'hold'
                ? '(বাটন চেপে ধরে মুখের কাছে কথা বলুন)'
                : '(মুখের কাছে কথা বলুন, এখানে লেখা উঠবে...)'}
            </span>
          )}
        </div>

        {/* Quick Correction / Fast Addition Chips (Great for noisy markets) */}
        {currentOptions?.isNumeric && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center', marginBottom: '12px' }}>
            {['100', '200', '500', '1000', '1500', '2000'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAddValue(amt)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '3px 8px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                +৳{amt}
              </button>
            ))}
          </div>
        )}

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
              marginBottom: '10px',
              width: '100%'
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Action Buttons: Done / Retry / Cancel */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            type="button"
            onClick={() => handleComplete()}
            disabled={!liveTranscript}
            style={{
              flex: 2,
              background: liveTranscript ? '#10b981' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              padding: '11px',
              borderRadius: '14px',
              fontWeight: '900',
              fontSize: '14px',
              cursor: liveTranscript ? 'pointer' : 'not-allowed',
              boxShadow: liveTranscript ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            ✓ সম্পন্ন করুন
          </button>

          <button
            type="button"
            onClick={closeHUD}
            style={{
              flex: 1,
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              padding: '11px',
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

