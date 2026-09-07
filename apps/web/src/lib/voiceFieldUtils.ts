'use client';

// Sound effect generator for auditory confirmation
export function playVoiceBeep(freq = 880, type: OscillatorType = 'sine', duration = 0.12) {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// Convert Bangla digits and spoken Bangla number words into numeric strings
export function parseBanglaNumber(text: string): string {
  if (!text) return '';
  let str = text.trim();

  // Replace Bangla digits ०-९
  str = str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());

  // Common Bengali number words
  const wordMap: Record<string, string> = {
    'এক': '1', 'দুই': '2', 'তিন': '3', 'চার': '4', 'পাঁচ': '5',
    'ছয়': '6', 'ছয়': '6', 'সাত': '7', 'আট': '8', 'নয়': '9', 'নয়': '9', 'দশ': '10',
    'বিশ': '20', 'ত্রিশ': '30', 'চল্লিশ': '40', 'পঞ্চাশ': '50', 'ষাট': '60', 'সত্তর': '70', 'আশি': '80', 'নব্বই': '90',
    'দেড়শ': '150', 'দেড়শ': '150', 'আড়াইশ': '250', 'আড়াইশ': '250', 'সাড়ে তিনশ': '350',
    'একশ': '100', 'দুইশ': '200', 'তিনশ': '300', 'চারশ': '400', 'পাঁচশ': '500', 'ছয়শ': '600', 'সাতশ': '700', 'আটশ': '800', 'নয়শ': '900',
    'এক হাজার': '1000', 'দুই হাজার': '2000', 'পাঁচ হাজার': '5000', 'দশ হাজার': '10000', 'হাজার': '1000'
  };

  for (const [w, num] of Object.entries(wordMap)) {
    if (str.includes(w)) {
      str = str.replace(new RegExp(w, 'g'), num);
    }
  }

  // Extract first valid numeric match
  const match = str.match(/\d+(\.\d+)?/);
  return match ? match[0] : str.replace(/[^0-9.]/g, '') || text;
}

export interface VoiceFieldOptions {
  label?: string;
  isNumeric?: boolean;
  onResult: (value: string) => void;
}

// Global dispatcher to launch the Interactive Voice Field HUD
export function triggerFieldVoiceInput(options: VoiceFieldOptions) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('open-voice-field-hud', { detail: options }));
}
