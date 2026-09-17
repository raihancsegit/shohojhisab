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

const PHRASES = [
  { step: 1, title: 'দোকানের নাম', phrase: 'আমার দোকান সহজ হিসাব' },
  { step: 2, title: 'পণ্য তালিকা', phrase: 'তেল চিনি চাল ডাল সাবান' },
  { step: 3, title: 'লেনদেন', phrase: 'ক্যাশ বিক্রি পাঁচশত টাকা' }
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
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);

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

  // Load profiles on open
  useEffect(() => {
    if (!isOpen) return;
    const locked = isSpeakerLockEnabled(tenantId);
    setIsLockEnabled(locked);
    const loaded = getSpeakerVoiceProfiles(tenantId);
    setProfiles(loaded);

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
    if (!confirm('এই কণ্ঠ প্রোফাইলটি মুছে ফেলতে চান?')) return;
    deleteSpeakerVoiceProfile(tenantId, id);
    const updated = getSpeakerVoiceProfiles(tenantId);
    setProfiles(updated);
    if (onProfileUpdated) onProfileUpdated();
  };

  // Safe Microphone Initializer
  const getMicrophoneStream = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
    } catch (e) {
      // Fallback for devices that reject autoGainControl: false
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  };

  // Start Voice Enrollment Recording (3.5 seconds)
  const startRecordingStep = async () => {
    stopAudio();
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

      const stepPitches: number[] = [];
      const stepCentroids: number[] = [];
      const sampleRate = audioCtx.sampleRate || 44100;
      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);
        analyserRef.current.getByteFrequencyData(freqData);

        // RMS Energy
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          sum += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sum / timeData.length) * 100;
        setLiveVolume(Math.min(100, Math.round(rms * 5)));

        // Pitch
        const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
        if (pitchRes && pitchRes.pitch >= 70 && pitchRes.pitch <= 350) {
          setLivePitch(pitchRes.pitch);
          stepPitches.push(pitchRes.pitch);
          const centroid = extractSpectralCentroid(freqData, sampleRate);
          if (centroid > 0) stepCentroids.push(centroid);
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
          stopAudio();

          if (stepPitches.length < 4) {
            alert('⚠️ কণ্ঠ স্পষ্ট শোনা যায়নি। মাইক্রোফোনের কাছে মুখ এনে পুনরায় স্পষ্ট স্বরে বলুন।');
            return;
          }

          const updatedPitches = [...collectedPitches];
          const updatedCentroids = [...collectedCentroids];
          updatedPitches[currentStepIndex] = stepPitches;
          updatedCentroids[currentStepIndex] = stepCentroids;
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
      alert('মাইক্রোফোন অনুমতি দেওয়া হয়নি: ' + (err.message || 'ত্রুটি'));
      setIsRecording(false);
    }
  };

  const finalizeEnrollment = (pitches: number[][], centroids: number[][]) => {
    const flatPitches = pitches.flat().filter(p => p >= 70 && p <= 350);
    const flatCentroids = centroids.flat().filter(c => c > 0);

    if (flatPitches.length === 0) {
      alert('ভয়েস প্রোফাইল তৈরি করা যায়নি। আবার চেষ্টা করুন।');
      setCurrentStepIndex(0);
      return;
    }

    flatPitches.sort((a, b) => a - b);
    const pitchMin = flatPitches[Math.floor(flatPitches.length * 0.05)] || flatPitches[0];
    const pitchMax = flatPitches[Math.floor(flatPitches.length * 0.95)] || flatPitches[flatPitches.length - 1];
    const pitchMean = Math.round(flatPitches.reduce((a, b) => a + b, 0) / flatPitches.length);
    const centroidMean = flatCentroids.length > 0
      ? Math.round(flatCentroids.reduce((a, b) => a + b, 0) / flatCentroids.length)
      : 1200;

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
      centroidMean,
      samplesCollected: flatPitches.length
    };

    saveSpeakerVoiceProfile(tenantId, newProfile);
    setSpeakerLockEnabled(tenantId, true);
    setIsLockEnabled(true);

    const updated = getSpeakerVoiceProfiles(tenantId);
    setProfiles(updated);
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

      const loop = () => {
        if (!analyserRef.current) return;
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
                    কণ্ঠ সফলভাবে রেজিস্টার হয়েছে!
                  </h4>
                  <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                    <strong>{speakerName}</strong> এর কণ্ঠস্বরের ফ্রিকোয়েন্সি সংরক্ষিত হয়েছে। এখন থেকে এই ব্যক্তির কণ্ঠ ছাড়া ব্যাকগ্রাউন্ড টিভি বা বাইরের শব্দে মেমো তৈরি হবে না।
                  </p>
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
                  {/* Select Person (Clean & Compact) */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '5px' }}>
                      কার কণ্ঠ রেজিস্টার করবেন?
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSpeakerType('owner');
                          setSpeakerName('দোকান মালিক');
                        }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: speakerType === 'owner' ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                          background: speakerType === 'owner' ? '#eef2ff' : '#ffffff',
                          color: speakerType === 'owner' ? '#4f46e5' : '#475569',
                          fontWeight: '800',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        👑 দোকান মালিক
                      </button>

                      {staffList.length > 0 && (
                        <select
                          value={speakerType === 'staff' ? selectedStaffId : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setSpeakerType('staff');
                              setSelectedStaffId(val);
                              const s = staffList.find(x => x.id === val);
                              if (s) setSpeakerName(s.name);
                            }
                          }}
                          style={{
                            flex: 1.2,
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: speakerType === 'staff' ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                            background: speakerType === 'staff' ? '#eef2ff' : '#ffffff',
                            color: speakerType === 'staff' ? '#4f46e5' : '#475569',
                            fontWeight: '800',
                            fontSize: '12px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">👔 কর্মচারী নির্বাচন...</option>
                          {staffList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.role || 'স্টাফ'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Clean Step Counter */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '6px' }}>
                      ধাপ {currentStepIndex + 1} / ৩: {PHRASES[currentStepIndex].title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      স্বাভাবিক স্বরে পড়ুন
                    </span>
                  </div>

                  {/* Large Spoken Phrase Box (Spacious, Beautiful, No Clutter) */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      fontSize: 'clamp(20px, 5vw, 24px)',
                      fontWeight: '900',
                      color: '#0f172a',
                      marginBottom: '6px',
                      letterSpacing: '-0.3px'
                    }}>
                      "{PHRASES[currentStepIndex].phrase}"
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      মাইকে ট্যাপ করে ৩ সেকেন্ডের মধ্যে বাক্যটি পড়ুন
                    </p>

                    {/* Clean Audio Visualizer Bar */}
                    {isRecording && (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '24px' }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              style={{
                                width: '4px',
                                borderRadius: '4px',
                                background: '#4f46e5',
                                height: `${Math.max(6, Math.min(24, (liveVolume / 4) * (i % 2 === 0 ? 1.2 : 0.8)))}px`,
                                transition: 'height 0.1s ease'
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', marginTop: '6px' }}>
                          ⏳ কথা শুনছি ({countdown}s)... {livePitch ? `${livePitch} Hz` : ''}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Single Clean Record Button */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={startRecordingStep}
                      style={{
                        background: isRecording ? '#dc2626' : '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        padding: '11px 26px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(79, 70, 229, 0.25)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{isRecording ? '⏳ শুনছি...' : '🎙️ বলুন (৩ সেকেন্ড)'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTERED PROFILES */}
          {activeTab === 'list' && (
            <div>
              {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b' }}>
                  <div style={{ fontSize: '30px', marginBottom: '6px' }}>🎙️</div>
                  <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#1e293b' }}>কোনো কণ্ঠ নিবন্ধিত নেই</div>
                  <p style={{ fontSize: '11.5px', margin: '4px 0 12px' }}>
                    টিভি বা কাস্টমারের কথা ফিল্টার করতে মালিকের কণ্ঠ এনরোল করুন।
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
                          onClick={() => handleDeleteProfile(p.id)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 7px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          মুছুন
                        </button>
                      </div>
                    </div>
                  ))}
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
