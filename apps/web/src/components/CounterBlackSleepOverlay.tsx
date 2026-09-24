'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { counterSleepManager, CounterSleepState } from '../lib/counterSleepManager';
import { playMicStartSound, playSuccessChime } from '../lib/audioFeedbackUtils';

interface CounterBlackSleepOverlayProps {
  onExit?: () => void;
}

export default function CounterBlackSleepOverlay({ onExit }: CounterBlackSleepOverlayProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<CounterSleepState>(counterSleepManager.getState());
  const [timeStr, setTimeStr] = useState<string>('');
  const [liveHeardText, setLiveHeardText] = useState<string>('');
  const [isAwakening, setIsAwakening] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'pure_black' | 'dim_clock'>('dim_clock');
  const [micError, setMicError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const restartTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsub = counterSleepManager.subscribe(setState);

    const updateClock = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const bnH = h.split('').map(c => bnDigits[parseInt(c, 10)] || c).join('');
      const bnM = m.split('').map(c => bnDigits[parseInt(c, 10)] || c).join('');
      setTimeStr(`${bnH}:${bnM}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 30000);

    return () => {
      unsub();
      clearInterval(interval);
      stopSleepListener();
    };
  }, []);

  // Autonomous Background Listening during Sleep Mode
  useEffect(() => {
    if (state.isEnabled && state.isAsleep) {
      startSleepListener();
    } else {
      stopSleepListener();
      setLiveHeardText('');
      setIsAwakening(false);
      setMicError(null);
    }
    return () => {
      stopSleepListener();
    };
  }, [state.isEnabled, state.isAsleep]);

  const stopSleepListener = () => {
    isListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { 
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort(); 
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const startSleepListener = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setMicError('এই ব্রাউজারে স্পিচ রিকগনিশন সমর্থিত নয়। স্ক্রিনে স্পর্শ করে জাগাতে পারবেন।');
      return;
    }

    stopSleepListener();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      isListeningRef.current = true;

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const spoken = (finalChunk || interim).trim();
        if (!spoken) return;

        setLiveHeardText(spoken);

        // Check for wake word or direct retail sale intent
        const { isWake, command } = counterSleepManager.extractWakeWord(spoken);
        const hasRetailIntent = /(কেজি|লিটার|টাকা|পিস|পাতা|টা|গ্রাম|পোয়া|পোয়া|আধা|হাফ|দেড়|দেড়|হালি|বস্তা|প্যাকেট|বোতল|\d+|ক্যাশ|বাকি|বিক্রি|মেমো|দাম|খরচ|কাস্টমার|খাতা|স্টক|চাল|ডাল|তেল|চিনি|সাবান)/i.test(spoken);

        // Deliberate voice trigger: wake word, retail intent, or any clear utterance
        const isIntentionalSpeech = isWake || hasRetailIntent || spoken.length >= 3;

        if (isIntentionalSpeech) {
          const actionText = (command || spoken).trim();
          triggerWakeAndExecute(actionText, isWake, hasRetailIntent);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech') return;
        if (err.error === 'not-allowed') {
          setMicError('মাইক্রোফোন পারমিশন বন্ধ আছে। স্ক্রিনে স্পর্শ করে জাগাতে পারবেন।');
          return;
        }
        // Auto-restart on silent disconnect with debounce
        if (isListeningRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              try { recognition.start(); } catch (e) {}
            }
          }, 800);
        }
      };

      recognition.onend = () => {
        // Auto-keep alive while asleep
        if (isListeningRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              try { recognition.start(); } catch (e) {}
            }
          }, 400);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('[SleepListener] Failed to start:', e);
      setMicError('মাইক সক্রিয় করা যায়নি। স্ক্রিন স্পর্শ করে জাগাতে পারবেন।');
    }
  };

  const triggerWakeAndExecute = (commandText: string, isWakeOnly: boolean, isSaleIntent: boolean) => {
    stopSleepListener();
    setIsAwakening(true);
    playSuccessChime();

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([50, 70, 50]); } catch (e) {}
    }

    // Wake up counterSleepManager state
    counterSleepManager.wakeUp(commandText);

    if (isSaleIntent && commandText) {
      counterSleepManager.speakBengali('হ্যাঁ ভাই, মেমো হচ্ছে!');
      // Dispatch event to POS if on /pos, or navigate
      window.dispatchEvent(new CustomEvent('counter-sleep-sale-command', { detail: { text: commandText } }));
      if (pathname !== '/pos') {
        router.push(`/pos?voiceQuery=${encodeURIComponent(commandText)}`);
      }
    } else {
      counterSleepManager.speakBengali('সহজ হিসাব প্রস্তুত! বলুন ভাই কী লাগবে?');
      if (pathname !== '/pos') {
        router.push('/pos?voice=1');
      }
    }
  };

  if (!state.isEnabled || !state.isAsleep) {
    return null;
  }

  const handleManualWake = (e?: React.SyntheticEvent) => {
    if (e) {
      // Prevent double trigger on touch + click
      e.stopPropagation();
    }
    stopSleepListener();
    playMicStartSound();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch (e) {}
    }

    counterSleepManager.wakeUp('স্ক্রিনে স্পর্শ করা হয়েছে');
    counterSleepManager.speakBengali('সহজ হিসাব সক্রিয় হয়েছে!');
    if (onExit) onExit();
  };

  return (
    <div
      onClick={handleManualWake}
      onTouchStart={handleManualWake}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000', // Pure pitch-black (0% battery drain on AMOLED)
        color: '#ffffff',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 20px',
        userSelect: 'none',
        cursor: 'pointer',
        fontFamily: "'Hind Siliguri', 'Outfit', sans-serif",
        touchAction: 'manipulation'
      }}
    >
      {/* Top Status Bar & Controls */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '460px',
          opacity: displayMode === 'pure_black' ? 0.15 : 0.45,
          transition: 'opacity 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#34d399', fontWeight: '700' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: '#10b981', 
            display: 'inline-block',
            boxShadow: '0 0 8px #10b981'
          }} />
          <span>🎙️ কাউন্টার লিসেনার প্রস্তুত</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Toggle Pure Black vs Dim Clock */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisplayMode(prev => prev === 'pure_black' ? 'dim_clock' : 'pure_black');
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            {displayMode === 'pure_black' ? '⏰ ঘড়ি দেখান' : '📱 পুরো কালো'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              counterSleepManager.disable();
              if (onExit) onExit();
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '700'
            }}
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Center Subtle AMOLED Clock or Pure Black Standby */}
      <div style={{ textAlign: 'center', maxWidth: '90%', margin: 'auto 0' }}>
        {displayMode === 'dim_clock' ? (
          <div style={{
            fontSize: 'clamp(54px, 15vw, 88px)',
            fontWeight: '200',
            color: 'rgba(255, 255, 255, 0.22)',
            letterSpacing: '2px',
            lineHeight: 1,
            userSelect: 'none'
          }}>
            {timeStr}
          </div>
        ) : (
          <div style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.15)',
            letterSpacing: '1px',
            marginBottom: '10px'
          }}>
            [ সুইচ অফ মোড • ডিসপ্লে চার্জ ০% ]
          </div>
        )}

        {/* Pulsing Listening Indicator / Spoken Text */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
          background: liveHeardText ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
          padding: '8px 18px',
          borderRadius: '99px',
          border: liveHeardText ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'all 0.2s ease',
          maxWidth: '360px'
        }}>
          <div style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: liveHeardText ? '#34d399' : '#10b981',
            boxShadow: '0 0 10px #10b981',
            animation: 'pulse 1.5s infinite',
            flexShrink: 0
          }} />
          <span style={{ 
            fontSize: '13px', 
            color: liveHeardText ? '#a7f3d0' : 'rgba(255, 255, 255, 0.5)', 
            fontWeight: '700',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {liveHeardText ? `🎙️ "${liveHeardText}"` : 'শুনছি... "সহজ হিসাব" বা পণ্যের নাম বলুন'}
          </span>
        </div>

        {micError && (
          <div style={{
            marginTop: '12px',
            fontSize: '11.5px',
            color: '#fca5a5',
            background: 'rgba(239, 68, 68, 0.15)',
            padding: '6px 12px',
            borderRadius: '8px'
          }}>
            ⚠️ {micError}
          </div>
        )}

        {isAwakening && (
          <div style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#34d399',
            fontWeight: '800',
            background: 'rgba(16, 185, 129, 0.25)',
            padding: '8px 18px',
            borderRadius: '12px',
            border: '1px solid #10b981'
          }}>
            ✓ জেগে উঠছে... মেমো প্রস্তুত হচ্ছে
          </div>
        )}
      </div>

      {/* Bottom Wake Guidance & AMOLED Tip */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <button
          type="button"
          onClick={handleManualWake}
          onTouchStart={handleManualWake}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>👆 স্ক্রিন স্পর্শ করুন অথবা বলুন "সহজ হিসাব"</span>
        </button>

        <div style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.35)',
          lineHeight: '1.4'
        }}>
          💡 <strong>পরামর্শ:</strong> ফোনের পাওয়ার বাটন চেপে স্ক্রিন অফ করবেন না। এই কালো স্ক্রিনেই কাউন্টারে ফেলে রাখুন—AMOLED ডিসপ্লে হওয়ায় চার্জ শেষ হবে না এবং সবসময় কথা শুনবে।
        </div>
      </div>
    </div>
  );
}
