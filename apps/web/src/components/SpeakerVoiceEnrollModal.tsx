'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  SpeakerVoiceProfile,
  getSpeakerVoiceProfiles,
  saveSpeakerVoiceProfile,
  deleteSpeakerVoiceProfile,
  isSpeakerLockEnabled,
  setSpeakerLockEnabled,
  extractPitchFromTimeDomain,
  extractSpectralCentroid,
  verifyLiveSpeaker
} from '../lib/speakerProfileEngine';

interface StaffOption {
  id: string;
  name: string;
  role?: string;
}

interface SpeakerVoiceEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
  staffList?: StaffOption[];
  preSelectedStaffId?: string;
  onProfileUpdated?: () => void;
}

const OWNER_PASSAGE =
  'আমি এই ব্যবসা প্রতিষ্ঠানের প্রধান মালিক। আমার দোকান সহজ হিসাব। আজকের সর্বমোট বিক্রি এবং নিট লাভ কত টাকা হয়েছে হিসাব দেখাও। তেল চিনি চাল ডাল সাবান সহ সব মালের স্টক চেক করো। কাস্টমারের বাকির খাতা ও দেনাদারের ব্যালেন্স রিপোর্ট খোলো। সহজ হিসাব সম্পূর্ণ অ্যাক্সেস অনুমোদন।';

const STAFF_PASSAGE =
  'আমি এই দোকানের নিয়মিত বিক্রয় কর্মী। নতুন কাস্টমার মেমো তৈরি করো। চাল দুই কেজি ও চিনি এক কেজি বিক্রি যোগ করো। নাপা এক্সট্রা দশ পাতা স্টক চেক করো। কাউন্টারের চা নাস্তা খরচ বিশ টাকা লিখে রাখো। বিক্রয় চালান প্রিন্ট করো।';

const PHRASES = [
  { step: 1, title: 'পরিচয় ও দোকান', phrase: 'আমার দোকান সহজ হিসাব। আমি এই দোকানের দায়িত্বে আছি।' },
  { step: 2, title: 'বিক্রয় ও স্টক', phrase: 'আজকের বিক্রি হিসাব করো এবং চাল ডাল তেল স্টক চেক করো।' },
  { step: 3, title: 'লেনদেন ও মেমো', phrase: 'কাস্টমার ক্যাশ বিক্রি পাঁচশত টাকা এবং মেমো তৈরি করো।' }
];

