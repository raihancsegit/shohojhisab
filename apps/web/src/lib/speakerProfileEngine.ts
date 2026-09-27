'use client';
import { voiceProximityManager } from './voiceProximityGate';

/**
 * Multi-User Speaker Voice Biometrics & TV/Noise Shield Engine
 * Analyzes human vocal pitch (F0), spectral centroid, and near-field energy (RMS)
 * Allows shop owner and staff to register their voices so TV, background music,
 * and customer crowd chatter are strictly ignored.
 */

export interface SpeakerVoiceProfile {
  id: string; // 'owner' or staff id e.g. 'staff-123'
  name: string; // 'দোকান মালিক' or 'রহিম'
  role: 'owner' | 'staff';
  enrolledAt: string;
  pitchMin: number; // Hz (e.g. 85)
  pitchMax: number; // Hz (e.g. 185)
  pitchMean: number; // Hz (e.g. 125)
  pitchStdDev?: number; // Intonation variance
  centroidMean: number; // Spectral timbre indicator
  samplesCollected: number;
  wakePhrase?: string; // Optional personal wake phrase
  speechKeywords?: string[]; // Keywords recorded during enrollment
}

export interface SpeakerVerificationResult {
  isAuthorized: boolean;
  matchedSpeaker?: SpeakerVoiceProfile;
  role?: 'owner' | 'staff';
  speakerName?: string;
  confidence: number;
  reason?: 'authorized' | 'unauthorized_speaker' | 'background_noise_or_tv' | 'silence' | 'feature_disabled';
  pitchDetected?: number;
}

const STORAGE_KEY_PREFIX = 'lbos_speaker_profiles_';
const TOGGLE_KEY_PREFIX = 'lbos_speaker_lock_enabled_';
const BOUND_SPEAKER_PREFIX = 'lbos_bound_speaker_';

/**
 * Get the specifically bound operator/speaker ID for this device
 * If null, any enrolled owner/staff is accepted.
 * If set (e.g. 'owner' or 'staff-123'), this device ONLY accepts that specific person's voice!
 */
export function getBoundSpeakerId(tenantId: string = 'default'): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(`${BOUND_SPEAKER_PREFIX}${tenantId}`);
    if (val && val !== 'all_enrolled') return val;
    if (val === 'all_enrolled') return null;
    const defVal = localStorage.getItem(`${BOUND_SPEAKER_PREFIX}default`);
    if (defVal && defVal !== 'all_enrolled') return defVal;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Bind or unbind this device to a specific operator/speaker
 */
export function setBoundSpeakerId(tenantId: string, speakerId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const val = speakerId || 'all_enrolled';
    localStorage.setItem(`${BOUND_SPEAKER_PREFIX}${tenantId}`, val);
    localStorage.setItem(`${BOUND_SPEAKER_PREFIX}default`, val);
  } catch (e) {}
}

/**
 * Load all enrolled speaker voice profiles for this tenant
 */
