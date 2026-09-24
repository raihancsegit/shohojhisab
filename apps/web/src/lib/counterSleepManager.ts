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
  private noSleepVideo: HTMLVideoElement | null = null;
  private isEnabled: boolean = false;
  private isAsleep: boolean = false;
  private isListening: boolean = false;
  private idleTimer: any = null;
  private idleTimeoutMs: number = 4000; // 4 seconds idle before turning pitch black
  private lastSpokenText: string = '';
  private lastResponseText: string = '';
  private listeners: Set<(state: CounterSleepState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-acquire wake lock if tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (this.isEnabled && document.visibilityState === 'visible') {
          this.acquireWakeLock();
          this.startNoSleepVideo();
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
      hasWakeLock: !!this.wakeLockSentinel || !!this.noSleepVideo
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
    if (typeof window === 'undefined') return false;
    let wakeLockSuccess = false;

    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
          this.notify();
        });
        wakeLockSuccess = true;
      } catch (err) {
        console.warn('[CounterSleep] Could not acquire native WakeLock:', err);
      }
    }

    // Always reinforce with silent video keepalive for 100% reliability on Android & iOS
    this.startNoSleepVideo();
    this.notify();
    return wakeLockSuccess;
  }

  /**
   * Plays a silent invisible 1-pixel canvas video stream to prevent mobile phone OS from sleeping
   */
  private startNoSleepVideo() {
    if (typeof window === 'undefined') return;
    if (this.noSleepVideo) return; // already active

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1, 1);
      }

      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(1) : null;
      if (stream) {
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        video.loop = true;
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0.001';
        video.style.pointerEvents = 'none';
        video.srcObject = stream;
        document.body.appendChild(video);
        video.play().catch(() => {});
        this.noSleepVideo = video;
      }
    } catch (e) {
      console.warn('[CounterSleep] NoSleep video fallback unavailable:', e);
    }
  }

  private stopNoSleepVideo() {
    if (this.noSleepVideo) {
      try {
        this.noSleepVideo.pause();
        if (this.noSleepVideo.parentNode) {
          this.noSleepVideo.parentNode.removeChild(this.noSleepVideo);
        }
      } catch (e) {}
      this.noSleepVideo = null;
    }
  }

  public releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (e) {}
      this.wakeLockSentinel = null;
    }
    this.stopNoSleepVideo();
    this.notify();
  }

  /**
   * Enable Counter Standby Mode (instantly or after idle)
   */
  public async enable(instant: boolean = false): Promise<boolean> {
    this.isEnabled = true;
    await this.acquireWakeLock();

    // Request fullscreen to hide browser navigation bar (giving a 100% black switch-off appearance)
    try {
      if (typeof document !== 'undefined') {
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else if ((document.documentElement as any).webkitRequestFullscreen) {
            (document.documentElement as any).webkitRequestFullscreen();
          }
        }
      }
    } catch (e) {}

    if (instant) {
      this.sleepNow();
    } else {
      this.resetIdleTimer();
    }
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

    // Exit fullscreen
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch (e) {}

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

    // Haptic vibration feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch (e) {}
    }

    if (wasAsleep) {
      playMicStartSound();
      this.speakBengali('সহজ হিসাব সক্রিয়');
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

    // Additional generic wake words
    const genericWakeWords = ['হ্যালো', 'হ্যালোভাই', 'শুনছেন', 'দোকান', 'সহজ'];
    for (const gw of genericWakeWords) {
      if (clean.startsWith(gw)) {
        const remaining = clean.replace(new RegExp('^' + gw, 'i'), '').trim();
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

    // Play chime first
    playSuccessChime();

    return new Promise((resolve) => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        // Mark global TTS active flag to prevent microphone echo loop
        (window as any).__IS_TTS_SPEAKING__ = true;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'bn-BD';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to pick Bengali voice or fallback to Indian/system voice
        const voices = window.speechSynthesis.getVoices();
        const bnVoice = voices.find(v => v.lang.startsWith('bn') || v.name.includes('Bangla') || v.name.includes('Bengali'));
        if (bnVoice) {
          utterance.voice = bnVoice;
          utterance.lang = bnVoice.lang;
        } else {
          const inVoice = voices.find(v => v.lang.includes('IN') || v.lang.includes('hi') || v.name.includes('India'));
          if (inVoice) {
            utterance.voice = inVoice;
            utterance.lang = inVoice.lang;
          } else if (voices.length > 0) {
            const defVoice = voices.find(v => v.default) || voices[0];
            if (defVoice) {
              utterance.voice = defVoice;
              utterance.lang = defVoice.lang;
            }
          }
        }

        // Prevent GC bug
        (window as any).__SLEEP_TTS_UTTERANCE__ = utterance;

        utterance.onend = () => {
          setTimeout(() => {
            (window as any).__IS_TTS_SPEAKING__ = false;
            (window as any).__SLEEP_TTS_UTTERANCE__ = null;
            resolve();
          }, 350);
        };

        utterance.onerror = () => {
          (window as any).__IS_TTS_SPEAKING__ = false;
          (window as any).__SLEEP_TTS_UTTERANCE__ = null;
          resolve();
        };

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        (window as any).__IS_TTS_SPEAKING__ = false;
        resolve();
      }
    });
  }
}

export const counterSleepManager = new CounterSleepManager();
