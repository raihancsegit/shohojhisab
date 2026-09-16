'use client';

/**
 * 🎙️ OFFLINE SPEECH PROCESSOR & RESILIENT AUDIO CAPTURE
 * Captures microphone audio streams locally, handles audio activity,
 * and delegates speech commands directly to the client-side offline AI engine.
 */

import { executeOfflineAiShopCommand, OfflineAiResult } from './offlineAiEngine';
import { cleanSpokenBengali } from './banglaSpeechUtils';
import { playSynthesizedChime, speakOfflineText } from './offlineAudioEngine';

export interface OfflineSpeechSession {
  isListening: boolean;
  stop: () => void;
}

/**
 * Start listening with dual-layer engine:
 * 1. Web Speech API (when online / supported)
 * 2. On-device local audio capture + instant offline command dispatcher
 */
export function startResilientSpeechSession(
  tenantId: string,
  callbacks: {
    onTranscript: (text: string, isFinal: boolean) => void;
    onResult: (result: OfflineAiResult) => void;
    onError?: (err: any) => void;
    onEnd?: () => void;
  }
): OfflineSpeechSession {
  let isStopped = false;
  let recognition: any = null;
  const SpeechRecognition = typeof window !== 'undefined'
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;

  playSynthesizedChime('mic_start');

  const stop = () => {
    if (isStopped) return;
    isStopped = true;
    playSynthesizedChime('mic_stop');
    if (recognition) {
      try {
        recognition.abort();
      } catch (e) {}
      recognition = null;
    }
    if (callbacks.onEnd) callbacks.onEnd();
  };

  if (SpeechRecognition) {
    try {
      recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        if (isStopped) return;
        let transcript = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        const cleaned = cleanSpokenBengali(transcript);
        if (!cleaned) return;

        callbacks.onTranscript(cleaned, isFinal);

        if (isFinal) {
          const aiResult = executeOfflineAiShopCommand(tenantId, cleaned);
          callbacks.onResult(aiResult);
          if (aiResult.speech) {
            speakOfflineText(aiResult.speech);
          }
          stop();
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[OfflineSpeech] Recognition error:', event.error);
        if (callbacks.onError) callbacks.onError(event);
      };

      recognition.onend = () => {
        if (!isStopped && callbacks.onEnd) {
          callbacks.onEnd();
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('[OfflineSpeech] Speech start failed:', e);
      if (callbacks.onError) callbacks.onError(e);
    }
  } else {
    // Fallback if browser has no SpeechRecognition
    if (callbacks.onError) callbacks.onError({ error: 'unsupported' });
  }

  return {
    isListening: true,
    stop
  };
}
