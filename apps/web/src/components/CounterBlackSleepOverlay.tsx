'use client';
import React, { useState, useEffect } from 'react';
import { counterSleepManager, CounterSleepState } from '../lib/counterSleepManager';

interface CounterBlackSleepOverlayProps {
  onExit?: () => void;
}

export default function CounterBlackSleepOverlay({ onExit }: CounterBlackSleepOverlayProps) {
  const [state, setState] = useState<CounterSleepState>(counterSleepManager.getState());
  const [timeStr, setTimeStr] = useState<string>('');

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
    };
  }, []);

  if (!state.isEnabled || !state.isAsleep) {
    return null;
  }

  const handleWake = () => {
    counterSleepManager.wakeUp();
  };

  return (
    <div
      onClick={handleWake}
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
        opacity: 0.25
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span>🎙️</span>
          <span>কাউন্টার লিসেনার সক্রিয়</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            counterSleepManager.disable();
            if (onExit) onExit();
          }}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '10.5px',
            cursor: 'pointer'
          }}
        >
          স্লিপ বন্ধ
        </button>
      </div>

      {/* Center Subtle AMOLED Clock & Listening Indicator */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(52px, 15vw, 74px)',
          fontWeight: '200',
          color: 'rgba(255, 255, 255, 0.22)',
          letterSpacing: '2px',
          lineHeight: 1
        }}>
          {timeStr}
        </div>

        {/* Pulsing Listening Dot */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '6px 14px',
          borderRadius: '99px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 10px #10b981'
          }} />
          <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: '600' }}>
            শুনছি... "সহজ হিসাব" বলুন
          </span>
        </div>

        {state.lastSpokenText && (
          <div style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#a7f3d0',
            fontWeight: '700',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '6px 14px',
            borderRadius: '10px'
          }}>
            "{state.lastSpokenText}"
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div style={{
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.18)',
        textAlign: 'center'
      }}>
        স্ক্রিনে যেকোনো জায়গায় স্পর্শ করলে বা মুখে বললে জেগে উঠবে
      </div>
    </div>
  );
}
