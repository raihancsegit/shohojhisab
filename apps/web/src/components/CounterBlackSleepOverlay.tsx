'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { counterSleepManager, CounterSleepState } from '../lib/counterSleepManager';
import { playMicStartSound, playSuccessChime } from '../lib/audioFeedbackUtils';
import { voiceProximityManager } from '../lib/voiceProximityGate';
import { verifyCurrentVoice, isSpeakerLockEnabled, pingVoiceVerification } from '../lib/speakerProfileEngine';

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
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

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
    }
    return () => {
      stopSleepListener();
    };
  }, [state.isEnabled, state.isAsleep]);

  const stopSleepListener = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const startSleepListener = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    stopSleepListener();

    try {
      // Start microphone audio analyser for real-time speaker biometrics during sleep mode
      voiceProximityManager.start().catch(() => {});

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

        pingVoiceVerification('default');
        setLiveHeardText(spoken);

        // Check for wake word or direct retail sale intent
        const { isWake, command } = counterSleepManager.extractWakeWord(spoken);
        const hasRetailIntent = /(কেজি|লিটার|টাকা|পিস|পাতা|টা|গ্রাম|পোয়া|পোয়া|আধা|হাফ|দেড়|দেড়|হালি|বস্তা|প্যাকেট|বোতল|\d+|ক্যাশ|বাকি|বিক্রি|মেমো)/i.test(spoken);

        if (isWake || hasRetailIntent) {
          // If speaker lock is enabled, verify that speech belongs to the shopkeeper (reject laptop/TV/strangers)
          const tenantKey = 'default';
          if (isSpeakerLockEnabled(tenantKey)) {
            const speakerCheck = verifyCurrentVoice(tenantKey);
            if (!speakerCheck.isAuthorized) {
              console.log('[SleepOverlay] Ignored unauthorized voice (TV/laptop/stranger):', spoken);
              setLiveHeardText(`🛡️ ফিল্টার: "${spoken}" (অননুমোদিত কণ্ঠ)`);
              setTimeout(() => {
                setLiveHeardText('');
              }, 2500);
              return;
            }
          }

          const actionText = (command || spoken).trim();
          triggerWakeAndExecute(actionText, isWake, hasRetailIntent);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'no-speech') return;
        // Auto-restart on silent disconnect
        if (isListeningRef.current) {
          setTimeout(() => {
            try { if (isListeningRef.current) recognition.start(); } catch (e) {}
          }, 600);
        }
      };

      recognition.onend = () => {
        // Auto-keep alive while asleep
        if (isListeningRef.current) {
          setTimeout(() => {
            try { if (isListeningRef.current) recognition.start(); } catch (e) {}
          }, 350);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('[SleepListener] Failed to start:', e);
    }
  };

  const triggerWakeAndExecute = (commandText: string, isWakeOnly: boolean, isSaleIntent: boolean) => {
    stopSleepListener();
    setIsAwakening(true);
    playSuccessChime();

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
      counterSleepManager.speakBengali('হ্যাঁ ভাই, শুনছি! বলুন কী লাগবে?');
      if (pathname !== '/pos') {
        router.push('/pos?voice=1');
      }
    }
  };

  if (!state.isEnabled || !state.isAsleep) {
    return null;
  }

  const handleManualWake = () => {
    playMicStartSound();
    counterSleepManager.wakeUp('স্ক্রিনে ট্যাপ করা হয়েছে');
    counterSleepManager.speakBengali('সহজ হিসাব প্রস্তুত!');
    if (onExit) onExit();
  };

  return (
    <div
      onClick={handleManualWake}
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
        padding: '30px 20px',
        userSelect: 'none',
        cursor: 'pointer',
        fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
      }}
    >
      {/* Top Dim Status Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '400px',
        opacity: 0.35
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#34d399' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span>🎙️ কাউন্টার লিসেনার সক্রিয়</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            counterSleepManager.disable();
            if (onExit) onExit();
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '3px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: '700'
          }}
        >
          স্লিপ বন্ধ
        </button>
      </div>

      {/* Center Subtle AMOLED Clock & Live Speech Wave */}
      <div style={{ textAlign: 'center', maxWidth: '90%' }}>
        <div style={{
          fontSize: 'clamp(56px, 16vw, 84px)',
          fontWeight: '200',
          color: 'rgba(255, 255, 255, 0.28)',
          letterSpacing: '2px',
          lineHeight: 1
        }}>
          {timeStr}
        </div>

        {/* Pulsing Listening Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '22px',
          background: liveHeardText ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          padding: '8px 18px',
          borderRadius: '99px',
          border: liveHeardText ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'all 0.2s ease'
        }}>
          <div style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 12px #10b981',
            animation: 'pulse 1.5s infinite'
          }} />
          <span style={{ fontSize: '12.5px', color: liveHeardText ? '#a7f3d0' : 'rgba(255, 255, 255, 0.55)', fontWeight: '700' }}>
            {liveHeardText ? `🎙️ "${liveHeardText}"` : 'শুনছি... "সহজ হিসাব" বা পণ্যের নাম বলুন'}
          </span>
        </div>

        {isAwakening && (
          <div style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#34d399',
            fontWeight: '800',
            background: 'rgba(16, 185, 129, 0.2)',
            padding: '8px 16px',
            borderRadius: '12px'
          }}>
            ✓ জেগে উঠছে... মেমো প্রস্তুত হচ্ছে
          </div>
        )}
      </div>

      {/* Bottom Touch Hint */}
      <div style={{
        fontSize: '11.5px',
        color: 'rgba(255, 255, 255, 0.25)',
        textAlign: 'center'
      }}>
        স্ক্রিনে যেকোনো জায়গায় স্পর্শ করলে বা মুখে বললে তাৎক্ষণিক জেগে উঠবে
      </div>
    </div>
  );
}
