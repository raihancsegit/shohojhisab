'use client';
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { extractTranscriptFromEvent, cleanSpokenBengali, isEchoedTTSResponse } from '../../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../../lib/audioFeedbackUtils';

export default function AiAssistantPage() {
  const { tenant, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;

  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      sender: 'ai',
      text: `আসসালামু আলাইকুম! আমি ${tenant?.shopName || 'আপনার দোকানের'} স্মার্ট এআই বিজনেস অ্যাসিস্ট্যান্ট।\n\nআপনি মুখে যা বলবেন (যেমন: "আজকের লাভ কত", "রহিম ভাই ৫০০ টাকা বাকি নিল", "চা নাস্তা ৬০ টাকা খরচ", "কোন মালের স্টক কম") আমি স্বয়ংক্রিয়ভাবে হিসাব সংরক্ষণ ও রিপোর্ট জানিয়ে দেব।`,
      time: 'লাইভ',
      actionLink: null
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const presetQuestions = [
    '📦 আজকের স্টক কত?',
    '📊 আজকের বিক্রি ও লাভ কত?',
    '➕ নাপা ৫০ পাতা স্টক যোগ করো',
    '📖 রিয়ানের ২০ টাকা বাকি',
    '💵 রিয়ান ২০ টাকা জমা দিল',
    '☕ চা নাস্তা ৬০ টাকা খরচ লেখো',
    '⚠️ কোন কোন মালের স্টক কম?',
    '📖 বাজারে মোট বাকি কত?'
  ];

  const handleAsk = async (queryText: string) => {
    const raw = (queryText || inputQuery).trim();
    if (!raw) return;

    const q = cleanSpokenBengali(raw);
    if (!q || isEchoedTTSResponse(q)) return;

    triggerHaptic('medium');
    const userMsg = { id: String(Date.now()), sender: 'user', text: q, time: 'এইমাত্র', actionLink: null };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLiveTranscript('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenantId || 'tenant-1',
          query: q
        })
      });

      if (res.ok) {
        const data = await res.json();
        playSuccessChime();
        const aiMsg = {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: data.reply || data.speech,
          time: 'এইমাত্র',
          actionLink: data.actionLink
        };
        setMessages(prev => [...prev, aiMsg]);
        triggerHaptic('success');

        // Speak reply out loud if speech provided
        if (data.speech) {
          speakAnnouncement(data.speech);
        }

        // Trigger real-time refresh event across open pages
        if (data.action) {
          window.dispatchEvent(new CustomEvent('voice-action-success', { detail: data }));
        }
      } else {
        playWarningSound();
        setMessages(prev => [...prev, {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: 'দুঃখিত, সার্ভার থেকে ডাটা লোড করা যায়নি। আবার চেষ্টা করুন।',
          time: 'এইমাত্র',
          actionLink: null
        }]);
      }
    } catch (e) {
      playWarningSound();
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: 'সার্ভার সংযোগ সমস্যা। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করুন।',
        time: 'এইমাত্র',
        actionLink: null
      }]);
    }
    setLoading(false);
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setIsListening(false);
    playMicStopSound();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const handleVoiceAsk = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট নেই। গুগল ক্রোম ব্যবহার করুন।');
      return;
    }

    // Stop active TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (isListening) {
      stopListening();
      if (liveTranscript.trim()) {
        handleAsk(liveTranscript.trim());
      }
      return;
    }

    triggerHaptic('medium');
    playMicStartSound();
    setLiveTranscript('');
    setIsListening(true);

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = false; // Single utterance mode prevents repetition
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        const { fullTranscript } = extractTranscriptFromEvent(event);
        if (!fullTranscript || isEchoedTTSResponse(fullTranscript)) return;

        setLiveTranscript(fullTranscript);

        // Smart auto-submit after 1.2s silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          handleAsk(fullTranscript);
        }, 1200);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err.error);
        if (err.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px 40px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0847 0%, #4c1d95 50%, #7c3aed 100%)',
        borderRadius: '28px',
        padding: '24px 20px',
        color: '#fff',
        marginBottom: '20px',
        boxShadow: '0 16px 40px rgba(124, 58, 237, 0.28)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'linear-gradient(135deg, #f59e0b, #ec4899)', display: 'grid', placeItems: 'center', fontSize: '28px' }}>
            🤖
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0 }}>দোকান এআই বিজনেস অ্যাসিস্ট্যান্ট</h1>
            <span style={{ fontSize: '13px', color: '#e9d5ff' }}>মুখে বলুন — স্বয়ংক্রিয় হিসাব ও লাইভ উত্তর পান</span>
          </div>
        </div>

        <button
          onClick={handleVoiceAsk}
          style={{
            background: isListening ? '#dc2626' : '#22c55e',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '99px',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isListening ? '0 0 0 6px rgba(220, 38, 38, 0.35)' : '0 4px 14px rgba(34, 197, 94, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🎙️</span> {isListening ? 'শুনছি... (থামাতে চাপুন)' : 'মুখে কথা বলুন'}
        </button>
      </div>

      {/* Live Voice Indicator when listening */}
      {isListening && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #f87171',
          borderRadius: '16px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'pulse 1.5s infinite'
        }}>
          <span style={{ fontSize: '20px' }}>🎙️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '700' }}>মাইক্রোফোন সক্রিয় — কথা বলুন...</div>
            <div style={{ fontSize: '15px', color: '#0f172a', fontWeight: '800', marginTop: '2px' }}>
              {liveTranscript || 'শুনছি...'}
            </div>
          </div>
        </div>
      )}

      {/* Preset Suggestions */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {presetQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(q)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '99px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: '700',
              color: '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease'
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="glass-card" style={{ padding: '20px', minHeight: '360px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: m.sender === 'user' ? '#7c3aed' : '#f8fafc',
              color: m.sender === 'user' ? '#fff' : '#0f172a',
              border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
              padding: '14px 18px',
              borderRadius: m.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ fontSize: '14.5px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {m.text}
            </div>

            {m.actionLink && (
              <div style={{ marginTop: '10px' }}>
                <Link
                  href={m.actionLink.href}
                  style={{
                    background: '#7c3aed',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  {m.actionLink.text}
                </Link>
              </div>
            )}

            <span style={{ fontSize: '11px', color: m.sender === 'user' ? '#e9d5ff' : '#94a3b8', display: 'block', marginTop: '6px', textAlign: 'right' }}>
              {m.time}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', padding: '12px 18px', borderRadius: '18px', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> এআই হিসাব প্রসেস করছে...
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(inputQuery);
        }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          type="text"
          placeholder="মুখে বলুন অথবা লিখে হিসাব বা প্রশ্ন জানান..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          style={{ flex: 1, padding: '14px 18px', borderRadius: '16px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#fff' }}
        />
        <button
          type="submit"
          className="shimmer-btn"
          disabled={loading}
          style={{
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            padding: '0 24px',
            borderRadius: '16px',
            fontWeight: '900',
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          পাঠান →
        </button>
      </form>

    </div>
  );
}
