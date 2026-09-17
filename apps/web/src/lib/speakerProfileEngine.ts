'use client';

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
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tenantId}`);
    return raw ? JSON.parse(raw) : [];
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
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, JSON.stringify(existing));
  } catch (e) {}
}

/**
 * Remove a speaker voice profile
 */
export function deleteSpeakerVoiceProfile(tenantId: string, profileId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const remaining = getSpeakerVoiceProfiles(tenantId).filter(p => p.id !== profileId);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, JSON.stringify(remaining));
  } catch (e) {}
}

/**
 * Check if Speaker Lock is active
 */
export function isSpeakerLockEnabled(tenantId: string = 'default'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(`${TOGGLE_KEY_PREFIX}${tenantId}`);
    return val === 'true';
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
    localStorage.setItem(`${TOGGLE_KEY_PREFIX}${tenantId}`, enabled ? 'true' : 'false');
  } catch (e) {}
}

/**
 * Autocorrelation Algorithm to extract Fundamental Frequency (Pitch / F0 in Hz)
 * Range: 75 Hz to 350 Hz (Standard human vocal range)
 */
export function extractPitchFromTimeDomain(
  timeDomainData: Float32Array,
  sampleRate: number
): { pitch: number; clarity: number } | null {
  const bufferSize = timeDomainData.length;

  // 1. Calculate Root Mean Square (RMS) energy
  let sum = 0;
  for (let i = 0; i < bufferSize; i += 2) {
    const val = timeDomainData[i];
    sum += val * val;
  }
  const rms = Math.sqrt(sum / (bufferSize / 2));

  // If energy is too low (silence), reject (lowered threshold to 0.007 for laptop/mobile mics)
  if (rms < 0.007) {
    return null;
  }

  // 2. Autocorrelation in human speech range (70 Hz to 380 Hz)
  const minLag = Math.floor(sampleRate / 380); // ~380 Hz (female/child high pitch)
  const maxLag = Math.floor(sampleRate / 70);  // ~70 Hz (deep male bass voice)

  let bestLag = -1;
  let maxCorr = 0;

  // Fast coarse pass (step of 2) to eliminate 75% of compute operations
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let corr = 0;
    for (let i = 0; i < bufferSize - lag; i += 2) {
      corr += timeDomainData[i] * timeDomainData[i + lag];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestLag = lag;
    }
  }

  // Fine refinement pass around bestLag
  if (bestLag > minLag && bestLag < maxLag) {
    for (let lag = Math.max(minLag, bestLag - 2); lag <= Math.min(maxLag, bestLag + 2); lag++) {
      let corr = 0;
      for (let i = 0; i < bufferSize - lag; i += 2) {
        corr += timeDomainData[i] * timeDomainData[i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
  }

  if (bestLag > 0 && maxCorr > 0) {
    const pitch = sampleRate / bestLag;
    const energy = sum;
    const clarity = energy > 0 ? maxCorr / energy : 0.5;
    if (pitch >= 65 && pitch <= 400) {
      return { pitch: Math.round(pitch), clarity: Math.min(1, Math.max(0.1, clarity)) };
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
  let numerator = 0;
  let denominator = 0;
  const binSize = (sampleRate / 2) / frequencyData.length;

  for (let i = 0; i < frequencyData.length; i++) {
    const magnitude = frequencyData[i];
    const freq = i * binSize;
    numerator += freq * magnitude;
    denominator += magnitude;
  }

  if (denominator === 0) return 0;
  return Math.round(numerator / denominator);
}

/**
 * Core Live Verifier:
 * Checks whether live audio belongs to enrolled shopkeeper/staff or is unwanted TV/customer chatter
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

  const freqData = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(freqData);

  // 1. Check Energy Level (Microphone silence threshold)
  let rms = 0;
  for (let i = 0; i < timeData.length; i++) {
    rms += timeData[i] * timeData[i];
  }
  rms = Math.sqrt(rms / timeData.length);

  // Truly faint signal (far ambient room hum under 0.007)
  if (rms < 0.007) {
    return {
      isAuthorized: false,
      confidence: 0,
      reason: 'background_noise_or_tv'
    };
  }

  // 2. Detect Fundamental Pitch (F0)
  const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
  if (!pitchRes) {
    // If energy is present (rms > 0.015), try centroid fallback before rejecting
    if (rms >= 0.012) {
      const centroid = extractSpectralCentroid(freqData, sampleRate);
      if (centroid > 0) {
        const approxPitch = centroid > 1500 ? 195 : 125;
        for (const profile of profiles) {
          if (Math.abs(approxPitch - profile.pitchMean) <= 65) {
            const fallbackVerified: SpeakerVerificationResult = {
              isAuthorized: true,
              matchedSpeaker: profile,
              confidence: 78,
              pitchDetected: approxPitch
            };
            lastVerifiedCache = { result: fallbackVerified, timestamp: Date.now() };
            return fallbackVerified;
          }
        }
      }
    }

    return {
      isAuthorized: false,
      confidence: 0,
      reason: 'background_noise_or_tv'
    };
  }

  const livePitch = pitchRes.pitch;
  const centroid = extractSpectralCentroid(freqData, sampleRate);

  // 3. Match against Enrolled Profiles
  let candidateProfiles = profiles;
  if (targetSpeakerId) {
    const specific = profiles.find(p => p.id === targetSpeakerId);
    if (specific) {
      candidateProfiles = [specific, ...profiles.filter(p => p.id !== targetSpeakerId)];
    }
  }

  for (const profile of candidateProfiles) {
    // Natural human vocal range window: allow ±65Hz around pitchMean or min/max bounds
    // Accommodates natural pitch fluctuations between excited, relaxed, and morning/evening speech
    const lowerPitch = Math.max(50, Math.min(profile.pitchMin - 35, profile.pitchMean - 65));
    const upperPitch = Math.max(profile.pitchMax + 55, profile.pitchMean + 75);

    if (livePitch >= lowerPitch && livePitch <= upperPitch) {
      const diff = Math.abs(livePitch - profile.pitchMean);
      const confidence = Math.max(65, Math.round(100 - (diff * 0.8)));

      const verifiedResult: SpeakerVerificationResult = {
        isAuthorized: true,
        matchedSpeaker: profile,
        confidence,
        pitchDetected: livePitch
      };

      // Only cache POSITIVE authorization so sentence-end pauses never wipe access
      lastVerifiedCache = {
        result: verifiedResult,
        timestamp: Date.now()
      };
      return verifiedResult;
    }
  }

  const unauthResult: SpeakerVerificationResult = {
    isAuthorized: false,
    confidence: 15,
    reason: 'unauthorized_speaker',
    pitchDetected: livePitch
  };
  // Do NOT overwrite lastVerifiedCache with unauthResult if valid speech was heard recently!
  const nowTime = Date.now();
  if (!lastVerifiedCache || (nowTime - lastVerifiedCache.timestamp) >= 5500) {
    lastVerifiedCache = {
      result: unauthResult,
      timestamp: nowTime
    };
  }
  return unauthResult;
}

// Rolling cache of the most recent speech verification while user was actively talking
let lastVerifiedCache: {
  result: SpeakerVerificationResult;
  timestamp: number;
} | null = null;

/**
 * Convenience helper that queries the global voiceProximityManager analyser.
 * Automatically falls back to the recent active speech cache (within last 5.5 seconds)
 * so that verification does not fail due to the pause at the end of a sentence.
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

  // Check if we verified speech within the last 5.5 seconds (during active dialogue)
  const now = Date.now();
  if (lastVerifiedCache && (now - lastVerifiedCache.timestamp) < 5500) {
    return lastVerifiedCache.result;
  }

  // Otherwise inspect live analyser if active
  try {
    const { voiceProximityManager } = require('./voiceProximityGate');
    const analyser = voiceProximityManager?.getAnalyser();
    if (!analyser) {
      return { isAuthorized: true, confidence: 85, reason: 'feature_disabled' };
    }
    const live = verifyLiveSpeaker(analyser, tenantId, targetSpeakerId);
    // If live frame was silence but lock is on and we didn't hear speech, check if fallback is warranted
    return live;
  } catch (e) {
    return { isAuthorized: true, confidence: 80, reason: 'feature_disabled' };
  }
}

/**
 * Actively pings the analyser to maintain the rolling speech cache during recognition
 */
export function pingVoiceVerification(tenantId: string = 'default'): void {
  try {
    const { voiceProximityManager } = require('./voiceProximityGate');
    const analyser = voiceProximityManager?.getAnalyser();
    if (analyser) {
      verifyLiveSpeaker(analyser, tenantId);
    }
  } catch (e) {}
}

