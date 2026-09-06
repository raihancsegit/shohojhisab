'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export default function AiAssistantPage() {
  const { tenant, triggerHaptic, speakAnnouncement } = useAuth();
  const currentTenantId = tenant?.id;

  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      sender: 'ai',
      text: `আসসালামু আলাইকুম! আমি ${tenant?.shopName || 'আপনার দোকানের'} এআই অ্যাসিস্ট্যান্ট। আজকের বিক্রি, নিট লাভ, বাকি বা স্টক সম্পর্কে যেকোনো প্রশ্ন মুখে বলুন বা লিখে জানান।`,
      time: 'সকাল ১০:০০',
      actionLink: null
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);

  const presetQuestions = [
    '📊 আজকে আমার আসল লাভ কত হলো?',
    '⚠️ কোন কোন মালের স্টক শেষ হওয়ার পথে?',
    '📖 বাজারে কার কার কাছে সবচেয়ে বেশি বাকি?',
    '🏆 কোন মালে সবচেয়ে বেশি লাভ আসছে?'
  ];

  const handleAsk = async (queryText: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q) return;

    triggerHaptic('medium');
    const userMsg = { id: String(Date.now()), sender: 'user', text: q, time: 'এইমাত্র', actionLink: null };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
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
        const aiMsg = {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: data.reply,
          time: 'এইমাত্র',
          actionLink: data.actionLink
        };
        setMessages(prev => [...prev, aiMsg]);
        triggerHaptic('success');
      } else {
        setMessages(prev => [...prev, {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: 'দুঃখিত, এই মুহূর্তে সার্ভার থেকে ডাটা লোড করা যাচ্ছে না। কিছুক্ষণ পর চেষ্টা করুন।',
          time: 'এইমাত্র',
          actionLink: null
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: 'সার্ভার সংযোগ সমস্যা। অনুগ্রহ করে ইন্টারনেট বা লোকাল সার্ভার চেক করুন।',
        time: 'এইমাত্র',
        actionLink: null
      }]);
    }
    setLoading(false);
  };

  const handleVoiceAsk = () => {
    triggerHaptic('medium');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        handleAsk('আজকে আমার আসল লাভ কত হলো?');
      }, 1500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      setIsListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setIsListening(false);
          handleAsk(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
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
        padding: '28px 24px',
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
            <h1 style={{ fontSize: '22px', fontWeight: '900' }}>দোকান এআই অ্যাসিস্ট্যান্ট (AI Bot)</h1>
            <span style={{ fontSize: '13px', color: '#e9d5ff' }}>বাংলায় প্রশ্ন করুন — হিসাব জানুন মুহূর্তেই</span>
          </div>
        </div>

        <button
          onClick={handleVoiceAsk}
          className={isListening ? 'voice-listening' : 'shimmer-btn'}
          style={{
            background: isListening ? '#dc2626' : '#22c55e',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '99px',
            fontWeight: '800',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🎙️</span> {isListening ? 'শুনছি...' : 'মুখে জিজ্ঞাসা করুন'}
        </button>
      </div>

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
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
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
          placeholder="দোকানের যেকোনাে হিসাব জানতে লিখুন..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          style={{ flex: 1, padding: '14px 18px', borderRadius: '16px', border: '1.5px solid #cbd5e1', fontSize: '15px', outline: 'none', background: '#fff' }}
        />
        <button
          type="submit"
          className="shimmer-btn"
          style={{
            background: '#7c3aed',
            color: '#fff',
            border: 'none',
            padding: '0 24px',
            borderRadius: '16px',
            fontWeight: '900',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          পাঠান →
        </button>
      </form>

    </div>
  );
}
