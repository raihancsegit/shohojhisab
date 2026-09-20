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
  pitchMin: number; // Hz (e.g. 90)
  pitchMax: number; // Hz (e.g. 160)
  pitchMean: number; // Hz (e.g. 125)
  centroidMean: number; // Spectral timbre indicator
  samplesCollected: number;
}

export interface SpeakerVerificationResult {
  isAuthorized: boolean;
  matchedSpeaker?: SpeakerVoiceProfile;
  confidence: number;
  reason?: 'authorized' | 'unauthorized_speaker' | 'background_noise_or_tv' | 'silence' | 'feature_disabled';
  pitchDetected?: number;
}

const STORAGE_KEY_PREFIX = 'lbos_speaker_profiles_';
const TOGGLE_KEY_PREFIX = 'lbos_speaker_lock_enabled_';

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
    for (let i = 0; i < bufferSize - lag; i += 2) {
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
  if (now - lastPitchFrameTime < 40) return;
  lastPitchFrameTime = now;

  try {
    const fftSize = analyserNode.fftSize;
    const timeData = new Float32Array(fftSize);
    analyserNode.getFloatTimeDomainData(timeData);

    // Compute RMS
    let sum = 0;
    for (let i = 0; i < timeData.length; i += 2) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / (timeData.length / 2));

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
 * Ensures the microphone Web Audio stream & biometric analyzer is active.
 * Should be invoked whenever any voice recognition or voice modal opens or starts listening.
 */
export async function ensureBiometricMonitoring(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (voiceProximityManager) {
      return await voiceProximityManager.start();
    }
  } catch (e) {}
  return false;
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
 * Evaluate the entire recent speech utterance against enrolled biometric profiles.
 * Analyzes all pitch frames recorded during the speech window (last ~3.8-5.5 seconds).
 * Strictly filters laptop videos, TV news/natok, and other customers' voices.
 */
export function evaluateUtteranceSpeaker(
  tenantId: string = 'default',
  targetSpeakerId?: string,
  lookbackMs: number = 4200
): SpeakerVerificationResult {
  if (!isSpeakerLockEnabled(tenantId)) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled' };
  }

  const profiles = getSpeakerVoiceProfiles(tenantId);
  if (profiles.length === 0) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled' };
  }

  const now = Date.now();
  const cutoff = now - lookbackMs;
  let recentFrames = rollingVoicedFrames.filter(f => f.timestamp >= cutoff);

  // If fewer than 2 frames in lookback window, check wider window (up to 5.5s)
  if (recentFrames.length < 2) {
    recentFrames = rollingVoicedFrames.filter(f => f.timestamp >= now - 5500);
  }

  // If fewer than 2 vocal frames were detected at all:
  // Reject immediately! (Laptop sound was cancelled by AEC or audio was ambient noise/silence)
  if (recentFrames.length < 2) {
    return {
      isAuthorized: false,
      confidence: 0,
      reason: 'background_noise_or_tv'
    };
  }

  let candidateProfiles = profiles;
  if (targetSpeakerId) {
    const specific = profiles.find(p => p.id === targetSpeakerId);
    if (specific) {
      candidateProfiles = [specific, ...profiles.filter(p => p.id !== targetSpeakerId)];
    }
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
    // Registered speaker's pitch window:
    // Natural human pitch during shop speech stays within [pitchMin - 15, pitchMax + 18]
    const lowerPitch = Math.max(65, profile.pitchMin - 15);
    const upperPitch = Math.min(380, profile.pitchMax + 18);

    const matched = recentFrames.filter(f => f.pitch >= lowerPitch && f.pitch <= upperPitch);
    const count = matched.length;
    const ratio = count / recentFrames.length;

    if (count >= 2 && ratio >= 0.35) {
      const avgPitch = matched.reduce((sum, f) => sum + f.pitch, 0) / count;
      const diffFromMean = Math.abs(avgPitch - profile.pitchMean);

      // Must be within 28 Hz of the owner's enrolled mean
      if (diffFromMean <= 28) {
        // Timbre check: Filter out sharp laptop sirens or metallic reflections
        if (profile.centroidMean && profile.centroidMean > 0) {
          const avgCentroid = matched.reduce((s, f) => s + (f.centroid || 0), 0) / count;
          if (avgCentroid > 0 && Math.abs(avgCentroid - profile.centroidMean) > 1300) {
            continue;
          }
        }

        const conf = Math.max(65, Math.min(100, Math.round((ratio * 60) + Math.max(0, 40 - diffFromMean * 1.3))));
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

  if (bestMatch && bestMatch.confidence >= 60) {
    return {
      isAuthorized: true,
      matchedSpeaker: bestMatch.profile,
      confidence: bestMatch.confidence,
      pitchDetected: Math.round(bestMatch.avgPitch)
    };
  }

  // Not matched: laptop sound, TV dialogue, music, or other people speaking!
  const overallAvgPitch = Math.round(recentFrames.reduce((sum, f) => sum + f.pitch, 0) / recentFrames.length);
  return {
    isAuthorized: false,
    confidence: Math.round((bestMatch?.matchRatio || 0) * 100),
    reason: 'unauthorized_speaker',
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
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled' };
  }

  const profiles = getSpeakerVoiceProfiles(tenantId);
  if (profiles.length === 0) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled' };
  }

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
  if (targetSpeakerId) {
    const specific = profiles.find(p => p.id === targetSpeakerId);
    if (specific) {
      candidateProfiles = [specific, ...profiles.filter(p => p.id !== targetSpeakerId)];
    }
  }

  for (const profile of candidateProfiles) {
    const lowerPitch = Math.max(65, profile.pitchMin - 15);
    const upperPitch = Math.min(380, profile.pitchMax + 18);

    if (livePitch >= lowerPitch && livePitch <= upperPitch) {
      const diff = Math.abs(livePitch - profile.pitchMean);
      if (diff <= 28) {
        const confidence = Math.max(70, Math.round(100 - (diff * 1.5)));

        return {
          isAuthorized: true,
          matchedSpeaker: profile,
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
  targetSpeakerId?: string
): SpeakerVerificationResult {
  if (!isSpeakerLockEnabled(tenantId)) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled' };
  }

  const profiles = getSpeakerVoiceProfiles(tenantId);
  if (profiles.length === 0) {
    return { isAuthorized: true, confidence: 100, reason: 'feature_disabled' };
  }

  // 1. First check the rolling utterance buffer (evaluates the speech sentence just spoken)
  const utteranceResult = evaluateUtteranceSpeaker(tenantId, targetSpeakerId, 4200);
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

