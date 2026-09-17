'use client';

/**
 * 🔊 100% OFFLINE BENGALI SOUNDBOX & AUDIO SYNTHESIZER
 * Runs entirely on the device CPU using Web Audio API + SpeechSynthesis.
 * ZERO internet required. Works 100% offline.
 */

// Web Audio Context Singleton
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * 🎵 Play Synthesized Melodious Chime (Cash / Success / Announcement)
 */
export function playSynthesizedChime(type: 'cash' | 'success' | 'alert' | 'beep' | 'mic_start' | 'mic_stop' = 'success') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'cash') {
      // 💵 Realistic Double Cash Register Bell (100% Offline Synth)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.53, now); // B6
      osc2.frequency.exponentialRampToValueAtTime(2637.02, now + 0.12); // E7

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } else if (type === 'success') {
      // 🌟 Uplifting 3-tone chime (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } else if (type === 'alert') {
      // ⚠️ Warning 2-tone buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'mic_start') {
      // 🎙️ Mic active chime (G4 -> C5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.1);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'mic_stop') {
      // 🛑 Mic stop tone (C5 -> G4)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(392, now + 0.09);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Standard gentle click/beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    console.warn('[OfflineAudio] Sound error:', e);
  }
}

/**
 * 🗣️ ROBUST OFFLINE SPEECH SYNTHESIS ENGINE
 * Speaks Bengali sentences aloud even when 100% disconnected from the internet.
 */
export function speakOfflineText(
  text: string,
  onDone?: () => void,
  forceSpeak = true
): boolean {
  if (typeof window === 'undefined' || !text) return false;

  // Clean text
  const clean = String(text)
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[*_#`~]/g, '')
    .trim();

  if (!clean) return false;

  // 1. Play announcement start cue
  if (/টাকা|বিক্রি|মেমো|পরিশোধ|জমা|ক্যাশ/i.test(clean)) {
    playSynthesizedChime('cash');
  } else if (/সফল|যুক্ত|হয়েছে|যোগ/i.test(clean)) {
    playSynthesizedChime('success');
  } else {
    playSynthesizedChime('beep');
  }

  // 2. Check browser Web Speech Synthesis
  if (!('speechSynthesis' in window)) {
    if (onDone) setTimeout(onDone, 500);
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterances

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick best available voice (Bengali -> Hindi/Indian English -> Default)
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali'));
    const inVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('hi') || v.name.toLowerCase().includes('india'));

    if (bnVoice) {
      utterance.voice = bnVoice;
      utterance.lang = bnVoice.lang;
    } else if (inVoice) {
      utterance.voice = inVoice;
      utterance.lang = inVoice.lang;
    } else if (voices.length > 0) {
      const defVoice = voices.find(v => v.default) || voices[0];
      if (defVoice) {
        utterance.voice = defVoice;
        utterance.lang = defVoice.lang;
      }
    } else {
      utterance.lang = 'bn-BD';
    }

    // Set flag for echo prevention and retain reference
    (window as any).__IS_TTS_SPEAKING__ = true;
    (window as any).__CURRENT_OFFLINE_UTTERANCE__ = utterance;

    utterance.onend = () => {
      (window as any).__IS_TTS_SPEAKING__ = false;
      (window as any).__CURRENT_OFFLINE_UTTERANCE__ = null;
      if (onDone) onDone();
    };

    utterance.onerror = () => {
      (window as any).__IS_TTS_SPEAKING__ = false;
      (window as any).__CURRENT_OFFLINE_UTTERANCE__ = null;
      if (onDone) onDone();
    };

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    (window as any).__IS_TTS_SPEAKING__ = false;
    if (onDone) setTimeout(onDone, 500);
    return false;
  }
}