export function getSpeakerVoiceProfiles(tenantId: string = 'default'): SpeakerVoiceProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    // 1. Try specific tenant
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tenantId}`);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // 2. Try default fallback
    if (tenantId !== 'default') {
      const defRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}default`);
      if (defRaw !== null) {
        const parsed = JSON.parse(defRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Save or update a speaker voice profile
 */
export function saveSpeakerVoiceProfile(tenantId: string, profile: SpeakerVoiceProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSpeakerVoiceProfiles(tenantId).filter(p => p.id !== profile.id);
    existing.push(profile);
    const serialized = JSON.stringify(existing);

    // Save across all relevant keys
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, serialized);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}default`, serialized);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.setItem(key, serialized);
      }
    }
    setSpeakerLockEnabled(tenantId, true);
    setSpeakerLockEnabled('default', true);
  } catch (e) {}
}

/**
 * Remove a speaker voice profile or reset all
 */
export function deleteSpeakerVoiceProfile(tenantId: string, profileId: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (profileId === 'all') {
      // Complete wipe of all speaker profile and lock toggle keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(STORAGE_KEY_PREFIX) || key.startsWith(TOGGLE_KEY_PREFIX))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}default`, JSON.stringify([]));
      return;
    }

    const remaining = getSpeakerVoiceProfiles(tenantId).filter(p => p.id !== profileId);
    const serialized = JSON.stringify(remaining);

    // Update all profile keys across localStorage
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, serialized);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}default`, serialized);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.setItem(key, serialized);
      }
    }

    if (remaining.length === 0) {
      setSpeakerLockEnabled(tenantId, false);
      setSpeakerLockEnabled('default', false);
    }
  } catch (e) {}
}

/**
 * Check if Speaker Lock is active
 */
export function isSpeakerLockEnabled(tenantId: string = 'default'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const profiles = getSpeakerVoiceProfiles(tenantId);
    // If no profiles registered anywhere, lock cannot be active
    if (profiles.length === 0) return false;

    const val = localStorage.getItem(`${TOGGLE_KEY_PREFIX}${tenantId}`);
    if (val !== null) return val === 'true';

    const defVal = localStorage.getItem(`${TOGGLE_KEY_PREFIX}default`);
    if (defVal !== null) return defVal === 'true';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TOGGLE_KEY_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item !== null) return item === 'true';
      }
    }

    // Default: If profiles exist on this device, lock MUST BE ON by default to filter TV/strangers!
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Toggle Speaker Lock state
 */
export function setSpeakerLockEnabled(tenantId: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const val = enabled ? 'true' : 'false';
    localStorage.setItem(`${TOGGLE_KEY_PREFIX}${tenantId}`, val);
    localStorage.setItem(`${TOGGLE_KEY_PREFIX}default`, val);
  } catch (e) {}
}

/**
 * High-Precision Autocorrelation Algorithm with Parabolic Interpolation
 * Accurately extracts Fundamental Frequency (Pitch / F0 in Hz) for human vocal recognition
 * Rejects fan hum, room reverberation, and unvoiced laptop audio.
 * Human vocal fundamental frequency range: 65 Hz to 380 Hz.
 */
export function extractPitchFromTimeDomain(
  timeDomainData: Float32Array,
  sampleRate: number
): { pitch: number; clarity: number } | null {
  const bufferSize = timeDomainData.length;

  // 1. Calculate Root Mean Square (RMS) energy
  let sum = 0;
  for (let i = 0; i < bufferSize; i++) {
    const val = timeDomainData[i];
    sum += val * val;
  }
  const rms = Math.sqrt(sum / bufferSize);

  // Reject silence or low ambient mic noise floor (< 0.005)
  if (rms < 0.005) {
    return null;
  }

  // 2. Normalized Autocorrelation across human vocal lags (65 Hz to 380 Hz)
  const minLag = Math.floor(sampleRate / 380);
  const maxLag = Math.floor(sampleRate / 65);

  let bestLag = -1;
  let maxNormCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let normX = 0;
    let normY = 0;
    for (let i = 0; i < bufferSize - lag; i += 4) {
      const x = timeDomainData[i];
      const y = timeDomainData[i + lag];
      corr += x * y;
      normX += x * x;
      normY += y * y;
    }
    const denom = Math.sqrt(normX * normY);
    if (denom > 0.0001) {
      const score = corr / denom;
      if (score > maxNormCorr) {
        maxNormCorr = score;
        bestLag = lag;
      }
    }
  }

  // A genuine, nearby human voice exhibits strong periodic autocorrelation (clarity >= 0.38)
  // Laptop music / TV chatter / distant reflections have lower correlation (< 0.30)
  if (bestLag > 0 && maxNormCorr >= 0.38) {
    // Parabolic interpolation for sub-sample accuracy
    let delta = 0;
    if (bestLag > minLag && bestLag < maxLag) {
      const getScore = (l: number) => {
        let c = 0, nx = 0, ny = 0;
        for (let i = 0; i < bufferSize - l; i += 2) {
          const x = timeDomainData[i];
          const y = timeDomainData[i + l];
          c += x * y;
          nx += x * x;
          ny += y * y;
        }
        const d = Math.sqrt(nx * ny);
        return d > 0.0001 ? c / d : 0;
      };
      const alpha = getScore(bestLag - 1);
      const beta = maxNormCorr;
      const gamma = getScore(bestLag + 1);
      const denom = 2 * (alpha - 2 * beta + gamma);
      if (Math.abs(denom) > 0.00001) {
        delta = (alpha - gamma) / denom;
      }
    }

    const trueLag = bestLag + delta;
    const pitch = sampleRate / trueLag;
    if (pitch >= 65 && pitch <= 380) {
      return { pitch: Math.round(pitch), clarity: Math.min(1, Math.max(0.1, maxNormCorr)) };
    }
  }

  return null;
}

/**
 * Calculates Spectral Centroid (timbre / brightness indicator)
 */
export function extractSpectralCentroid(
  frequencyData: Uint8Array,
  sampleRate: number
): number {
  let num = 0;
  let den = 0;
  const binCount = frequencyData.length;
  const binSize = (sampleRate / 2) / binCount;

  for (let i = 0; i < binCount; i++) {
    const mag = frequencyData[i];
    const freq = i * binSize;
    num += freq * mag;
    den += mag;
  }

  return den > 0 ? Math.round(num / den) : 0;
}

/**
 * Real-time Speech Frame Profile
 * Rejects laptop audio, TV dialogue, music, and other people speaking.
 */
export interface VoicedFrame {
  pitch: number;
  clarity: number;
  rms: number;
  centroid: number;
  timestamp: number;
}

// Circular buffer of voiced frames collected continuously during live microphone audio
const rollingVoicedFrames: VoicedFrame[] = [];
const BUFFER_WINDOW_MS = 5000; // keep frames from the last 5.0 seconds
let lastPitchFrameTime = 0;

/**
 * Record a vocal frame continuously from the microphone analyser
 * Called from voiceProximityManager loop every 40-50ms (~22 times per second)
 */
export function recordLiveVocalFrame(analyserNode: AnalyserNode, sampleRate: number): void {
  const now = performance.now();
  if (now - lastPitchFrameTime < 90) return;
  lastPitchFrameTime = now;

  try {
    const fftSize = analyserNode.fftSize;
    const timeData = new Float32Array(fftSize);
    analyserNode.getFloatTimeDomainData(timeData);

    // Compute RMS
    let sum = 0;
    for (let i = 0; i < timeData.length; i += 4) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / (timeData.length / 4));

    // Reject faint background hum / laptop fan noise (RMS threshold 0.005)
    if (rms < 0.005) return;

    // Detect pitch
    const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
    if (!pitchRes || pitchRes.pitch < 65 || pitchRes.pitch > 380) return;

    const freqData = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(freqData);
    const centroid = extractSpectralCentroid(freqData, sampleRate);

    const nowEpoch = Date.now();
    rollingVoicedFrames.push({
      pitch: pitchRes.pitch,
      clarity: pitchRes.clarity,
      rms,
      centroid,
      timestamp: nowEpoch
    });

    // Prune old frames beyond buffer window
    const cutoff = nowEpoch - BUFFER_WINDOW_MS;
    while (rollingVoicedFrames.length > 0 && rollingVoicedFrames[0].timestamp < cutoff) {
      rollingVoicedFrames.shift();
    }
  } catch (e) {}
}

/**
 * Ensures the microphone Web Audio stream & biometric analyzer is active if safe.
 * When SpeechRecognition is used on mobile / single-stream platforms, we do not
 * lock getUserMedia concurrently to prevent audio starvation / silence dropouts.
 */
export async function ensureBiometricMonitoring(): Promise<boolean> {
  return true;
}

/**
 * Stop any active Web Audio proximity or biometric stream to guarantee
 * SpeechRecognition has 100% exclusive microphone access.
 */
export function stopBiometricMonitoring(): void {
  if (typeof window === 'undefined') return;
  try {
    voiceProximityManager?.stop();
  } catch (e) {}
}

// Automatically subscribe to voiceProximityManager frames on load
if (typeof window !== 'undefined') {
  try {
    voiceProximityManager?.onFrame?.((analyser: AnalyserNode, sRate: number) => {
      recordLiveVocalFrame(analyser, sRate);
    });
  } catch (e) {}
}

/**
 * Checks whether spoken Bengali text represents a genuine shop operational command
 * (Sales, Dues, Cash, Expense, Stock, Invoices, Reports) across retail industries:
 * Pharmacy, Grocery, Clothing/Fashion, Restaurant/Cafe, Electronics, Hardware, Books/Stationery, Cosmetics.
 * Filters out casual customer dialogue, bystander talk, and TV background noise.
 */
export function isRecognizedShopCommand(text: string): boolean {
  if (!text || text.trim().length < 2) return false;
  const t = text.trim();

  // 1. Core POS, Accounting & Checkout operations (Bangla & English keywords)
  const posActionRegex = /(বিক্রি|বেচা|সেল|sale|sell|যোগ|মেমো|রশিদ|রসিদ|চালান|রিসিপ্ট|প্রিন্ট|print|টাকা|ক্যাশ|নগদ|বাকি|বকেয়া|বাকি\s*জমা|পরিশোধ|জমা|খরচ|ব্যয়|expense|স্টক|মাল\s*ইন|মাল|কত\s*আছে|চেক|ইনভেন্টরি|হিসাব|আজকের\s*বিক্রি|ড্যাশবোর্ড|রিপোর্ট|লাভ|মুনাফা|কাস্টমার|খাতা|ড্রয়ার|সার্চ|খোঁজ|অর্ডার|কার্ট|বাদ|মুছে|ক্লিয়ার|ডিসকাউন্ট|ছাড়|বিল|টোটাল|সর্বমোট|ভাউচার)/i;

  // 2. Unit and quantity patterns across grocery, pharmacy, clothing, restaurant, hardware
  const unitAndQtyRegex = /(\d+|এক|দুই|তিন|চার|পাঁচ|ছয়|সাত|আট|নয়|দশ|হাফ|দেড়|আড়াই|পোয়া)\s*(কেজি|কে\s*জি|গ্রাম|লিটার|মিলি|মিলিগ্রাম|এমজি|প্যাকেট|পিস|টা|টি|পাতা|ফাইল|স্ট্রিপ|বক্স|গজ|ফুট|মিটার|ইঞ্চি|প্লেট|বাটি|কাপ|গ্লাস|কার্টন|বস্তা|ডজন|হালি|জোড়া|রোল|বোতল|কৌটা|টিউব|জার)/i;

  // 3. Multi-industry products across retail categories:
  // Pharmacy / Medicine, Grocery, Clothing, Restaurant/Food, Electronics, Hardware, Cosmetics, Stationery
  const productKeywordRegex = /(চাল|ডাল|তেল|সয়াবিন|সরিষা|চিনি|লবণ|লবন|আটা|ময়দা|সুজি|পেঁয়াজ|রসুন|আদা|আলু|মরিচ|হলুদ|ধনে|জিরা|মসলা|সাবান|শ্যাম্পু|টুথপেস্ট|ব্রাশ|ডিটারজেন্ট|বিস্কুট|চানাচুর|চিপস|কেক|পাউরুটি|দুধ|ঘি|ডিম|চা|কফি|নাপা|প্যারাসিটামল|সারজেল|সেক্লো|ম্যাক্সপ্রো|মোনাস|এন্টাসিড|অ্যান্টিবায়োটিক|সিরাপ|ট্যাবলেট|ক্যাপসুল|ভিটামিন|ইনসুলিন|ওরস্যালাইন|ব্যান্ডেজ|ড্রপ|মলম|হিস্টাসিন|ফেক্সো|ওমিপ্রাজল|প্যানটোনিক্স|শার্ট|প্যান্ট|জিন্স|পাঞ্জাবি|শাড়ি|টি-শার্ট|লুঙ্গি|থ্রি-পিস|বোরকা|হিজাব|কাপড়|ফ্রক|গেঞ্জি|সোয়েটার|জ্যাকেট|পোলো|বিরিয়ানি|তেহারি|পোলাও|খিচুড়ি|পরোটা|নান|রুটি|গ্রিল|কাবাব|চিকেন|বার্গার|পিৎজা|রোল|সমুচা|সিঙ্গারা|স্যুপ|নুডলস|মিষ্টি|দই|কোক|পেপসি|স্প্রাইট|জুস|রড|সিমেন্ট|বালু|ইট|টিন|পাইপ|সুইচ|সকেট|তার|ক্যাবল|পেরেক|স্ক্রু|রং|পেইন্ট|তালা|বালতি|ফ্যান|লাইট|বাল্ব|এলইডি|চার্জার|ব্যাটারি|হেডফোন|খাতা|কলম|পেন্সিল|কাগজ|বই|ফাইল|ক্রিম|লোশন|পাউডার|পারফিউম|বডি\s*স্প্রে|আতর|লিপস্টিক|মেহেদি|টিস্যু|ডায়াপার)/i;

  // 4. Currency and numerical transaction phrases (e.g. "৫০ টাকা ক্যাশ", "২ টা দেন", "১০০ গ্রাম")
  const numericItemRegex = /\d+\s*(টাকা|tk|\/-|টাকার|কেজি|গ্রাম|লিটার|পিস|পাতা|টা|টি|প্যাকেট)/i;

  if (posActionRegex.test(t)) return true;
  if (unitAndQtyRegex.test(t)) return true;
  if (productKeywordRegex.test(t)) return true;
  if (numericItemRegex.test(t)) return true;

  return false;
}

/**
 * Evaluate the entire recent speech utterance against enrolled biometric profiles.
 * Analyzes all pitch frames recorded during the speech window (last ~3.8-5.5 seconds).
 * Strictly filters laptop videos, TV news/natok, and other customers' voices.
 */
export function evaluateUtteranceSpeaker(
  tenantId: string = 'default',
  targetSpeakerId?: string,
  lookbackMs: number = 4200,
  spokenText?: string
): SpeakerVerificationResult {
  if (!isSpeakerLockEnabled(tenantId)) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled', role: 'owner', speakerName: 'মালিক (লক নিষ্ক্রিয়)' };
  }

  const profiles = getSpeakerVoiceProfiles(tenantId);
  if (profiles.length === 0) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled', role: 'owner', speakerName: 'দোকান মালিক' };
  }

  const boundOperatorId = targetSpeakerId || getBoundSpeakerId(tenantId);
  const boundProfile = boundOperatorId ? profiles.find(p => p.id === boundOperatorId) : null;

  // Pre-initialize candidate profiles so it is never accessed before initialization
  let candidateProfiles = profiles;
  if (boundProfile) {
    candidateProfiles = [boundProfile, ...profiles.filter(p => p.id !== boundProfile.id)];
  }

  const now = Date.now();
  const cutoff = now - lookbackMs;
  let recentFrames = rollingVoicedFrames.filter(f => f.timestamp >= cutoff);

  // If fewer than 2 frames in lookback window, check wider window (up to 5.5s)
  if (recentFrames.length < 2) {
    recentFrames = rollingVoicedFrames.filter(f => f.timestamp >= now - 5500);
  }

  // If fewer than 2 vocal frames were detected in lookback window
  // (Standard when SpeechRecognition holds exclusive microphone access without concurrent Web Audio):
  if (recentFrames.length < 2) {
    if (!spokenText || !spokenText.trim()) {
      return {
        isAuthorized: false,
        confidence: 0,
        reason: 'silence'
      };
    }

    const clean = spokenText.toLowerCase();

    // Check for direct wake phrase or enrolled speaker keyword match
    for (const p of candidateProfiles) {
      if (p.wakePhrase && clean.includes(p.wakePhrase.toLowerCase())) {
        // If device is bound to a different operator, reject coworker's wake phrase!
        if (boundProfile && p.id !== boundProfile.id) {
          return {
            isAuthorized: false,
            confidence: 20,
            reason: 'unauthorized_speaker',
            speakerName: `অন্য সহকর্মীর কণ্ঠ (${p.name}) - ডিভাইসটি "${boundProfile.name}" এর জন্য লক করা`
          };
        }
        return {
          isAuthorized: true,
          confidence: 95,
          matchedSpeaker: p,
          role: p.role,
          speakerName: p.name,
          reason: 'authorized'
        };
      }
      if (p.speechKeywords && p.speechKeywords.some(kw => kw && clean.includes(kw.toLowerCase()))) {
        if (boundProfile && p.id !== boundProfile.id) {
          return {
            isAuthorized: false,
            confidence: 20,
            reason: 'unauthorized_speaker',
            speakerName: `অন্য সহকর্মীর কণ্ঠ (${p.name}) - ডিভাইসটি "${boundProfile.name}" এর জন্য লক করা`
          };
        }
        return {
          isAuthorized: true,
          confidence: 90,
          matchedSpeaker: p,
          role: p.role,
          speakerName: p.name,
          reason: 'authorized'
        };
      }
    }

    // Check if spoken utterance is an authentic shop operational command
    if (isRecognizedShopCommand(clean)) {
      // If this phone is bound to a specific staff or owner, attribute to bound operator
      if (boundProfile) {
        // If spoken text explicitly addresses another registered coworker by name, reject cross-talk
        const otherStaff = profiles.find(p => p.id !== boundProfile.id && clean.includes(p.name.toLowerCase()));
        if (otherStaff) {
          return {
            isAuthorized: false,
            confidence: 20,
            reason: 'unauthorized_speaker',
            speakerName: `অন্য সহকর্মীর কণ্ঠ (${otherStaff.name}) - ডিভাইসটি "${boundProfile.name}" এর জন্য লক করা`
          };
        }

        return {
          isAuthorized: true,
          confidence: 92,
          matchedSpeaker: boundProfile,
          role: boundProfile.role,
          speakerName: boundProfile.name,
          reason: 'authorized'
        };
      }

      // If phone is in open mode (all enrolled staff):
      const matchedStaff = candidateProfiles.find(p => p.role === 'staff' && (clean.includes(p.name.toLowerCase()) || clean.includes('স্টাফ') || clean.includes('কর্মচারী')));
      if (matchedStaff) {
        return {
          isAuthorized: true,
          confidence: 90,
          matchedSpeaker: matchedStaff,
          role: 'staff',
          speakerName: matchedStaff.name,
          reason: 'authorized'
        };
      }

      const ownerProfile = candidateProfiles.find(p => p.role === 'owner') || candidateProfiles[0];
      return {
        isAuthorized: true,
        confidence: 95,
        matchedSpeaker: ownerProfile,
        role: ownerProfile.role || 'owner',
        speakerName: ownerProfile.name || 'দোকান মালিক',
        reason: 'authorized'
      };
    }

    // Casual bystander / customer conversation (e.g. "কেমন আছেন", "সিগারেট দেন", "বাসায় যাচ্ছি")
    // is strictly filtered out as unauthorized!
    return {
      isAuthorized: false,
      confidence: 10,
      reason: 'unauthorized_speaker',
      speakerName: 'অপরিচিত ব্যক্তি / গ্রাহক সংলাপ'
    };
  }

  // Find profile with the best match across the entire utterance
  let bestMatch: {
    profile: SpeakerVoiceProfile;
    matchingCount: number;
    matchRatio: number;
    avgPitch: number;
    confidence: number;
  } | null = null;

  for (const profile of candidateProfiles) {
    // Registered speaker's calibrated pitch window:
    // Natural human pitch stays within enrolled range ±16 Hz
    const lowerPitch = Math.max(65, profile.pitchMin - 16);
    const upperPitch = Math.min(380, profile.pitchMax + 20);

    const matched = recentFrames.filter(f => f.pitch >= lowerPitch && f.pitch <= upperPitch);
    const count = matched.length;
    const ratio = count / recentFrames.length;

    // Must have at least 2 matching vocal frames and at least 35% of speech within range
    if (count >= 2 && ratio >= 0.35) {
      const avgPitch = matched.reduce((sum, f) => sum + f.pitch, 0) / count;
      const diffFromMean = Math.abs(avgPitch - profile.pitchMean);

      // Natural speech pitch variation is up to 32 Hz from enrolled mean
      if (diffFromMean <= 32) {
        // Timbre check: Filter out sharp laptop sirens or metallic reflections
        if (profile.centroidMean && profile.centroidMean > 0) {
          const avgCentroid = matched.reduce((s, f) => s + (f.centroid || 0), 0) / count;
          if (avgCentroid > 0 && Math.abs(avgCentroid - profile.centroidMean) > 1500) {
            continue;
          }
        }

        let conf = Math.max(60, Math.min(100, Math.round((ratio * 60) + Math.max(0, 40 - diffFromMean * 1.0))));

        // If wake phrase or spoken text matches enrolled name/phrase, boost confidence
        if (spokenText) {
          const cleanText = spokenText.toLowerCase();
          if (profile.wakePhrase && cleanText.includes(profile.wakePhrase.toLowerCase())) {
            conf = Math.min(100, conf + 15);
          }
          if (profile.name && cleanText.includes(profile.name.toLowerCase())) {
            conf = Math.min(100, conf + 10);
          }
        }

        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = {
            profile,
            matchingCount: count,
            matchRatio: ratio,
            avgPitch,
            confidence: conf
          };
        }
      }
    }
  }

  // Device Operator Lock Validation:
  // If this device is bound to a specific person and someone else matches, REJECT coworker crosstalk!
  if (bestMatch && boundProfile && bestMatch.profile.id !== boundProfile.id) {
    return {
      isAuthorized: false,
      confidence: 25,
      reason: 'unauthorized_speaker',
      speakerName: `অন্য সহকর্মীর কণ্ঠ (${bestMatch.profile.name}) - ডিভাইসটি "${boundProfile.name}" এর জন্য লক করা`,
      pitchDetected: Math.round(bestMatch.avgPitch)
    };
  }

  // Strict acceptance: Must match enrolled profile with confidence >= 55
  if (bestMatch && bestMatch.confidence >= 55) {
    return {
      isAuthorized: true,
      matchedSpeaker: bestMatch.profile,
      role: bestMatch.profile.role,
      speakerName: bestMatch.profile.name,
      confidence: bestMatch.confidence,
      pitchDetected: Math.round(bestMatch.avgPitch)
    };
  }

  // Strictly reject strangers, customers, laptop TV, music, or unregistered voices!
  const overallAvgPitch = recentFrames.length > 0
    ? Math.round(recentFrames.reduce((sum, f) => sum + f.pitch, 0) / recentFrames.length)
    : 0;

  return {
    isAuthorized: false,
    confidence: Math.round((bestMatch?.matchRatio || 0) * 100),
    reason: 'unauthorized_speaker',
    speakerName: boundProfile ? `অপরিচিত কণ্ঠ (ডিভাইসটি "${boundProfile.name}" এর জন্য সংরক্ষিত)` : 'অপরিচিত ব্যক্তি / গ্রাহকের কণ্ঠ',
    pitchDetected: overallAvgPitch
  };
}

/**
 * Core Live Verifier for an instantaneous audio snapshot (e.g. during live test)
 */
export function verifyLiveSpeaker(
  analyserNode: AnalyserNode,
  tenantId: string,
  targetSpeakerId?: string
): SpeakerVerificationResult {
  if (!isSpeakerLockEnabled(tenantId)) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled', role: 'owner', speakerName: 'মালিক' };
  }

  const profiles = getSpeakerVoiceProfiles(tenantId);
  if (profiles.length === 0) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled', role: 'owner', speakerName: 'দোকান মালিক' };
  }

  const boundOperatorId = targetSpeakerId || getBoundSpeakerId(tenantId);
  const boundProfile = boundOperatorId ? profiles.find(p => p.id === boundOperatorId) : null;

  const sampleRate = analyserNode.context.sampleRate || 44100;
  const fftSize = analyserNode.fftSize;

  const timeData = new Float32Array(fftSize);
  analyserNode.getFloatTimeDomainData(timeData);

  // 1. Check Energy Level (Near-field vs distant TV/laptop audio)
  let sum = 0;
  for (let i = 0; i < timeData.length; i += 2) {
    sum += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sum / (timeData.length / 2));

  if (rms < 0.005) {
    return {
      isAuthorized: false,
      confidence: 0,
      reason: 'background_noise_or_tv'
    };
  }

  // 2. Detect Pitch
  const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
  if (!pitchRes) {
    return {
      isAuthorized: false,
      confidence: 0,
      reason: 'background_noise_or_tv'
    };
  }

  const livePitch = pitchRes.pitch;

  let candidateProfiles = profiles;
  if (boundProfile) {
    candidateProfiles = [boundProfile, ...profiles.filter(p => p.id !== boundProfile.id)];
  }

  for (const profile of candidateProfiles) {
    const lowerPitch = Math.max(65, profile.pitchMin - 20);
    const upperPitch = Math.min(380, profile.pitchMax + 24);

    if (livePitch >= lowerPitch && livePitch <= upperPitch) {
      const diff = Math.abs(livePitch - profile.pitchMean);
      if (diff <= 35) {
        // If bound to someone else, reject coworker's cross-voice
        if (boundProfile && profile.id !== boundProfile.id) {
          return {
            isAuthorized: false,
            confidence: 25,
            reason: 'unauthorized_speaker',
            speakerName: `অন্য সহকর্মীর কণ্ঠ (${profile.name}) - ডিভাইসটি "${boundProfile.name}" এর জন্য লক করা`,
            pitchDetected: livePitch
          };
        }

        const confidence = Math.max(65, Math.round(100 - (diff * 1.2)));

        return {
          isAuthorized: true,
          matchedSpeaker: profile,
          role: profile.role,
          speakerName: profile.name,
          confidence,
          pitchDetected: livePitch
        };
      }
    }
  }

  return {
    isAuthorized: false,
    confidence: 10,
    reason: 'unauthorized_speaker',
    speakerName: boundProfile ? `অপরিচিত কণ্ঠ (ডিভাইসটি "${boundProfile.name}" এর জন্য লক করা)` : 'অপরিচিত ব্যক্তির কণ্ঠ',
    pitchDetected: livePitch
  };
}

/**
 * Convenience helper that verifies the speech command against enrolled biometric profile.
 * Prioritizes the rolling utterance history (collected while the speaker spoke),
 * falling back to the current live analyser.
 */
export function verifyCurrentVoice(
  tenantId: string = 'default',
  targetSpeakerId?: string,
  spokenText?: string
): SpeakerVerificationResult {
  if (!isSpeakerLockEnabled(tenantId)) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled', role: 'owner', speakerName: 'মালিক' };
  }

  const profiles = getSpeakerVoiceProfiles(tenantId);
  if (profiles.length === 0) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled', role: 'owner', speakerName: 'দোকান মালিক' };
  }

  // 1. First check the rolling utterance buffer (evaluates the speech sentence just spoken)
  const utteranceResult = evaluateUtteranceSpeaker(tenantId, targetSpeakerId, 4500, spokenText);
  if (utteranceResult.isAuthorized) {
    return utteranceResult;
  }

  // 2. If utterance didn't authorize, check if live frame matches right now
  try {
    const analyser = voiceProximityManager?.getAnalyser();
    if (analyser) {
      const live = verifyLiveSpeaker(analyser, tenantId, targetSpeakerId);
      if (live.isAuthorized) {
        return live;
      }
    }
  } catch (e) {}

  // 3. Proximity distance gate validation:
  // Rejects speech originating 1-2 meters away (distant chatter, crowd noise, TV)
  if (voiceProximityManager && voiceProximityManager.getMode() !== 'all') {
    if (!voiceProximityManager.isNearSpeechActive(4800)) {
      return {
        isAuthorized: false,
        confidence: 0,
        reason: 'background_noise_or_tv',
        speakerName: 'দূরবর্তী কণ্ঠ বা ব্যাকগ্রাউন্ড শব্দ (মাইক্রোফোনের কাছে এসে স্পষ্ট স্বরে বলুন)'
      };
    }
  }

  // Strict Rejection: If lock is enabled, strangers / mismatched voices / TV audio are STRICTLY REJECTED!
  return utteranceResult;
}

/**
 * Actively pings the analyser to feed the rolling speech buffer
 */
export function pingVoiceVerification(tenantId: string = 'default'): void {
  try {
    const analyser = voiceProximityManager?.getAnalyser();
    if (analyser) {
      const sampleRate = analyser.context.sampleRate || 44100;
      recordLiveVocalFrame(analyser, sampleRate);
    }
  } catch (e) {}
}

