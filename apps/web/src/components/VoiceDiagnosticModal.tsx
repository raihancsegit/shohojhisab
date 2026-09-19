'use client';
import React, { useState, useEffect, useRef } from 'react';
import { parseVoicePOSCommand, VoicePOSParseResult } from '../lib/voicePOSParser';

interface VoiceDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: any[];
  onTestProductAdd?: (counterId: number, item: any) => void;
}

export default function VoiceDiagnosticModal({
  isOpen,
  onClose,
  products = [],
  onTestProductAdd
}: VoiceDiagnosticModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [parseResult, setParseResult] = useState<VoicePOSParseResult | null>(null);
  const [micVolume, setMicVolume] = useState(0);
  const [micStatus, setMicStatus] = useState<'checking' | 'ready' | 'blocked' | 'unsupported'>('checking');
  const [audioFeedbackOn, setAudioFeedbackOn] = useState(true);
  const [history, setHistory] = useState<Array<{ text: string; result: VoicePOSParseResult; time: string }>>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Play audio chime
  const playTone = (freq = 1100, type: OscillatorType = 'sine', duration = 0.12) => {
    if (!audioFeedbackOn) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Speak announcement
  const speakText = (text: string) => {
    if (!audioFeedbackOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'bn-BD';
      utt.rate = 1.05;
      window.speechSynthesis.speak(utt);
    } catch (e) {}
  };

  // Check Mic Hardware & Permission on Open
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicStatus('unsupported');
      return;
    }

    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(stream => {
        setMicStatus('ready');
        mediaStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVol = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateVol);
        };
        animFrameRef.current = requestAnimationFrame(updateVol);
      })
      .catch(() => {
        setMicStatus('blocked');
      });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
      }
    };
  }, [isOpen]);

  // Execute Parse and Provide Feedback
  const processTranscript = (spoken: string) => {
    const clean = spoken.trim();
    if (!clean) return;

    setFinalTranscript(clean);
    const res = parseVoicePOSCommand(clean, products);
    setParseResult(res);

    const now = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => [{ text: clean, result: res, time: now }, ...prev.slice(0, 9)]);

    if (res.type === 'add_items' && res.items && res.items.length > 0) {
      playTone(1150, 'sine', 0.15);
      const first = res.items[0];
      const targetCounterMsg = res.targetCounterId ? `কাউন্টার ${res.targetCounterId} এ ` : '';
      speakText(`${targetCounterMsg}${first.banglaName || first.name} ${first.quantity} ${first.unit} যোগ হয়েছে।`);
    } else if (res.type === 'noise_ignored') {
      playTone(450, 'triangle', 0.15);
      speakText('দোকানের সাধারণ কথাবলার নয়েজ ফিল্টার করা হয়েছে।');
    } else {
      playTone(900, 'sine', 0.1);
    }
  };

  // Toggle Live Speech Recognition
  const toggleListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('আপনার ব্রাউজারে স্পিচ রিকগনিশন নেই। Google Chrome ব্যবহার করুন।');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'bn-BD';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsRecording(true);
        setInterimText('');
        setFinalTranscript('');
        setParseResult(null);
        playTone(880, 'sine', 0.08);
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimText(interim || final);
        if (final.trim()) {
          processTranscript(final.trim());
        }
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 220,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '14px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        padding: '22px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px'
            }}>
              🧪
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                ভয়েস ল্যাব ও লাইভ টেস্ট
              </h2>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                ভয়েস ইনপুট টেস্ট করুন এবং এআই কীভাবে গ্রহণ করছে তা সরাসরি দেখুন
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#475569'
            }}
          >
            ✕
          </button>
        </div>

        {/* 1. Hardware & Audio Meter Status Banner */}
        <div style={{
          background: micStatus === 'ready' ? '#f0fdf4' : micStatus === 'blocked' ? '#fef2f2' : '#f8fafc',
          border: `1.5px solid ${micStatus === 'ready' ? '#86efac' : micStatus === 'blocked' ? '#fca5a5' : '#cbd5e1'}`,
          borderRadius: '16px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>
              {micStatus === 'ready' ? '🟢' : micStatus === 'blocked' ? '🔴' : '🟡'}
            </span>
            <div>
              <strong style={{ fontSize: '13px', color: micStatus === 'ready' ? '#15803d' : '#991b1b' }}>
                {micStatus === 'ready' ? 'মাইক্রোফোন সম্পূর্ণ প্রস্তুত ও সক্রিয়' : micStatus === 'blocked' ? 'মাইক্রোফোনের অনুমতি ব্লক করা আছে' : 'মাইক্রোফোন চেক হচ্ছে...'}
              </strong>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                বাংলা ভাষা (bn-BD) • গুগল ক্রোম হাই-স্পিড স্পিচ ইঞ্জিন
              </div>
            </div>
          </div>

          {/* Sound Level Gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>সাউন্ড মিটার:</span>
            <div style={{
              flex: 1,
              height: '10px',
              background: '#e2e8f0',
              borderRadius: '99px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${micVolume}%`,
                background: micVolume > 70 ? '#ef4444' : micVolume > 20 ? '#10b981' : '#60a5fa',
                transition: 'width 0.05s ease'
              }} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#0f172a', width: '28px' }} className="num-font">
              {micVolume}%
            </span>
          </div>
        </div>

        {/* 2. Primary Record & Speak Action Bar */}
        <div style={{
          background: isRecording ? '#fef2f2' : '#f8fafc',
          border: `2px solid ${isRecording ? '#f87171' : '#e2e8f0'}`,
          borderRadius: '18px',
          padding: '16px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <button
            type="button"
            onClick={toggleListening}
            style={{
              background: isRecording ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '14px',
              fontWeight: '900',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.45)' : '0 4px 14px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '20px' }}>{isRecording ? '🔴' : '🎙️'}</span>
            <span>{isRecording ? 'শুনছি... (থামাতে চাপুন)' : 'মুখে বলে টেস্ট করুন'}</span>
          </button>

          {/* Audio Feedback Toggle */}
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={audioFeedbackOn}
                onChange={(e) => setAudioFeedbackOn(e.target.checked)}
              />
              অডিও সাউন্ড ও বাংলা স্পিকার ফিডব্যাক চালু রাখুন
            </label>
          </div>

          {/* Live Interim Subtitle */}
          {(isRecording || interimText) && (
            <div style={{
              marginTop: '12px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '10px 14px',
              border: '1.5px dashed #38bdf8',
              color: '#0284c7',
              fontSize: '14px',
              fontWeight: '800'
            }}>
              <span>🔴 লাইভ শুনছি: &quot;{interimText || 'কথা বলুন...'}&quot;</span>
            </div>
          )}
        </div>

        {/* 3. Real-time Breakdown Card */}
        {parseResult && (
          <div style={{
            background: parseResult.type === 'noise_ignored' ? '#fef2f2' : '#ecfdf5',
            border: `1.5px solid ${parseResult.type === 'noise_ignored' ? '#fca5a5' : '#86efac'}`,
            borderRadius: '16px',
            padding: '14px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '900',
                padding: '2px 8px',
                borderRadius: '6px',
                background: parseResult.type === 'noise_ignored' ? '#fee2e2' : '#d1fae5',
                color: parseResult.type === 'noise_ignored' ? '#dc2626' : '#047857'
              }}>
                {parseResult.type === 'add_items' ? '✓ পণ্য শনাক্তকরণ সফল' : parseResult.type === 'noise_ignored' ? '🛡️ অনাকাঙ্ক্ষিত নয়েজ ফিল্টার' : 'কমান্ড শনাক্তকরণ'}
              </span>

              {parseResult.targetCounterId && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: '900',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#e0e7ff',
                  color: '#4338ca'
                }}>
                  🎯 টার্গেট: কাউন্টার {parseResult.targetCounterId}
                </span>
              )}
            </div>

            <div style={{ fontSize: '13.5px', marginBottom: '8px', color: '#0f172a' }}>
              <strong>🗣️ আপনার কণ্ঠ:</strong> &quot;{parseResult.rawSpeech}&quot;
            </div>

            {/* If Items Matched */}
            {parseResult.type === 'add_items' && parseResult.items && parseResult.items.length > 0 && (
              <div style={{ display: 'grid', gap: '6px' }}>
                {parseResult.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #a7f3d0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px', color: '#065f46' }}>
                        💊 {it.banglaName || it.name}
                      </strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        পরিমাণ: <strong>{it.quantity} {it.unit}</strong> • দর: <strong>৳{it.unitPrice}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="num-font" style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>
                        মোট: ৳{it.totalPrice}
                      </span>
                      {onTestProductAdd && (
                        <button
                          type="button"
                          onClick={() => onTestProductAdd(parseResult.targetCounterId || 1, it)}
                          style={{
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          কাউন্টারে পাঠান ➔
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* If Noise Filtered */}
            {parseResult.type === 'noise_ignored' && (
              <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                💡 <strong>ব্যাখ্যা:</strong> {parseResult.explanation}। আশপাশের সাধারণ কথোপকথন মেমোতে যুক্ত হবে না।
              </div>
            )}
          </div>
        )}

        {/* 4. 1-Tap Sample Phrases for Rapid Verification */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '8px' }}>
            ⚡ মুখে না বলে ১-ক্লিকেই টেস্ট করুন (নমুনা বাক্য):
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              'নাপা ৩ পাতা',
              'কাউন্টার ২: সারজেল ২০টা',
              '১ নম্বর কাউন্টার নাপা ২ পাতা',
              'প্যারাসিটামল ২ ফাইল',
              'হাফ কেজি চিনি ৫০ টাকা',
              '২টা লাক্স সাবান',
              'ভাই ডাক্তার কখন আসবে (নয়েজ ফিল্টার)',
              'কাউন্টার ৩: ২টা স্যাভলন'
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => processTranscript(sample.replace(' (নয়েজ ফিল্টার)', ''))}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '5px 11px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🗣️</span>
                <span>{sample}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 5. Recent Test Log */}
        {history.length > 0 && (
          <div>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>
              📜 সাম্প্রতিক টেস্ট লগ:
            </span>
            <div style={{ display: 'grid', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
              {history.map((h, i) => (
                <div
                  key={i}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11.5px'
                  }}
                >
                  <span style={{ color: '#0f172a', fontWeight: '700' }}>&quot;{h.text}&quot;</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{
                      color: h.result.type === 'add_items' ? '#059669' : h.result.type === 'noise_ignored' ? '#dc2626' : '#2563eb',
                      fontWeight: '800'
                    }}>
                      {h.result.type === 'add_items' ? `${h.result.items?.length}টি পণ্য` : h.result.type === 'noise_ignored' ? 'নয়েজ ফিল্টার' : h.result.type}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '10.5px' }} className="num-font">{h.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
