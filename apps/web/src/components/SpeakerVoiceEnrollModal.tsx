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

const CALIBRATION_PHRASES = [
  { step: 1, title: 'দোকানের নাম', phrase: 'আমার দোকান সহজ হিসাব', hint: 'স্পষ্ট স্বরে স্বাভাবিক গতিতে ৩ সেকেন্ড বলুন' },
  { step: 2, title: 'পণ্য তালিকা', phrase: 'তেল চিনি চাল ডাল সাবান', hint: 'স্বাভাবিক বিক্রির কণ্ঠস্বরে বলুন' },
  { step: 3, title: 'লেনদেন বাক্য', phrase: 'ক্যাশ বিক্রি পাঁচশত টাকা', hint: 'শেষ বাক্যটি বলে ভেরিফাই সম্পন্ন করুন' }
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
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [profiles, setProfiles] = useState<SpeakerVoiceProfile[]>([]);

  // Enrollment State
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('owner');
  const [speakerName, setSpeakerName] = useState<string>('দোকান মালিক');
  const [currentStep, setCurrentStep] = useState<number>(0); // 0, 1, 2 (corresponds to phrases)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [livePitch, setLivePitch] = useState<number>(0);
  const [liveRms, setLiveRms] = useState<number>(0);
  const [collectedPitches, setCollectedPitches] = useState<number[][]>([[], [], []]);
  const [collectedCentroids, setCollectedCentroids] = useState<number[][]>([[], [], []]);
  const [enrollSuccess, setEnrollSuccess] = useState<boolean>(false);

  // Live Test State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    authorized: boolean;
    speakerName?: string;
    pitch?: number;
    reason?: string;
    confidence?: number;
  } | null>(null);

  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<any>(null);

  // Load initial data
  useEffect(() => {
    if (!isOpen) return;
    const locked = isSpeakerLockEnabled(tenantId);
    setIsLockEnabled(locked);
    const loaded = getSpeakerVoiceProfiles(tenantId);
    setProfiles(loaded);

    if (preSelectedStaffId) {
      setSelectedSpeakerId(preSelectedStaffId);
      const matched = staffList.find(s => s.id === preSelectedStaffId);
      if (matched) {
        setSpeakerName(matched.name);
      }
    } else {
      setSelectedSpeakerId('owner');
      setSpeakerName('দোকান মালিক');
    }

    setCurrentStep(0);
    setCollectedPitches([[], [], []]);
    setCollectedCentroids([[], [], []]);
    setEnrollSuccess(false);
    setTestResult(null);
  }, [isOpen, tenantId, preSelectedStaffId]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      stopAudioEngine();
    };
  }, []);

  const stopAudioEngine = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
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
  };

  const handleToggleLock = (enabled: boolean) => {
    setIsLockEnabled(enabled);
    setSpeakerLockEnabled(tenantId, enabled);
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleDelete = (profileId: string) => {
    if (!confirm('আপনি কি এই কণ্ঠ প্রোফাইলটি মুছে ফেলতে চান?')) return;
    deleteSpeakerVoiceProfile(tenantId, profileId);
    const updated = getSpeakerVoiceProfiles(tenantId);
    setProfiles(updated);
    if (onProfileUpdated) onProfileUpdated();
  };

  // Start Calibration recording for the active step
  const startStepRecording = async () => {
    stopAudioEngine();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
        alert('আপনার ডিভাইসে অডিও রেকর্ডার সাপোর্ট করে না।');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Keep raw vocal harmonics
          autoGainControl: false   // CRITICAL: Prevent auto-amplifying TV or distant murmur
        }
      });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);
      const stepPitches: number[] = [];
      const stepCentroids: number[] = [];

      const sampleRate = audioCtx.sampleRate || 44100;
      const timeData = new Float32Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);
        analyserRef.current.getByteFrequencyData(freqData);

        // Calculate RMS Energy
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          sum += timeData[i] * timeData[i];
        }
        const rms = Math.sqrt(sum / timeData.length) * 100;
        setLiveRms(Math.min(100, Math.round(rms * 4)));

        // Extract pitch
        const pitchRes = extractPitchFromTimeDomain(timeData, sampleRate);
        if (pitchRes && pitchRes.pitch >= 75 && pitchRes.pitch <= 350) {
          setLivePitch(pitchRes.pitch);
          stepPitches.push(pitchRes.pitch);
          const centroid = extractSpectralCentroid(freqData, sampleRate);
          if (centroid > 0) stepCentroids.push(centroid);
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);

      // Record for 3.5 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        stopAudioEngine();

        if (stepPitches.length < 5) {
          alert('⚠️ পর্যাপ্ত কণ্ঠ শোনা যায়নি। মাইক্রোফোনের কাছে স্পষ্ট স্বরে আবার বলুন।');
          return;
        }

        // Store step data
        const updatedPitches = [...collectedPitches];
        const updatedCentroids = [...collectedCentroids];
        updatedPitches[currentStep] = stepPitches;
        updatedCentroids[currentStep] = stepCentroids;
        setCollectedPitches(updatedPitches);
        setCollectedCentroids(updatedCentroids);

        if (currentStep < 2) {
          setCurrentStep(currentStep + 1);
        } else {
          // All 3 steps complete! Compute profile
          finishEnrollment(updatedPitches, updatedCentroids);
        }
      }, 3500);

    } catch (err: any) {
      console.error('Microphone error:', err);
      alert('মাইক্রোফোন চালু করা যায়নি: ' + (err.message || 'অনুমতি দিন'));
      setIsRecording(false);
    }
  };

  const finishEnrollment = (allPitches: number[][], allCentroids: number[][]) => {
    const flatPitches = allPitches.flat().filter(p => p >= 75 && p <= 350);
    const flatCentroids = allCentroids.flat().filter(c => c > 0);

    if (flatPitches.length === 0) {
      alert('ভয়েস প্রোফাইল তৈরি সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setCurrentStep(0);
      return;
    }

    flatPitches.sort((a, b) => a - b);
    const pitchMin = flatPitches[Math.floor(flatPitches.length * 0.05)] || flatPitches[0];
    const pitchMax = flatPitches[Math.floor(flatPitches.length * 0.95)] || flatPitches[flatPitches.length - 1];
    const pitchMean = Math.round(flatPitches.reduce((a, b) => a + b, 0) / flatPitches.length);

    const centroidMean = flatCentroids.length > 0
      ? Math.round(flatCentroids.reduce((a, b) => a + b, 0) / flatCentroids.length)
      : 1200;

    const newProfile: SpeakerVoiceProfile = {
      id: selectedSpeakerId,
      name: speakerName || (selectedSpeakerId === 'owner' ? 'দোকান মালিক' : 'স্টাফ'),
      role: selectedSpeakerId === 'owner' ? 'owner' : 'staff',
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

  // Live Test Mode: Verifies whoever speaks in real time
  const startLiveTest = async () => {
    stopAudioEngine();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsTesting(true);

      const loop = () => {
        if (!analyserRef.current) return;
        const res = verifyLiveSpeaker(analyserRef.current, tenantId);
        if (res.reason !== 'silence') {
          setTestResult({
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
      alert('টেস্ট চালু করা যায়নি: ' + e.message);
      setIsTesting(false);
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      fontFamily: "'Hind Siliguri', 'Outfit', sans-serif"
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        border: '1.5px solid #e2e8f0'
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          padding: '20px 22px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={() => { stopAudioEngine(); onClose(); }}
            style={{
              position: 'absolute',
              right: '16px',
              top: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            ✕
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', padding: '2px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>
            <span>🛡️ AI স্পিকার বায়োমেট্রিক শিল্ড</span>
            <span>•</span>
            <span>নয়েজ ও টিভি ফিল্টার</span>
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: '19px', fontWeight: '900', letterSpacing: '-0.2px' }}>
            দোকানদার ও স্টাফ ভয়েস বায়োমেট্রিক
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#c7d2fe', lineHeight: 1.4 }}>
            মালিক ও কর্মচারীদের কণ্ঠ রেজিস্টার করুন যাতে টিভি, গান বা ক্রেতাদের কোনো কথায় স্বয়ংক্রিয় মেমো তৈরি না হয়।
          </p>

          {/* Master Lock Toggle */}
          <div style={{
            marginTop: '14px',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '10px 14px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{isLockEnabled ? '🔒' : '🔓'}</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>
                  ভয়েস বায়োমেট্রিক শিল্ড {isLockEnabled ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </div>
                <div style={{ fontSize: '10.5px', color: isLockEnabled ? '#a7f3d0' : '#fecaca' }}>
                  {isLockEnabled
                    ? '✓ কেবল রেজিস্টার্ড কণ্ঠেই ভয়েস বিক্রি হবে'
                    : 'সব ধরনের কণ্ঠ থেকেই ভয়েস কমান্ড গ্রহণ হবে'}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleToggleLock(!isLockEnabled)}
              style={{
                background: isLockEnabled ? '#10b981' : 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '900',
                cursor: 'pointer'
              }}
            >
              {isLockEnabled ? 'চালু আছে' : 'চালু করুন'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '4px 12px 0'
        }}>
          {[
            { id: 'enroll', label: '🎙️ নতুন কণ্ঠ এনরোল', icon: '➕' },
            { id: 'list', label: `👥 রেজিস্টার্ড কণ্ঠ (${profiles.length})`, icon: '📋' },
            { id: 'test', label: '🧪 লাইভ মাইক টেস্ট', icon: '⚡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { stopAudioEngine(); setActiveTab(tab.id as any); }}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2.5px solid #4f46e5' : '2.5px solid transparent',
                background: 'transparent',
                color: activeTab === tab.id ? '#4f46e5' : '#64748b',
                fontWeight: activeTab === tab.id ? '800' : '600',
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* ============================================================ */}
          {/* TAB 1: ENROLLMENT WIZARD */}
          {/* ============================================================ */}
          {activeTab === 'enroll' && (
            <div>
              {enrollSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#166534',
                    fontSize: '32px',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 14px'
                  }}>
                    ✓
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                    ভয়েস প্রোফাইল সফলভাবে রেজিস্টার হয়েছে!
                  </h3>
                  <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b' }}>
                    <strong>{speakerName}</strong> এর কণ্ঠস্বরের ফ্রিকোয়েন্সি (Pitch & Harmonic Centroid) সেভ করা হয়েছে। এখন থেকে এই ব্যক্তির কণ্ঠেই স্বয়ংক্রিয় মেমো তৈরি হবে।
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setEnrollSuccess(false);
                        setCurrentStep(0);
                        setCollectedPitches([[], [], []]);
                        setCollectedCentroids([[], [], []]);
                      }}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '9px 16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      আরেকটি কণ্ঠ যোগ করুন
                    </button>
                    <button
                      onClick={() => { setActiveTab('test'); startLiveTest(); }}
                      style={{
                        background: '#4f46e5',
                        color: '#ffffff',
                        border: 'none',
                        padding: '9px 18px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '900',
                        cursor: 'pointer'
                      }}
                    >
                      মাইকে টেস্ট করুন ⚡
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Step 0: User Selection */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                      ১. কার কণ্ঠ রেজিস্টার করবেন?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpeakerId('owner');
                          setSpeakerName('দোকান মালিক');
                        }}
                        style={{
                          padding: '10px',
                          borderRadius: '12px',
                          border: selectedSpeakerId === 'owner' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          background: selectedSpeakerId === 'owner' ? '#eef2ff' : '#ffffff',
                          color: selectedSpeakerId === 'owner' ? '#4f46e5' : '#475569',
                          fontWeight: '800',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: 'center'
                        }}
                      >
                        <span>👑</span> দোকান মালিক
                      </button>

                      {staffList.length > 0 ? (
                        <select
                          value={selectedSpeakerId === 'owner' ? '' : selectedSpeakerId}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setSelectedSpeakerId(val);
                              const s = staffList.find(item => item.id === val);
                              if (s) setSpeakerName(s.name);
                            }
                          }}
                          style={{
                            padding: '10px',
                            borderRadius: '12px',
                            border: selectedSpeakerId !== 'owner' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            background: selectedSpeakerId !== 'owner' ? '#eef2ff' : '#ffffff',
                            color: selectedSpeakerId !== 'owner' ? '#4f46e5' : '#475569',
                            fontWeight: '800',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="">কর্মচারী নির্বাচন করুন...</option>
                          {staffList.map(s => (
                            <option key={s.id} value={s.id}>
                              👔 {s.name} ({s.role || 'স্টাফ'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                          স্টাফ যোগ করতে 'স্টাফ পেজ' দেখুন
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      placeholder="ব্যক্তির নাম লিখুন..."
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* 3 Steps Stepper */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    background: '#f8fafc',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {CALIBRATION_PHRASES.map((item, idx) => (
                      <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: currentStep > idx ? '#10b981' : currentStep === idx ? '#4f46e5' : '#cbd5e1',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '900',
                          display: 'grid',
                          placeItems: 'center'
                        }}>
                          {currentStep > idx ? '✓' : item.step}
                        </div>
                        <span style={{
                          fontSize: '11.5px',
                          fontWeight: currentStep === idx ? '800' : '600',
                          color: currentStep === idx ? '#0f172a' : '#64748b'
                        }}>
                          {item.title}
                        </span>
                        {idx < 2 && <span style={{ color: '#cbd5e1', margin: '0 4px' }}>→</span>}
                      </div>
                    ))}
                  </div>

                  {/* Spoken Phrase Card */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '2px dashed #86efac',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    position: 'relative'
                  }}>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>
                      ধাপ {currentStep + 1}: মাইক্রোফোনের কাছে নিচের বাক্যটি পড়ুন
                    </span>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: '900', color: '#14532d', margin: '8px 0 4px' }}>
                      "{CALIBRATION_PHRASES[currentStep].phrase}"
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534' }}>
                      {CALIBRATION_PHRASES[currentStep].hint}
                    </div>

                    {/* Live Wave & Pitch Feedback */}
                    {isRecording && (
                      <div style={{ marginTop: '14px', padding: '10px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>
                          <span>🎙️ কথা শুনছি (৩.৫ সেকেন্ড)...</span>
                          <span>ফ্রিকোয়েন্সি: {livePitch ? `${livePitch} Hz` : 'শুনছি...'}</span>
                        </div>

                        {/* Visual Energy Bar */}
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${liveRms}%`,
                            background: liveRms > 20 ? '#10b981' : '#f59e0b',
                            transition: 'width 0.1s ease'
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Record Button */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      disabled={isRecording}
                      onClick={startStepRecording}
                      style={{
                        background: isRecording ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: '14px',
                        fontSize: '14px',
                        fontWeight: '900',
                        cursor: isRecording ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      <span>{isRecording ? '⏳ কথা বলা শুনছি...' : '🎙️ মাইক অন করে বলুন'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: REGISTERED PROFILES LIST */}
          {/* ============================================================ */}
          {activeTab === 'list' && (
            <div>
              {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎙️</div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>কোনো কণ্ঠ এখনো রেজিস্টার করা হয়নি</div>
                  <p style={{ fontSize: '12px', margin: '4px 0 14px' }}>
                    টিভি ও কাস্টমার শিল্ড সক্রিয় করতে মালিক ও ক্যাশিয়ারের কণ্ঠ রেজিস্টার করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('enroll')}
                    style={{
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    + এখনই এনরোল করুন
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {profiles.map(p => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: '1.5px solid #e2e8f0',
                        background: '#ffffff'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: p.role === 'owner' ? '#fef3c7' : '#e0e7ff',
                          color: p.role === 'owner' ? '#b45309' : '#3730a3',
                          fontSize: '18px',
                          display: 'grid',
                          placeItems: 'center'
                        }}>
                          {p.role === 'owner' ? '👑' : '👔'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            গড় পিচ: <strong style={{ color: '#4f46e5' }}>{p.pitchMean} Hz</strong> ({p.pitchMin} - {p.pitchMax} Hz) • {p.role === 'owner' ? 'মালিক' : 'স্টাফ'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                          ✓ এনরোলড
                        </span>
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
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
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: LIVE MIC TEST & TV FILTER DEMO */}
          {/* ============================================================ */}
          {activeTab === 'test' && (
            <div>
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px'
              }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  🧪 লাইভ বায়োমেট্রিক ও টিভি টেস্ট
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  মাইক্রোফোন অন করে আপনি নিজে কথা বলুন, অথবা পাশে টিভি/গান ছেড়ে বা অন্য কোনো কাস্টমারকে কথা বলতে বলুন। সিস্টেম তৎক্ষণাৎ চিনতে পারবে এটা কি দোকানদারের কণ্ঠ নাকি অননুমোদিত শব্দ।
                </p>
              </div>

              {/* Status Box */}
              <div style={{
                padding: '20px',
                borderRadius: '18px',
                textAlign: 'center',
                border: '2px solid',
                borderColor: testResult?.authorized ? '#10b981' : testResult ? '#ef4444' : '#cbd5e1',
                background: testResult?.authorized ? '#f0fdf4' : testResult ? '#fef2f2' : '#ffffff',
                marginBottom: '16px',
                minHeight: '130px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {isTesting ? (
                  testResult ? (
                    testResult.authorized ? (
                      <div>
                        <div style={{ fontSize: '36px', marginBottom: '4px' }}>✅</div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#15803d' }}>
                          অনুমোদিত কণ্ঠ: {testResult.speakerName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                          কনফিডেন্স: {testResult.confidence}% • ডিটেক্টেড পিচ: {testResult.pitch} Hz (মেমো তৈরি গ্রহণযোগ্য)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '36px', marginBottom: '4px' }}>🛡️</div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>
                          অননুমোদিত কণ্ঠ ফিল্টার করা হয়েছে!
                        </div>
                        <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
                          কারণ: {testResult.reason === 'background_noise_or_tv' ? 'টিভি / ব্যাকগ্রাউন্ড নয়েজ / দূরবর্তী শব্দ' : 'অনিবন্ধিত কাস্টমারের কথা'}
                          {testResult.pitch ? ` (${testResult.pitch} Hz)` : ''}
                        </div>
                      </div>
                    )
                  ) : (
                    <div>
                      <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎙️</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#475569' }}>
                        মাইক্রোফোনে কথা বলুন...
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        সিস্টেম আপনার কণ্ঠ ও ব্যাকগ্রাউন্ড টিভি লাইভ বিশ্লেষণ করছে
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <div style={{ fontSize: '28px', marginBottom: '4px' }}>⚡</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#475569' }}>
                      টেস্ট শুরু করতে নিচের বাটনে চাপ দিন
                    </div>
                  </div>
                )}
              </div>

              {/* Start / Stop Test Button */}
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isTesting) {
                      stopAudioEngine();
                    } else {
                      startLiveTest();
                    }
                  }}
                  style={{
                    background: isTesting ? '#ef4444' : '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '11px 24px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    fontWeight: '900',
                    cursor: 'pointer'
                  }}
                >
                  {isTesting ? '⏹️ টেস্ট বন্ধ করুন' : '▶️ লাইভ টেস্ট শুরু করুন'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={() => { stopAudioEngine(); onClose(); }}
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1.5px solid #cbd5e1',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
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
