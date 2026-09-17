'use client';
import { playMicStartSound, playSuccessChime, playWarningSound } from './audioFeedbackUtils';

/**
 * Counter AMOLED Black Sleep & Hands-Free Wake-Word Manager
 * Allows phones to sit on the retail counter with screen pitch-black (0% AMOLED battery drain)
 * while continuously listening for wake-words or direct sales commands with TV/noise rejection.
 */

export interface CounterSleepState {
  isEnabled: boolean;
  isAsleep: boolean;
  isListening: boolean;
  lastSpokenText: string;
  lastResponseText: string;
  hasWakeLock: boolean;
}

const WAKE_WORDS = [
  'সহজ হিসাব',
  'সহজহিসাব',
  'হিসাব ভাই',
  'হিসাবভাই',
  'হ্যালো হিসাব',
  'শোনো হিসাব',
  'সহজ ভাই'
];

class CounterSleepManager {
  private wakeLockSentinel: any = null;
  private isEnabled: boolean = false;
  private isAsleep: boolean = false;
  private isListening: boolean = false;
  private idleTimer: any = null;
  private idleTimeoutMs: number = 12000; // 12 seconds idle before turning pitch black
  private lastSpokenText: string = '';
  private lastResponseText: string = '';
  private listeners: Set<(state: CounterSleepState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-acquire wake lock if tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (this.isEnabled && document.visibilityState === 'visible') {
          this.acquireWakeLock();
        }
      });
    }
  }

  public getState(): CounterSleepState {
    return {
      isEnabled: this.isEnabled,
      isAsleep: this.isAsleep,
      isListening: this.isListening,
      lastSpokenText: this.lastSpokenText,
      lastResponseText: this.lastResponseText,
      hasWakeLock: !!this.wakeLockSentinel
    };
  }

  public subscribe(callback: (state: CounterSleepState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(cb => {
      try { cb(state); } catch (e) {}
    });
  }

  /**
   * Acquire browser screen wake lock so the phone hardware doesn't lock/turn off OS display
   */
  public async acquireWakeLock(): Promise<boolean> {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return false;
    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      this.wakeLockSentinel.addEventListener('release', () => {
        this.wakeLockSentinel = null;
        this.notify();
      });
      this.notify();
      return true;
    } catch (err) {
      console.warn('[CounterSleep] Could not acquire WakeLock:', err);
      return false;
    }
  }

  public releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (e) {}
      this.wakeLockSentinel = null;
    }
    this.notify();
  }

  /**
   * Enable Counter Standby Mode
   */
  public async enable(): Promise<boolean> {
    this.isEnabled = true;
    await this.acquireWakeLock();
    this.resetIdleTimer();
    this.notify();
    return true;
  }

  /**
   * Disable Counter Standby Mode
   */
  public disable() {
    this.isEnabled = false;
    this.isAsleep = false;
    this.clearIdleTimer();
    this.releaseWakeLock();
    this.notify();
  }

  /**
   * Wake up from Black Screen
   */
  public wakeUp(reasonText?: string) {
    if (reasonText) {
      this.lastSpokenText = reasonText;
    }
    const wasAsleep = this.isAsleep;
    this.isAsleep = false;
    this.resetIdleTimer();
    this.notify();

    if (wasAsleep) {
      playMicStartSound();
    }
  }

  /**
   * Transition screen into AMOLED pure black sleep
   */
  public sleepNow() {
    if (!this.isEnabled) return;
    this.isAsleep = true;
    this.clearIdleTimer();
    this.notify();
  }

  public resetIdleTimer() {
    this.clearIdleTimer();
    if (!this.isEnabled) return;

    this.idleTimer = setTimeout(() => {
      this.sleepNow();
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Check if text contains a wake word, and extract remaining command if present
   */
  public extractWakeWord(text: string): { isWake: boolean; command: string } {
    if (!text) return { isWake: false, command: '' };
    const clean = text.trim();

    for (const w of WAKE_WORDS) {
      if (clean.includes(w)) {
        // Strip the wake word out
        const remaining = clean.replace(new RegExp(w, 'gi'), '').trim();
        return { isWake: true, command: remaining };
      }
    }

    return { isWake: false, command: clean };
  }

  /**
   * Bengali Two-Way Spoken Speech Output (TTS Soundbox)
   */
  public async speakBengali(text: string): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    this.lastResponseText = text;
    this.notify();

    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();

        // Mark global TTS active flag to prevent microphone echo loop
        (window as any).__IS_TTS_SPEAKING__ = true;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'bn-BD';
        utterance.rate = 1.05; // Slightly brisk, natural retail cadence
        utterance.pitch = 1.0;

        // Try to pick Bengali voice if browser installed
        const voices = window.speechSynthesis.getVoices();
        const bnVoice = voices.find(v => v.lang.startsWith('bn') || v.name.includes('Bangla') || v.name.includes('Bengali'));
        if (bnVoice) {
          utterance.voice = bnVoice;
        }

        utterance.onend = () => {
          setTimeout(() => {
            (window as any).__IS_TTS_SPEAKING__ = false;
            resolve();
          }, 350);
        };

        utterance.onerror = () => {
          (window as any).__IS_TTS_SPEAKING__ = false;
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        (window as any).__IS_TTS_SPEAKING__ = false;
        resolve();
      }
    });
  }
}

export const counterSleepManager = new CounterSleepManager();