export default function SpeakerVoiceEnrollModal({
  isOpen,
  onClose,
  tenantId = 'default',
  staffList = [],
  preSelectedStaffId,
  onProfileUpdated
}: SpeakerVoiceEnrollModalProps) {
  const [activeTab, setActiveTab] = useState<'enroll' | 'list' | 'test'>('enroll');
  const [isLockEnabled, setIsLockEnabled] = useState<boolean>(true);
  const [profiles, setProfiles] = useState<SpeakerVoiceProfile[]>([]);

  // Enrollment State
  const [speakerType, setSpeakerType] = useState<'owner' | 'staff'>('owner');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [speakerName, setSpeakerName] = useState<string>('দোকান মালিক');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [livePitch, setLivePitch] = useState<number>(0);
  const [collectedPitches, setCollectedPitches] = useState<number[][]>([[], [], []]);
  const [collectedCentroids, setCollectedCentroids] = useState<number[][]>([[], [], []]);
  const [enrollDuration, setEnrollDuration] = useState<number>(10);
  const [collectedFrameCount, setCollectedFrameCount] = useState<number>(0);
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);
  const [lastSavedStats, setLastSavedStats] = useState<{ pitchMean: number; pitchMin: number; pitchMax: number } | null>(null);

  // Live Test State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{
    authorized: boolean;
    speakerName?: string;
    pitch?: number;
    reason?: string;
    confidence?: number;
  } | null>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const recognitionEnrollRef = useRef<any>(null);

  const [liveSpokenText, setLiveSpokenText] = useState<string>('');
  const [actionToast, setActionToast] = useState<string | null>(null);

  const [loadedStaffList, setLoadedStaffList] = useState<StaffOption[]>(staffList);
  const [isCustomStaff, setIsCustomStaff] = useState<boolean>(false);

  // Load profiles and staff on open
  useEffect(() => {
    if (!isOpen) return;
    const locked = isSpeakerLockEnabled(tenantId);
    setIsLockEnabled(locked);
    const loaded = getSpeakerVoiceProfiles(tenantId);
    setProfiles(loaded);

    if (staffList && staffList.length > 0) {
      setLoadedStaffList(staffList);
    } else {
      const effectiveTenant = tenantId !== 'default' ? tenantId : (() => {
        try {
          const raw = localStorage.getItem('lbos_active_tenant');
          if (raw) return JSON.parse(raw)?.id || 'default';
        } catch (e) {}
        return 'default';
      })();

      fetch(`/api/staff?tenantId=${effectiveTenant}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setLoadedStaffList(data.map((s: any) => ({
              id: s.id,
              name: s.name,
              role: s.role
            })));
          }
        })
        .catch(() => {});
    }

    if (preSelectedStaffId) {
      setSpeakerType('staff');
      setSelectedStaffId(preSelectedStaffId);
      const matched = staffList.find(s => s.id === preSelectedStaffId);
      if (matched) setSpeakerName(matched.name);
    } else {
      setSpeakerType('owner');
      setSpeakerName('দোকান মালিক');
    }

    setCurrentStepIndex(0);
    setCollectedPitches([[], [], []]);
    setCollectedCentroids([[], [], []]);
    setEnrollSuccess(false);
    setTestStatus(null);
  }, [isOpen, tenantId, preSelectedStaffId]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionEnrollRef.current) {
      try { recognitionEnrollRef.current.abort(); } catch (e) {}
      recognitionEnrollRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsRecording(false);
    setIsTesting(false);
    setLiveVolume(0);
  };

  const handleToggleLock = (enabled: boolean) => {
    setIsLockEnabled(enabled);
    setSpeakerLockEnabled(tenantId, enabled);
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleDeleteProfile = (id: string) => {
    deleteSpeakerVoiceProfile(tenantId, id);
    const updated = getSpeakerVoiceProfiles(tenantId);
    setProfiles(updated);
    setActionToast('কণ্ঠ প্রোফাইলটি সফলভাবে মুছে ফেলা হয়েছে');
    setTimeout(() => setActionToast(null), 3000);
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleResetAllProfiles = () => {
    deleteSpeakerVoiceProfile(tenantId, 'all');
    setProfiles([]);
    setIsLockEnabled(false);
    setActionToast('সকল সংরক্ষিত কণ্ঠ প্রোফাইল সফলভাবে মুছে রিসেট করা হয়েছে');
    setTimeout(() => setActionToast(null), 3000);
    if (onProfileUpdated) onProfileUpdated();
  };

  // Safe Microphone Initializer
  const getMicrophoneStream = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    } catch (e) {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  // ⚡ Flexible 10-Second / 15-Second / 4-Second Biometric Voice Enrollment
  const startFullVoiceEnrollment = async (customDuration?: number) => {
    stopAudio();
    setLiveSpokenText('');
    setCollectedFrameCount(0);
    const targetDuration = customDuration || enrollDuration || 10;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
        alert('আপনার ব্রাউজারে ভয়েস রেকর্ডার সাপোর্ট নেই।');
        return;
      }

      const stream = await getMicrophoneStream();
      mediaStreamRef.current = stream;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);
      setCountdown(targetDuration);

      // Start live speech recognizer so spoken Bengali words appear live on screen!
      const SpeechRec = typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = 'bn-BD';
          rec.interimResults = true;
          rec.continuous = true;
          rec.onresult = (evt: any) => {
            let text = '';
            for (let i = evt.resultIndex; i < evt.results.length; i++) {
              if (evt.results[i][0]?.transcript) {
                text = evt.results[i][0].transcript;
              }
            }
            if (text) setLiveSpokenText(text);
          };
          rec.start();
          recognitionEnrollRef.current = rec;
        } catch (e) {}
      }

      const recordedPitches: number[] = [];
      const recordedCentroids: number[] = [];
      const sampleRate = audioCtx.sampleRate || 44100;
      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      let lastCheck = 0;

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);
        analyserRef.current.getByteFrequencyData(freqData);

        let sum = 0;
        for (let i = 0; i < timeData.length; i += 4) {
          sum += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sum / (timeData.length / 4)) * 100;
        setLiveVolume(Math.min(100, Math.round(rms * 6)));

        const now = performance.now();
        if (now - lastCheck > 40) {
          lastCheck = now;
          const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
          if (pitchRes && pitchRes.pitch >= 65 && pitchRes.pitch <= 380) {
            setLivePitch(pitchRes.pitch);
            recordedPitches.push(pitchRes.pitch);
            const centroid = extractSpectralCentroid(freqData, sampleRate);
            if (centroid > 0) recordedCentroids.push(centroid);
            setCollectedFrameCount(recordedPitches.length);
          }
        }
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);

      let remaining = targetDuration;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          stopAudio();

          if (recordedPitches.length < 5) {
            alert('কণ্ঠস্বর স্পষ্টভাবে শনাক্ত হয়নি। দয়া করে মাইকের কাছে এসে আরেকবার স্পষ্ট স্বরে লেখাটি পড়ুন।');
            return;
          }

          finalizeEnrollment([recordedPitches], [recordedCentroids.length > 0 ? recordedCentroids : [1200]]);
        }
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone error:', err);
      alert('মাইক্রোফোন চালু করা যায়নি: ' + (err.message || 'অনুমতি নিশ্চিত করুন'));
    }
  };

  // Start Voice Enrollment Recording (3.5 seconds)
  const startRecordingStep = async () => {
    stopAudio();
    setLiveSpokenText('');
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
        alert('আপনার ব্রাউজারে ভয়েস রেকর্ডার সাপোর্ট নেই।');
        return;
      }

      const stream = await getMicrophoneStream();
      mediaStreamRef.current = stream;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; // Accurate pitch tracking
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);
      setCountdown(3);

      // Start live speech recognizer for step wizard as well
      const SpeechRec = typeof window !== 'undefined'
        ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
        : null;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = 'bn-BD';
          rec.interimResults = true;
          rec.continuous = false;
          rec.onresult = (evt: any) => {
            let text = '';
            for (let i = evt.resultIndex; i < evt.results.length; i++) {
              if (evt.results[i][0]?.transcript) {
                text = evt.results[i][0].transcript;
              }
            }
            if (text) setLiveSpokenText(text);
          };
          rec.start();
          recognitionEnrollRef.current = rec;
        } catch (e) {}
      }

      const stepPitches: number[] = [];
      const stepCentroids: number[] = [];
      const sampleRate = audioCtx.sampleRate || 44100;
      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      let lastPitchCheck = 0;

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);
        analyserRef.current.getByteFrequencyData(freqData);

        // RMS Energy
        let sum = 0;
        for (let i = 0; i < timeData.length; i += 4) {
          sum += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sum / (timeData.length / 4)) * 100;
        setLiveVolume(Math.min(100, Math.round(rms * 6)));

        // Throttled Pitch & Timbre Extraction
        const now = performance.now();
        if (now - lastPitchCheck > 50) {
          lastPitchCheck = now;
          const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
          if (pitchRes && pitchRes.pitch >= 65 && pitchRes.pitch <= 380) {
            setLivePitch(pitchRes.pitch);
            stepPitches.push(pitchRes.pitch);
            const centroid = extractSpectralCentroid(freqData, sampleRate);
            if (centroid > 0) stepCentroids.push(centroid);
          }
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);

      // 3-second countdown timer
      let remaining = 3;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (stepPitches.length < 2) {
            alert('কণ্ঠস্বর স্পষ্টভাবে শনাক্ত হয়নি। আরেকবার পড়ুন।');
            stopAudio();
            return;
          }

          const updatedPitches = [...collectedPitches];
          const updatedCentroids = [...collectedCentroids];
          updatedPitches[currentStepIndex] = stepPitches;
          updatedCentroids[currentStepIndex] = stepCentroids.length > 0 ? stepCentroids : [1200];
          setCollectedPitches(updatedPitches);
          setCollectedCentroids(updatedCentroids);

          if (currentStepIndex < 2) {
            setCurrentStepIndex(currentStepIndex + 1);
          } else {
            finalizeEnrollment(updatedPitches, updatedCentroids);
          }
        }
      }, 1100);

    } catch (err: any) {
      console.warn('Microphone permission issue:', err);
      alert('মাইক্রোফোন চালু করা যায়নি: ' + (err.message || 'অনুমতি নিশ্চিত করুন'));
    }
  };

  const finalizeEnrollment = (pitches: number[][], centroids: number[][]) => {
    let flatPitches = pitches.flat().filter(p => p >= 65 && p <= 380);
    const flatCentroids = centroids.flat().filter(c => c > 0);

    if (flatPitches.length < 5) {
      alert('পর্যাপ্ত কণ্ঠের স্পষ্ট নমুনা পাওয়া যায়নি। অনুগ্রহ করে আরেকবার পড়ুন।');
      return;
    }

    flatPitches.sort((a, b) => a - b);
    const pitchMin = flatPitches[Math.floor(flatPitches.length * 0.05)] || flatPitches[0];
    const pitchMax = flatPitches[Math.floor(flatPitches.length * 0.95)] || flatPitches[flatPitches.length - 1];
    const pitchMean = Math.round(flatPitches.reduce((a, b) => a + b, 0) / flatPitches.length);
    const centroidMean = flatCentroids.length > 0
      ? Math.round(flatCentroids.reduce((a, b) => a + b, 0) / flatCentroids.length)
      : 1200;

    const variance = flatPitches.reduce((a, b) => a + Math.pow(b - pitchMean, 2), 0) / flatPitches.length;
    const pitchStdDev = Math.round(Math.sqrt(variance));

    const profileId = speakerType === 'owner' ? 'owner' : (selectedStaffId || `staff-${Date.now()}`);
    const name = speakerName.trim() || (speakerType === 'owner' ? 'দোকান মালিক' : 'স্টাফ');

    const newProfile: SpeakerVoiceProfile = {
      id: profileId,
      name,
      role: speakerType === 'owner' ? 'owner' : 'staff',
      enrolledAt: new Date().toISOString(),
      pitchMin,
      pitchMax,
      pitchMean,
      pitchStdDev,
      centroidMean,
      samplesCollected: flatPitches.length
    };

    saveSpeakerVoiceProfile(tenantId, newProfile);
    setSpeakerLockEnabled(tenantId, true);
    setIsLockEnabled(true);

    const updated = getSpeakerVoiceProfiles(tenantId);
    setProfiles(updated);
    setLastSavedStats({ pitchMean, pitchMin, pitchMax });
    setEnrollSuccess(true);
    if (onProfileUpdated) onProfileUpdated();
  };

  // Live Test
  const startLiveTest = async () => {
    stopAudio();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const stream = await getMicrophoneStream();
      mediaStreamRef.current = stream;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsTesting(true);

      let lastTestCheck = 0;
      const loop = () => {
        if (!analyserRef.current) return;
        const now = performance.now();
        if (now - lastTestCheck > 80) {
          lastTestCheck = now;
          const res = verifyLiveSpeaker(analyserRef.current, tenantId);
          if (res.reason !== 'silence') {
            setTestStatus({
              authorized: res.isAuthorized,
              speakerName: res.matchedSpeaker?.name,
              pitch: res.pitchDetected,
              reason: res.reason,
              confidence: res.confidence
            });
          }
        }
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      alert('টেস্ট শুরু করা যায়নি: ' + e.message);
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '14px',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '460px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>

        {/* Clean, Airy Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'grid',
              placeItems: 'center',
              fontSize: '18px'
            }}>
              🎙️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>
                ভয়েস বায়োমেট্রিক ও টিভি শিল্ড
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                কেবল রেজিস্টার্ড কণ্ঠে মেমো গ্রহণ হবে
              </p>
            </div>
          </div>

          <button
            onClick={() => { stopAudio(); onClose(); }}
            style={{
              background: '#f8fafc',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#64748b',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Sleek Master Switch Bar */}
        <div style={{
          padding: '10px 20px',
          background: isLockEnabled ? '#f0fdf4' : '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>{isLockEnabled ? '🛡️' : '🔓'}</span>
            <span style={{ fontSize: '12.5px', fontWeight: '800', color: isLockEnabled ? '#15803d' : '#475569' }}>
              {isLockEnabled ? 'টিভি ও নয়েজ শিল্ড সক্রিয়' : 'শিল্ড বন্ধ (সব কথা গ্রহণ)'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleToggleLock(!isLockEnabled)}
            style={{
              background: isLockEnabled ? '#10b981' : '#cbd5e1',
              border: 'none',
              borderRadius: '99px',
              width: '44px',
              height: '24px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              padding: '2px'
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#ffffff',
              transform: isLockEnabled ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {/* Clean Segmented Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 16px',
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9'
        }}>
          {[
            { id: 'enroll', label: '🎙️ কণ্ঠ রেজিস্টার' },
            { id: 'list', label: `👥 তালিকা (${profiles.length})` },
            { id: 'test', label: '🧪 লাইভ টেস্ট' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { stopAudio(); setActiveTab(tab.id as any); }}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? '#eef2ff' : 'transparent',
                color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                fontWeight: activeTab === tab.id ? '800' : '600',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: ENROLL */}
          {activeTab === 'enroll' && (
            <div>
              {enrollSuccess ? (
                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#166534',
                    fontSize: '28px',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 12px'
                  }}>
                    ✓
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>
                    কণ্ঠ সফলভাবে রেজিস্টার ও লক হয়েছে!
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                    <strong>{speakerName}</strong> এর কণ্ঠস্বরের ফ্রিকোয়েন্সি বায়োমেট্রিকভাবে সংরক্ষিত হয়েছে। এখন থেকে এই ব্যক্তির কণ্ঠ ছাড়া অন্য কোনো মানুষ বা ল্যাপটপ/টিভির ব্যাকগ্রাউন্ড সাউন্ডে মেমো তৈরি হবে না।
                  </p>

                  {lastSavedStats && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#166534',
                      display: 'flex',
                      justifyContent: 'space-around',
                      fontWeight: '700'
                    }}>
                      <div>গড় পিচ: <strong>{lastSavedStats.pitchMean} Hz</strong></div>
                      <div>ফ্রিকোয়েন্সি সীমা: <strong>{lastSavedStats.pitchMin} - {lastSavedStats.pitchMax} Hz</strong></div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setEnrollSuccess(false);
                        setCurrentStepIndex(0);
                        setCollectedPitches([[], [], []]);
                        setCollectedCentroids([[], [], []]);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      আরেকটি কণ্ঠ যোগ
                    </button>
                    <button
                      onClick={() => { setActiveTab('test'); startLiveTest(); }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#4f46e5',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      মাইকে টেস্ট করুন ⚡
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Select Person (Clean & Multi-Employee Ready) */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                      কার কণ্ঠ রেজিস্টার করবেন? (মালিক বা নির্দিষ্ট কর্মচারী নির্বাচন করুন)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSpeakerType('owner');
                          setIsCustomStaff(false);
                          setSpeakerName('দোকান মালিক');
                        }}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          border: speakerType === 'owner' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                          background: speakerType === 'owner' ? '#eef2ff' : '#ffffff',
                          color: speakerType === 'owner' ? '#4f46e5' : '#475569',
                          fontWeight: '800',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        👑 দোকান মালিক
                      </button>

                      {loadedStaffList.length > 0 && (
                        <select
                          value={speakerType === 'staff' && !isCustomStaff ? selectedStaffId : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              setSpeakerType('staff');
                              setIsCustomStaff(true);
                              setSelectedStaffId(`staff-${Date.now()}`);
                              setSpeakerName('');
                            } else if (val) {
                              setSpeakerType('staff');
                              setIsCustomStaff(false);
                              setSelectedStaffId(val);
                              const s = loadedStaffList.find(x => x.id === val);
                              if (s) setSpeakerName(`${s.name} (${s.role || 'স্টাফ'})`);
                            }
                          }}
                          style={{
                            flex: 1.4,
                            minWidth: '160px',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: speakerType === 'staff' && !isCustomStaff ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                            background: speakerType === 'staff' && !isCustomStaff ? '#eef2ff' : '#ffffff',
                            color: speakerType === 'staff' && !isCustomStaff ? '#4f46e5' : '#475569',
                            fontWeight: '800',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">👔 কর্মচারী নির্বাচন করুন...</option>
                          {loadedStaffList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role || 'স্টাফ'})
                            </option>
                          ))}
                          <option value="__custom__">➕ নতুন কর্মচারীর নাম লিখুন...</option>
                        </select>
                      )}

                      {(!loadedStaffList.length || isCustomStaff) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSpeakerType('staff');
                            setIsCustomStaff(true);
                            setSelectedStaffId(`staff-${Date.now()}`);
                            setSpeakerName('');
                          }}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: isCustomStaff ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                            background: isCustomStaff ? '#eef2ff' : '#ffffff',
                            color: isCustomStaff ? '#4f46e5' : '#475569',
                            fontWeight: '800',
                            fontSize: '12.5px',
                            cursor: 'pointer'
                          }}
                        >
                          ➕ কর্মচারী
                        </button>
                      )}
                    </div>

                    {isCustomStaff && (
                      <div style={{ marginTop: '10px' }}>
                        <input
                          type="text"
                          placeholder="কর্মচারীর নাম ও পদবী (যেমন: সাকিব হাসান - ক্যাশিয়ার)"
                          value={speakerName}
                          onChange={(e) => setSpeakerName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid #4f46e5',
                            fontSize: '13px',
                            fontWeight: '700',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Duration Selector Tabs */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                      রেকর্ডিংয়ের ব্যাপ্তিকাল নির্বাচন করুন:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {[
                        { sec: 10, label: '১০ সেকেন্ড', badge: 'প্রস্তাবিত ও নির্ভুল' },
                        { sec: 15, label: '১৫ সেকেন্ড', badge: 'গোলমাল পরিবেশের জন্য' },
                        { sec: 4, label: '৪ সেকেন্ড', badge: 'দ্রুত স্যাম্পল' }
                      ].map(opt => (
                        <button
                          key={opt.sec}
                          type="button"
                          disabled={isRecording}
                          onClick={() => setEnrollDuration(opt.sec)}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '10px',
                            border: enrollDuration === opt.sec ? '2px solid #059669' : '1.5px solid #e2e8f0',
                            background: enrollDuration === opt.sec ? '#ecfdf5' : '#ffffff',
                            color: enrollDuration === opt.sec ? '#065f46' : '#64748b',
                            fontWeight: '800',
                            fontSize: '12px',
                            cursor: isRecording ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: '900' }}>{opt.label}</span>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '700',
                            color: enrollDuration === opt.sec ? '#047857' : '#94a3b8',
                            lineHeight: 1.2
                          }}>
                            {opt.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Large Spoken Script Box (Natural Bengali Shop Paragraph) */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: speakerType === 'owner' ? '#eef2ff' : '#ecfdf5', color: speakerType === 'owner' ? '#4f46e5' : '#059669', fontSize: '11.5px', fontWeight: '800', marginBottom: '8px' }}>
                      {speakerType === 'owner' ? '👑 প্রধান মালিকের কণ্ঠ ভেরিফিকেশন অনুচ্ছেদ' : '👔 বিক্রয় কর্মীর কণ্ঠ ভেরিফিকেশন অনুচ্ছেদ'}
                    </div>
                    <div style={{
                      fontSize: 'clamp(15px, 3.8vw, 18px)',
                      fontWeight: '800',
                      color: '#0f172a',
                      lineHeight: 1.6,
                      marginBottom: '10px',
                      textAlign: 'justify',
                      background: '#ffffff',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}>
                      &quot;{speakerType === 'owner' ? OWNER_PASSAGE : STAFF_PASSAGE}&quot;
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                      {isRecording ? '🟢 মাইকের কাছে এসে স্বাভাবিক স্বরে উপরের সম্পূর্ণ অনুচ্ছেদটি পড়ুন' : `নিচের বোতাম চেপে ${enrollDuration} সেকেন্ডে স্বাভাবিক স্বরে উপরের লেখাটি পড়ুন`}
                    </p>

                    {/* Clean Audio Visualizer Bar & Live Spoken Text */}
                    {isRecording && (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px' }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              style={{
                                width: '4px',
                                borderRadius: '4px',
                                background: '#059669',
                                height: `${Math.max(6, Math.min(24, (liveVolume / 4) * (i % 2 === 0 ? 1.2 : 0.8)))}px`,
                                transition: 'height 0.1s ease'
                              }}
                            />
                          ))}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '12px',
                          flexWrap: 'wrap',
                          fontSize: '12px',
                          fontWeight: '800',
                          color: '#047857',
                          marginTop: '8px'
                        }}>
                          <span>⏳ সময় বাকি: {countdown} সেকেন্ড</span>
                          <span>📊 সংগৃহীত স্বর নমুনা: {collectedFrameCount} টি</span>
                          {livePitch > 0 && <span>🔊 ফ্রিকোয়েন্সি: {livePitch} Hz</span>}
                        </div>

                        {liveSpokenText ? (
                          <div style={{
                            marginTop: '8px',
                            padding: '6px 12px',
                            background: '#ecfdf5',
                            border: '1.5px solid #6ee7b7',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '800',
                            color: '#065f46',
                            display: 'inline-block'
                          }}>
                            🗣️ শনাক্তকৃত কণ্ঠস্বর: &quot;{liveSpokenText}&quot;
                          </div>
                        ) : (
                          <div style={{
                            marginTop: '6px',
                            fontSize: '11px',
                            color: '#059669',
                            fontWeight: '700'
                          }}>
                            🎙️ মাইকে কথা বলুন... কণ্ঠের বায়োমেট্রিক ফ্রেম রেকর্ড হচ্ছে
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Clean Voice Record Buttons */}
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={() => startFullVoiceEnrollment(enrollDuration)}
                      style={{
                        background: isRecording ? '#dc2626' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '14px 24px',
                        borderRadius: '14px',
                        fontSize: '14px',
                        fontWeight: '900',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                        transition: 'all 0.15s ease',
                        width: '100%',
                        justifyContent: 'center'
                      }}
                    >
                      <span>
                        {isRecording
                          ? `⏳ কণ্ঠ শুনছি ও মাপছি (${countdown}s - ${collectedFrameCount}টি নমুনা)...`
                          : `🎙️ ${enrollDuration} সেকেন্ড বিস্তারিত কণ্ঠ রেকর্ড ও বায়োমেট্রিক লক করুন`}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={startRecordingStep}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🎙️ বিকল্প: ৩-ধাপের উইজার্ড (ধাপ {currentStepIndex + 1}/৩)</span>
                    </button>

                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                      {enrollDuration >= 10 ? '১০-১৫ সেকেন্ডের বিস্তারিত রেকর্ডিংয়ে কণ্ঠস্বরের নিখুঁত বায়োমেট্রিক প্রোফাইল তৈরি হয়।' : 'স্বাভাবিক স্বরে উপরের বাক্যটি পড়ুন। আপনার কণ্ঠের নিখুঁত ফ্রিকোয়েন্সি রেকর্ড হবে।'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTERED PROFILES */}
          {activeTab === 'list' && (
            <div>
              {actionToast && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: '800',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>✓</span> {actionToast}
                </div>
              )}

              {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b' }}>
                  <div style={{ fontSize: '30px', marginBottom: '6px' }}>🎙️</div>
                  <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#1e293b' }}>কোনো কণ্ঠ নিবন্ধিত নেই</div>
                  <p style={{ fontSize: '11.5px', margin: '4px 0 12px' }}>
                    টিভি বা কাস্টমারের কথা ফিল্টার করতে মালিক বা কর্মচারীর কণ্ঠ এনরোল করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('enroll')}
                    style={{
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    + এখনই এনরোল করুন
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {profiles.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          background: '#ffffff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{p.role === 'owner' ? '👑' : '👔'}</span>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              গড় পিচ: {p.pitchMean} Hz • {p.role === 'owner' ? 'মালিক' : 'স্টাফ'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            সক্রিয়
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(p.id)}
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            মুছুন
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={handleResetAllProfiles}
                      style={{
                        background: '#fff1f2',
                        border: '1.5px solid #fecdd3',
                        color: '#e11d48',
                        borderRadius: '10px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                    >
                      🗑️ সব সংরক্ষিত কণ্ঠ মুছে ফেলুন (রিসেট)
                    </button>
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                      নতুন করে ফ্রেশ ভাবে ভয়েস রেজিস্টার করতে চাইলে ওপরের বাটনে চাপুন
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE TEST */}
          {activeTab === 'test' && (
            <div>
              <div style={{
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1.5px solid',
                borderColor: testStatus?.authorized ? '#10b981' : testStatus ? '#ef4444' : '#e2e8f0',
                background: testStatus?.authorized ? '#f0fdf4' : testStatus ? '#fef2f2' : '#f8fafc',
                marginBottom: '14px',
                minHeight: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {isTesting ? (
                  testStatus ? (
                    testStatus.authorized ? (
                      <div>
                        <div style={{ fontSize: '28px', marginBottom: '2px' }}>✅</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#15803d' }}>
                          অনুমোদিত কণ্ঠ: {testStatus.speakerName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '2px' }}>
                          কনফিডেন্স: {testStatus.confidence}% • পিচ: {testStatus.pitch} Hz (মেমো তৈরি হবে)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '28px', marginBottom: '2px' }}>🛡️</div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#dc2626' }}>
                          টিভি / অননুমোদিত শব্দ ফিল্টার করা হয়েছে
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#991b1b', marginTop: '2px' }}>
                          {testStatus.reason === 'background_noise_or_tv' ? 'টিভি বা পেছনের শব্দ' : 'অননুমোদিত ব্যক্তির কণ্ঠ'} বাতিল
                        </div>
                      </div>
                    )
                  ) : (
                    <div>
                      <div style={{ fontSize: '24px', marginBottom: '2px' }}>🎙️</div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#475569' }}>
                        মাইক্রোফোনে কথা বলুন...
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '2px' }}>⚡</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#475569' }}>
                      টেস্ট শুরু করতে নিচের বাটনে চাপুন
                    </div>
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isTesting) stopAudio();
                    else startLiveTest();
                  }}
                  style={{
                    background: isTesting ? '#ef4444' : '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  {isTesting ? '⏹️ টেস্ট বন্ধ' : '▶️ লাইভ টেস্ট শুরু'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Clean Minimal Footer */}
        <div style={{
          padding: '10px 20px',
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => { stopAudio(); onClose(); }}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
