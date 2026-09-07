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

// Hardware & WebAudio noise filter setup for close-proximity near-field voice capture with vocal bandpass filter
export async function getNearFieldAudioStream(): Promise<{
  stream: MediaStream | null;
  analyser: AnalyserNode | null;
  audioCtx: AudioContext | null;
}> {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { stream: null, analyser: null, audioCtx: null };
    }

    // Explicit hardware beamforming & noise cancellation constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 }
      }
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);

      // 1. Highpass filter to eliminate counter table thumps / background rumbles (< 250Hz)
      const highpass = audioCtx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(250, audioCtx.currentTime);

      // 2. Lowpass filter to eliminate high frequency clinking / taps / hiss (> 3500Hz)
      const lowpass = audioCtx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(3500, audioCtx.currentTime);

      // 3. Dynamic Compressor to even out near-field speaker vs distant whispers
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-30, audioCtx.currentTime);
      compressor.knee.setValueAtTime(30, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(10, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.25, audioCtx.currentTime);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      compressor.connect(analyser);

      return { stream, analyser, audioCtx };
    }

    return { stream, analyser: null, audioCtx: null };
  } catch (e) {
    console.warn('Near-field noise suppression stream could not be initialized:', e);
    return { stream: null, analyser: null, audioCtx: null };
  }
}

// Convert Bangla digits and spoken Bangla number words into numeric strings (with noise tolerance)
export function parseBanglaNumber(text: string): string {
  if (!text) return '';
  let str = text.trim();

  // Replace Bangla digits ०-९
  str = str.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());

  // Remove common verbal price suffixes and noise fillers
  str = str.replace(/টাকা|টাকার|টাকায়|পয়সা|পয়সা|টি|টা|কেজি|গ্রাম|লিটার|পিস|বক্স|ভাই|দোকান|দেন|দাও/g, ' ');

  // Compound & special phrases (phonetically tolerant)
  const phraseMap: Record<string, string> = {
    'দেড় হাজার': '1500', 'দেড় হাজার': '1500', 'দের হাজার': '1500',
    'আড়াই হাজার': '2500', 'আড়াই হাজার': '2500', 'আরাই হাজার': '2500',
    'সাড়ে তিন হাজার': '3500', 'সাড়ে তিন হাজার': '3500',
    'সাড়ে চার হাজার': '4500', 'সাড়ে চার হাজার': '4500',
    'সাড়ে পাঁচ হাজার': '5500', 'সাড়ে পাঁচ হাজার': '5500',
    'দেড়শো': '150', 'দেড়শো': '150', 'দেড়শ': '150', 'দেড়শ': '150', 'দেরশ': '150',
    'আড়াইশো': '250', 'আড়াইশো': '250', 'আড়াইশ': '250', 'আড়াইশ': '250', 'আরাইশ': '250',
    'সাড়ে তিনশো': '350', 'সাড়ে তিনশো': '350', 'সাড়ে তিনশ': '350', 'সাড়ে তিনশ': '350',
    'সাড়ে চারশো': '450', 'সাড়ে চারশো': '450', 'সাড়ে চারশ': '450', 'সাড়ে চারশ': '450',
    'এক হাজার': '1000', 'দুই হাজার': '2000', 'তিন হাজার': '3000', 'চার হাজার': '4000',
    'পাঁচ হাজার': '5000', 'পাচ হাজার': '5000', 'ছয় হাজার': '6000', 'সাত হাজার': '7000', 'আট হাজার': '8000',
    'নয় হাজার': '9000', 'দশ হাজার': '10000', 'বিশ হাজার': '20000', 'পঞ্চাশ হাজার': '50000',
    'এক লাখ': '100000', 'দুই লাখ': '200000', 'পাঁচ লাখ': '500000'
  };

  for (const [phrase, val] of Object.entries(phraseMap)) {
    if (str.includes(phrase)) {
      str = str.replace(new RegExp(phrase, 'g'), val);
    }
  }

  // Hundreds
  const hundredMap: Record<string, string> = {
    'একশত': '100', 'একশো': '100', 'একশ': '100',
    'দুইশত': '200', 'দুইশো': '200', 'দুশো': '200', 'দুইশ': '200',
    'তিনশত': '300', 'তিনশো': '300', 'তিনশ': '300',
    'চারশত': '400', 'চারশো': '400', 'চারশ': '400',
    'পাঁচশত': '500', 'পাঁচশো': '500', 'পাঁচশ': '500', 'পাচশ': '500', 'পাচ শত': '500',
    'ছয়শত': '600', 'ছয়শো': '600', 'ছয়শ': '600',
    'সাতশত': '700', 'সাতশো': '700', 'সাতশ': '700',
    'আটশত': '800', 'আটশো': '800', 'আটশ': '800',
    'নয়শত': '900', 'নয়শো': '900', 'নয়শ': '900',
    'হাজার': '000', 'লাখ': '00000'
  };

  for (const [w, val] of Object.entries(hundredMap)) {
    if (str.includes(w)) {
      str = str.replace(new RegExp(w, 'g'), val);
    }
  }

  // Basic units & tens
  const wordMap: Record<string, string> = {
    'শূন্য': '0', 'এক': '1', 'দুই': '2', 'তিন': '3', 'চার': '4', 'পাঁচ': '5', 'পাচ': '5',
    'ছয়': '6', 'ছয়': '6', 'সাত': '7', 'আট': '8', 'নয়': '9', 'নয়': '9', 'দশ': '10', 'দস': '10',
    'এগারো': '11', 'বারো': '12', 'তেরো': '13', 'চৌদ্দ': '14', 'পনেরো': '15',
    'ষোলো': '16', 'সতেরো': '17', 'আঠারো': '18', 'উনিশ': '19', 'বিশ': '20',
    'পঁচিশ': '25', 'পচিশ': '25', 'ত্রিশ': '30', 'পঁয়ত্রিশ': '35', 'চল্লিশ': '40', 'পঁয়তাল্লিশ': '45',
    'পঞ্চাশ': '50', '৫৫': '55', 'ষাট': '60', '৬৫': '65', 'সত্তর': '70',
    '৭৫': '75', 'আশি': '80', '৮৫': '85', 'নব্বই': '90', '৯৫': '95'
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

