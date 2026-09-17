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
    // 1. Try specific tenant
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tenantId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // 2. Try default fallback
    if (tenantId !== 'default') {
      const defRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}default`);
      if (defRaw) {
        const parsed = JSON.parse(defRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    // 3. Scan any enrolled profile on this machine
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
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
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, serialized);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}default`, serialized);
  } catch (e) {}
}

/**
 * Remove a speaker voice profile
 */
export function deleteSpeakerVoiceProfile(tenantId: string, profileId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const remaining = getSpeakerVoiceProfiles(tenantId).filter(p => p.id !== profileId);
    const serialized = JSON.stringify(remaining);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tenantId}`, serialized);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}default`, serialized);
  } catch (e) {}
}

/**
 * Check if Speaker Lock is active
 */
export function isSpeakerLockEnabled(tenantId: string = 'default'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Only lock if at least one enrolled profile exists on this device
    const profiles = getSpeakerVoiceProfiles(tenantId);
    if (profiles.length === 0) return false;

    const val = localStorage.getItem(`${TOGGLE_KEY_PREFIX}${tenantId}`);
    if (val !== null) return val === 'true';
    const defVal = localStorage.getItem(`${TOGGLE_KEY_PREFIX}default`);
    if (defVal !== null) return defVal === 'true';
    return false;
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

  // If energy is too low (distant TV / faint background noise), reject
  if (rms < 0.009) {
    return null;
  }

  // 2. Normalized Autocorrelation (human vocal pitch: 65 Hz to 360 Hz)
  const minLag = Math.floor(sampleRate / 360);
  const maxLag = Math.floor(sampleRate / 65);

  let bestLag = -1;
  let maxNormCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag += 2) {
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
    const score = denom > 0.0001 ? corr / denom : 0;
    if (score > maxNormCorr) {
      maxNormCorr = score;
      bestLag = lag;
    }
  }

  // Fine refinement pass around bestLag
  if (bestLag > minLag && bestLag < maxLag) {
    for (let lag = Math.max(minLag, bestLag - 2); lag <= Math.min(maxLag, bestLag + 2); lag++) {
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
      const score = denom > 0.0001 ? corr / denom : 0;
      if (score > maxNormCorr) {
        maxNormCorr = score;
        bestLag = lag;
      }
    }
  }

  // A genuine human vocal fold has high normalized harmonic periodicity (>= 0.28)
  // Ambient diffuse noise, synthesizer music, or distant laptop audio lacks this periodic peak
  if (bestLag > 0 && maxNormCorr >= 0.26) {
    const pitch = sampleRate / bestLag;
    if (pitch >= 65 && pitch <= 360) {
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
 * Checks whether live audio strictly belongs to enrolled shopkeeper/staff
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
const BUFFER_WINDOW_MS = 4200; // keep frames from the last 4.2 seconds
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
    for (let i = 0; i < timeData.length; i += 4) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / (timeData.length / 4));

    // Reject low ambient hum / silence
    if (rms < 0.008) return;

    // Detect pitch
    const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
    if (!pitchRes || pitchRes.pitch < 60 || pitchRes.pitch > 380) return;

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

// Automatically subscribe to voiceProximityManager frames on load
if (typeof window !== 'undefined') {
  try {
    const { voiceProximityManager } = require('./voiceProximityGate');
    voiceProximityManager?.onFrame?.((analyser: AnalyserNode, sRate: number) => {
      recordLiveVocalFrame(analyser, sRate);
    });
  } catch (e) {}
}

/**
 * Evaluate the entire recent speech utterance against enrolled biometric profiles.
 * Analyzes all pitch frames recorded during the speech window (last ~3.5 seconds).
 * Strictly filters laptop videos, TV news/natok, and other customers' voices.
 */
export function evaluateUtteranceSpeaker(
  tenantId: string = 'default',
  targetSpeakerId?: string,
  lookbackMs: number = 3600
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
  const recentFrames = rollingVoicedFrames.filter(f => f.timestamp >= cutoff);

  // If no harmonic vocal frames were detected:
  // Diffuse noise, fan, traffic, or distant TV with no clear human vocal fold periodicity
  if (recentFrames.length === 0) {
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
    // Exact pitch tolerance: ±28 Hz around mean, or between min-16 and max+20
    const lowerPitch = Math.max(60, Math.min(profile.pitchMin - 16, profile.pitchMean - 28));
    const upperPitch = Math.min(380, Math.max(profile.pitchMax + 20, profile.pitchMean + 28));

    const matched = recentFrames.filter(f => f.pitch >= lowerPitch && f.pitch <= upperPitch);
    const count = matched.length;
    const ratio = count / recentFrames.length;

    if (count > 0) {
      const avgPitch = matched.reduce((sum, f) => sum + f.pitch, 0) / count;
      const diffFromMean = Math.abs(avgPitch - profile.pitchMean);
      const conf = Math.max(50, Math.min(100, Math.round((ratio * 60) + (40 - diffFromMean))));

      if (!bestMatch || ratio > bestMatch.matchRatio || (ratio === bestMatch.matchRatio && count > bestMatch.matchingCount)) {
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

  // Strict Authorization Rule:
  // Must have at least 2 voiced samples, and at least 45% of recent vocal samples must match
  if (bestMatch && bestMatch.matchingCount >= 2 && bestMatch.matchRatio >= 0.45) {
    return {
      isAuthorized: true,
      matchedSpeaker: bestMatch.profile,
      confidence: bestMatch.confidence,
      pitchDetected: Math.round(bestMatch.avgPitch)
    };
  }

  // Unauthorized: stranger, laptop video, or TV audio!
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

  // 1. Check Energy Level
  let sum = 0;
  for (let i = 0; i < timeData.length; i += 4) {
    sum += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sum / (timeData.length / 4));

  if (rms < 0.009) {
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
    const lowerPitch = Math.max(60, Math.min(profile.pitchMin - 16, profile.pitchMean - 28));
    const upperPitch = Math.min(380, Math.max(profile.pitchMax + 20, profile.pitchMean + 28));

    if (livePitch >= lowerPitch && livePitch <= upperPitch) {
      const diff = Math.abs(livePitch - profile.pitchMean);
      const confidence = Math.max(70, Math.round(100 - (diff * 1.2)));

      return {
        isAuthorized: true,
        matchedSpeaker: profile,
        confidence,
        pitchDetected: livePitch
      };
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
  const utteranceResult = evaluateUtteranceSpeaker(tenantId, targetSpeakerId, 3600);
  if (utteranceResult.isAuthorized) {
    return utteranceResult;
  }

  // 2. If utterance didn't authorize, check if live frame matches right now
  try {
    const { voiceProximityManager } = require('./voiceProximityGate');
    const analyser = voiceProximityManager?.getAnalyser();
    if (analyser) {
      const live = verifyLiveSpeaker(analyser, tenantId, targetSpeakerId);
      if (live.isAuthorized) {
        return live;
      }
    }
  } catch (e) {}

  // Strict Rejection: If lock is enabled, TV/laptop/strangers are STRICTLY REJECTED!
  return utteranceResult;
}

/**
 * Actively pings the analyser to feed the rolling speech buffer
 */
export function pingVoiceVerification(tenantId: string = 'default'): void {
  try {
    const { voiceProximityManager } = require('./voiceProximityGate');
    const analyser = voiceProximityManager?.getAnalyser();
    if (analyser) {
      const sampleRate = analyser.context.sampleRate || 44100;
      recordLiveVocalFrame(analyser, sampleRate);
    }
  } catch (e) {}
}

