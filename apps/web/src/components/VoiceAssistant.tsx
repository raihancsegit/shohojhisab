'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useVoiceAgent } from '../hooks/useVoiceAgent';

export default function VoiceAssistant() {
  const pathname = usePathname();
  const [showTypeInput, setShowTypeInput] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);

  const {
    isListening,
    isProcessing,
    liveTranscript,
    feedbackText,
    feedbackType,
    currentMode,
    activeSpeaker,
    isSupported,
    startListening,
    cancelVoice,
    executeCommand
  } = useVoiceAgent();

  // Track Online / Offline State
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

  // Listen to global voice assistant triggers
  useEffect(() => {
    const handleTrigger = () => {
      startListening();
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => {
      window.removeEventListener('trigger-voice-assistant', handleTrigger);
    };
  }, [startListening]);

  // Mobile Screen Responsive Check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileScreen(typeof window !== 'undefined' && window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Avoid covering the POS keypad and numpad on mobile screens
  if (!isSupported || pathname === '/login' || (pathname === '/pos' && isMobileScreen)) return null;

  return (
    <>
      {/* Tap outside to dismiss active listening/feedback popup */}
      {feedbackType && (
        <div
          onClick={cancelVoice}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        />
      )}

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
            maxWidth: '350px',
            width: 'calc(100vw - 40px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
          }}>
            {/* Header: Mode Badge & Dismiss button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px' }}>
                  {feedbackType === 'listening' ? '🎙️' : feedbackType === 'processing' ? '⚡' : feedbackType === 'success' ? '✅' : '⚠️'}
                </span>
                {currentMode && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: currentMode === 'owner' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                    border: currentMode === 'owner' ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(59, 130, 246, 0.5)',
                    color: currentMode === 'owner' ? '#fef08a' : '#bfdbfe',
                    fontWeight: '800'
                  }}>
                    {currentMode === 'owner' ? `👑 মালিক মোড (${activeSpeaker?.name || 'মালিক'})` : `👔 কর্মচারী মোড (${activeSpeaker?.name || 'স্টাফ'})`}
                  </span>
                )}
                <span style={{ fontSize: '13px' }}>
                  {feedbackText || (isListening ? 'শুনছি... মুখে বলুন' : '')}
                </span>
              </div>
              <button
                type="button"
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

            {/* Voice-First Live Heard Display */}
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
                      fontSize: liveTranscript ? '15px' : '13px',
                      color: liveTranscript ? '#34d399' : 'rgba(255,255,255,0.75)',
                      fontWeight: '800',
                      marginTop: '3px',
                      wordBreak: 'break-word',
                      minHeight: '22px'
                    }}>
                      {liveTranscript || 'যেমন: "২ কেজি চিনি বিক্রি" বা "আজকের বিক্রি কত"'}
                    </div>
                  </div>
                  {liveTranscript && (
                    <button
                      type="button"
                      onClick={() => executeCommand(liveTranscript)}
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

                {/* Optional Manual Typing input */}
                {showTypeInput ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const q = manualText.trim();
                      if (q) {
                        executeCommand(q);
                        setManualText('');
                        setShowTypeInput(false);
                      }
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
                    onClick={() => executeCommand(chip.cmd)}
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
    </>
  );
}
