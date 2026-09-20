'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { cleanSpokenBengali, extractTranscriptFromEvent } from '../lib/banglaSpeechUtils';
import { playMicStartSound, playSuccessChime, playWarningSound, playMicStopSound } from '../lib/audioFeedbackUtils';
import { executeOfflineAiShopCommand } from '../lib/offlineAiEngine';
import {
  verifyCurrentVoice,
  pingVoiceVerification,
  isSpeakerLockEnabled,
  stopBiometricMonitoring,
  SpeakerVoiceProfile,
  SpeakerVerificationResult
} from '../lib/speakerProfileEngine';

export interface VoiceAgentOptions {
  tenantId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface VoiceAgentState {
  isListening: boolean;
  isProcessing: boolean;
  liveTranscript: string;
  lastSpoken: string;
  feedbackText: string;
  feedbackType: 'listening' | 'processing' | 'success' | 'error' | null;
  activeSpeaker: SpeakerVoiceProfile | null;
  currentMode: 'owner' | 'staff' | 'stranger' | null;
  isSupported: boolean;
  isSpeakerLockActive: boolean;
  startListening: () => void;
  stopListening: () => void;
  cancelVoice: () => void;
  executeCommand: (customText?: string) => Promise<void>;
  setFeedbackType: (type: 'listening' | 'processing' | 'success' | 'error' | null) => void;
  setFeedbackText: (text: string) => void;
}

/**
 * useVoiceAgent - Flawless Voice Recognition & Multi-Role Biometrics Hook
 * - Prevents Windows/Chrome WASAPI microphone collisions (zero "শুনছি..." freeze).
 * - Distinguishes between Owner Mode (👑 মালিক) and Staff Mode (👔 কর্মচারী).
 * - Strictly rejects unauthorized voices, customer chatter, and laptop TV/video sounds.
 */
export function useVoiceAgent(options: VoiceAgentOptions = {}): VoiceAgentState {
  const { tenant, triggerHaptic, speakAnnouncement } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [lastSpoken, setLastSpoken] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'listening' | 'processing' | 'success' | 'error' | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerVoiceProfile | null>(null);
  const [currentMode, setCurrentMode] = useState<'owner' | 'staff' | 'stranger' | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isSpeakerLockActive, setIsSpeakerLockActive] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const autoDismissTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);
  const restartResetTimerRef = useRef<any>(null);
  const restartCounterRef = useRef<number>(0);
  const spawnRecognitionRef = useRef<(() => void) | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  const effectiveTenantId = options.tenantId || tenant?.id || (() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('lbos_active_tenant') : null;
      if (raw) return JSON.parse(raw)?.id;
    } catch (e) {}
    return 'default';
  })();

  // Check Web Speech API support and Lock state
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
    const locked = isSpeakerLockEnabled(effectiveTenantId);
    setIsSpeakerLockActive(locked);
  }, [effectiveTenantId]);

  // Teardown timers on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListeningOnly = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (restartResetTimerRef.current) clearTimeout(restartResetTimerRef.current);
    restartCounterRef.current = 0;
    isListeningRef.current = false;
    setIsListening(false);
    playMicStopSound();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  }, []);

  const cancelVoice = useCallback(() => {
    stopListeningOnly();
    setFeedbackType(null);
    setLiveTranscript('');
    latestTranscriptRef.current = '';
  }, [stopListeningOnly]);

  const resetInactivityWatchdog = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !latestTranscriptRef.current.trim()) {
        stopListeningOnly();
        setFeedbackType('error');
        setFeedbackText('কোনো কথা শোনা যায়নি। আবার মুখে বলুন।');
        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 2800);
      }
    }, 7000);
  }, [stopListeningOnly]);

  /**
   * Execute Spoken or Manual Command
   */
  const executeCommand = useCallback(async (customText?: string) => {
    stopListeningOnly();
    const raw = customText || latestTranscriptRef.current || liveTranscript;
    const query = cleanSpokenBengali(raw);

    if (!query) {
      setFeedbackType('error');
      setFeedbackText('কথা বোঝা যায়নি, আবার বলুন।');
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = setTimeout(() => {
        setFeedbackType(null);
      }, 3000);
      return;
    }

    const tenantKey = effectiveTenantId;
    let speakerRole: 'owner' | 'staff' = 'owner';
    let speakerName = 'দোকান মালিক';

    // 🛡️ Biometric Speaker Verification & Anti-Laptop Shield
    if (isSpeakerLockEnabled(tenantKey)) {
      const speakerCheck: SpeakerVerificationResult = verifyCurrentVoice(tenantKey, undefined, query);

      if (!speakerCheck.isAuthorized) {
        triggerHaptic?.('warning');
        playWarningSound();
        setFeedbackType('error');
        setCurrentMode('stranger');

        if (speakerCheck.reason === 'background_noise_or_tv') {
          setFeedbackText('🛡️ ল্যাপটপ বা পেছনের শব্দ ফিল্টার হয়েছে (বাতিল)');
        } else {
          setFeedbackText('🛡️ অননুমোদিত ব্যক্তির কণ্ঠ বাতিল (শুধুমাত্র নিবন্ধিত মালিক বা কর্মচারীর কথা নেওয়া হবে)');
        }

        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 3800);
        return;
      }

      if (speakerCheck.matchedSpeaker) {
        setActiveSpeaker(speakerCheck.matchedSpeaker);
        speakerRole = speakerCheck.matchedSpeaker.role;
        speakerName = speakerCheck.matchedSpeaker.name;
      } else if (speakerCheck.role) {
        speakerRole = speakerCheck.role;
        speakerName = speakerCheck.speakerName || (speakerRole === 'owner' ? 'দোকান মালিক' : 'কর্মচারী');
      }

      // 👔 Staff Mode Permission Gate: Protect sensitive financial & owner-only metrics
      if (speakerRole === 'staff') {
        const isRestrictedQuery = /(লাভ|মুনাফা|প্রফিট|ব্যবসায়িক লাভ|নিট লাভ|মোট লাভ|ক্যাশ ড্রয়ার|ক্যাশ বাক্স|দিন শেষ|রিসেট|পাসওয়ার্ড|সেটিংস|ডিলিট)/i.test(query);
        if (isRestrictedQuery) {
          triggerHaptic?.('warning');
          playWarningSound();
          setFeedbackType('error');
          setCurrentMode('staff');
          setFeedbackText(`👔 [কর্মচারী: ${speakerName}] মুনাফা বা লাভ দেখার অনুমতি নেই। এটি শুধুমাত্র মালিক দেখতে পারবেন।`);
          speakAnnouncement('কর্মচারী মোডে লাভ দেখার অনুমতি নেই। এটি শুধুমাত্র মালিকের জন্য।', undefined, true);
          if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
          autoDismissTimerRef.current = setTimeout(() => {
            setFeedbackType(null);
          }, 4000);
          return;
        }
      }
    }

    setCurrentMode(speakerRole);
    setLastSpoken(query);
    setIsProcessing(true);
    setFeedbackType('processing');

    const roleBadge = speakerRole === 'owner' ? `👑 মালিক মোড` : `👔 কর্মচারী মোড`;
    setFeedbackText(`[${roleBadge}: ${speakerName}] "${query}" প্রসেস হচ্ছে...`);
    triggerHaptic?.('medium');

    try {
      const savedAssistantName = typeof window !== 'undefined'
        ? localStorage.getItem('lbos_assistant_name') || 'সহজহিসাব'
        : 'সহজহিসাব';

      let data: any = null;

      // 1. Try Online API if online
      try {
        const res = await fetch('/api/voice-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: effectiveTenantId,
            text: query,
            assistantName: savedAssistantName,
            speakerRole,
            speakerName
          })
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.log('[useVoiceAgent] Running offline AI command engine...');
      }

      // 2. Offline AI Shop Command Engine Fallback
      if (!data || !data.success) {
        data = executeOfflineAiShopCommand(
          effectiveTenantId,
          query,
          savedAssistantName,
          speakerRole,
          speakerName
        );
      }

      setIsProcessing(false);

      if (data && data.success) {
        playSuccessChime();
        triggerHaptic?.('success');
        setFeedbackType('success');

        const modePrefix = speakerRole === 'owner' ? '👑 [মালিক] ' : '👔 [কর্মচারী] ';
        setFeedbackText(modePrefix + (data.speech || 'কাজ সম্পন্ন হয়েছে।') + (data.isOffline ? ' (🟢 অফলাইন)' : ''));

        // Broadcast success events
        window.dispatchEvent(new CustomEvent('voice-action-success', { detail: data }));
        if (data.action === 'trigger_add_stock') {
          window.dispatchEvent(new CustomEvent('voice-trigger-add-stock', { detail: data }));
        }

        // Voice output
        if (data.speech) {
          speakAnnouncement(data.speech, undefined, true);
        }

        // Navigation
        if (data.navigateTo && pathname !== data.navigateTo) {
          router.push(data.navigateTo);
        }

        // Print trigger
        if (data.action === 'trigger_print') {
          window.dispatchEvent(new CustomEvent('voice-trigger-print'));
          setTimeout(() => window.print(), 600);
        }

        options.onSuccess?.(data);

        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 4500);
      } else {
        playWarningSound();
        setFeedbackType('error');
        setFeedbackText(data?.reply || data?.speech || 'কমান্ড বুঝতে সমস্যা হয়েছে। আবার বলুন।');

        if (data?.speech) {
          speakAnnouncement(data.speech, undefined, true);
        }

        options.onError?.(data);

        if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = setTimeout(() => {
          setFeedbackType(null);
        }, 4000);
      }
    } catch (err) {
      setIsProcessing(false);
      playWarningSound();
      setFeedbackType('error');
      setFeedbackText('সহকারী চালাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = setTimeout(() => {
        setFeedbackType(null);
      }, 3500);
    }
  }, [
    effectiveTenantId,
    liveTranscript,
    pathname,
    router,
    speakAnnouncement,
    stopListeningOnly,
    triggerHaptic,
    options
  ]);

  /**
   * Spawn Fresh SpeechRecognition Instance
   */
  const spawnRecognitionInstance = useCallback(() => {
    if (!isListeningRef.current || isProcessing) return;

    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SpeechRecognition) return;

    // Clean up previous recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = true; // Continuous listening: don't abort on 1-second pause
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (isListeningRef.current) {
          setIsListening(true);
        }
      };

      recognition.onresult = (event: any) => {
        const { fullTranscript, isFinal } = extractTranscriptFromEvent(event);
        if (!fullTranscript) return;

        // Feed biometric analyzer with active voice ping
        pingVoiceVerification(effectiveTenantId);

        resetInactivityWatchdog();
        latestTranscriptRef.current = fullTranscript;
        setLiveTranscript(fullTranscript);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const waitMs = isFinal ? 400 : 850;
        silenceTimerRef.current = setTimeout(() => {
          if (latestTranscriptRef.current.trim()) {
            executeCommand(latestTranscriptRef.current.trim());
          }
        }, waitMs);
      };

      recognition.onerror = (err: any) => {
        console.warn('[useVoiceAgent] Recognition error:', err?.error);

        if (err?.error === 'no-speech') {
          // Normal pause in conversation - do not crash or freeze
          return;
        }

        if (err?.error === 'not-allowed') {
          setFeedbackType('error');
          setFeedbackText('মাইক্রোফোন পারমিশন বন্ধ আছে। ব্রাউজার সেটিংসে অনুমতি দিন।');
          stopListeningOnly();
          return;
        }

        if (err?.error === 'audio-capture') {
          setFeedbackType('error');
          setFeedbackText('মাইক্রোফোন সংযোগ পাওয়া যায়নি। অন্য অ্যাপের মাইক বন্ধ করুন।');
          stopListeningOnly();
          return;
        }

        if (err?.error === 'network') {
          if (latestTranscriptRef.current.trim()) {
            executeCommand(latestTranscriptRef.current.trim());
            return;
          }
          setFeedbackType('error');
          setFeedbackText('ভয়েস নেটওয়ার্ক ড্রপ করেছে। আবার বলুন বা লিখে জানান।');
          return;
        }
      };

      recognition.onend = () => {
        // If we received words, execute immediately on end!
        if (latestTranscriptRef.current.trim()) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          executeCommand(latestTranscriptRef.current.trim());
          return;
        }

        // If user is still listening (e.g. mobile Chrome auto-stopped before user began talking),
        // seamlessly restart recognition so it doesn't give up after 1-2 seconds of quietness!
        if (isListeningRef.current && !isProcessing) {
          restartCounterRef.current += 1;
          if (restartResetTimerRef.current) clearTimeout(restartResetTimerRef.current);
          restartResetTimerRef.current = setTimeout(() => {
            restartCounterRef.current = 0;
          }, 4500);

          if (restartCounterRef.current > 6) {
            stopListeningOnly();
            setFeedbackType('error');
            setFeedbackText('কোনো কথা শোনা যায়নি। আবার মুখে বলুন।');
            if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
            autoDismissTimerRef.current = setTimeout(() => {
              setFeedbackType(null);
            }, 2500);
            return;
          }

          // Respawn a clean instance after brief delay to avoid InvalidStateError
          setTimeout(() => {
            if (isListeningRef.current && !isProcessing) {
              spawnRecognitionRef.current?.();
            }
          }, 60);
        }
      };

      recognitionRef.current = recognition;
      spawnRecognitionRef.current = spawnRecognitionInstance;
      recognition.start();
    } catch (err) {
      console.warn('[useVoiceAgent] Start error:', err);
      stopListeningOnly();
      setFeedbackType('error');
      setFeedbackText('মাইক চালু করা যায়নি। আবার চেষ্টা করুন।');
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = setTimeout(() => {
        setFeedbackType(null);
      }, 2500);
    }
  }, [
    effectiveTenantId,
    executeCommand,
    isProcessing,
    resetInactivityWatchdog,
    stopListeningOnly
  ]);

  /**
   * Start Listening Flow
   */
  const startListening = useCallback(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (!SpeechRecognition) {
      setFeedbackType('error');
      setFeedbackText('আপনার ব্রাউজারে বাংলা ভয়েস সাপোর্ট নেই। Google Chrome ব্যবহার করুন।');
      return;
    }

    // Stop any active Web Audio stream to ensure SpeechRecognition has exclusive mic
    stopBiometricMonitoring();

    // Cancel active TTS output to avoid echo
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      (window as any).__IS_TTS_SPEAKING__ = false;
      (window as any).__LAST_TTS_TEXT__ = '';
    }

    triggerHaptic?.('medium');
    playMicStartSound();

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (restartResetTimerRef.current) clearTimeout(restartResetTimerRef.current);

    latestTranscriptRef.current = '';
    restartCounterRef.current = 0;
    setLiveTranscript('');
    setFeedbackType('listening');
    setFeedbackText('');
    isListeningRef.current = true;
    setIsListening(true);
    setIsProcessing(false);

    resetInactivityWatchdog();
    spawnRecognitionInstance();
  }, [resetInactivityWatchdog, spawnRecognitionInstance, triggerHaptic]);

  return {
    isListening,
    isProcessing,
    liveTranscript,
    lastSpoken,
    feedbackText,
    feedbackType,
    activeSpeaker,
    currentMode,
    isSupported,
    isSpeakerLockActive,
    startListening,
    stopListening: stopListeningOnly,
    cancelVoice,
    executeCommand,
    setFeedbackType,
    setFeedbackText
  };
}
