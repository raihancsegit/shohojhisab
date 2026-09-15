/**
 * Near-Field Acoustic Proximity Distance Gate
 * Rejects ambient crowd chatter, distant customers, and TV noise in busy retail shops.
 * Powered by Web Audio API real-time RMS energy measurement with autoGainControl disabled.
 */

export type ProximityDistanceMode = 'near' | 'medium' | 'all';

export interface ProximityState {
  isListening: boolean;
  currentVolume: number; // 0 to 100
  threshold: number; // 0 to 100
  isGateOpen: boolean;
  mode: ProximityDistanceMode;
  lastNearSpeechTime: number;
}

class VoiceProximityManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private listeners: Set<(state: ProximityState) => void> = new Set();

  private mode: ProximityDistanceMode = 'near';
  private currentVolume: number = 0;
  private isGateOpen: boolean = false;
  private lastNearSpeechTime: number = 0;
  private isActive: boolean = false;

  // Calibrated RMS energy thresholds (0 - 100 scale)
  // When speaking 10-30cm from mobile phone mic with AGC disabled, RMS is typically 22-80.
  // Distant chatter (1-3 meters away) or background TV typically registers at 2-12.
  private readonly THRESHOLDS: Record<ProximityDistanceMode, number> = {
    near: 16,     // ১ হাত / ~৩০ সেমি - দোকান ভিড় ও টিভি ফিল্টার (ডিফল্ট)
    medium: 9,    // ২ হাত / ~৬০ সেমি
    all: 0        // ফিল্টার অফ (সব কথা গ্রহণ)
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('lbos_voice_proximity_mode') as ProximityDistanceMode | null;
      if (savedMode && ['near', 'medium', 'all'].includes(savedMode)) {
        this.mode = savedMode;
      }
    }
  }

  public getMode(): ProximityDistanceMode {
    return this.mode;
  }

  public setMode(mode: ProximityDistanceMode) {
    this.mode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lbos_voice_proximity_mode', mode);
    }
    this.notify();
  }

  public getThreshold(): number {
    return this.THRESHOLDS[this.mode];
  }

  public getState(): ProximityState {
    return {
      isListening: this.isActive,
      currentVolume: Math.round(this.currentVolume),
      threshold: this.getThreshold(),
      isGateOpen: this.isGateOpen,
      mode: this.mode,
      lastNearSpeechTime: this.lastNearSpeechTime
    };
  }

  public subscribe(callback: (state: ProximityState) => void): () => void {
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
   * Starts the near-field audio monitor with autoGainControl disabled
   */
  public async start(): Promise<boolean> {
    if (this.isActive) return true;
    if (typeof window === 'undefined') return false;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // CRITICAL: Disable autoGainControl so distant sounds aren't amplified by the microphone hardware!
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.2;
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isActive = true;

      const loop = () => {
        if (!this.isActive || !this.analyser || !this.dataArray) return;

        this.analyser.getByteTimeDomainData(this.dataArray);

        // Compute Root Mean Square (RMS) energy
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          const val = (this.dataArray[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / this.dataArray.length) * 100;
        this.currentVolume = rms;

        const threshold = this.getThreshold();
        const now = Date.now();

        if (rms >= threshold) {
          this.lastNearSpeechTime = now;
          this.isGateOpen = true;
        } else {
          // Gate holds open for 650ms after near speech to catch trailing syllables
          if (now - this.lastNearSpeechTime > 650) {
            this.isGateOpen = false;
          }
        }

        this.notify();
        this.animationFrameId = requestAnimationFrame(loop);
      };

      this.animationFrameId = requestAnimationFrame(loop);
      return true;
    } catch (err) {
      console.warn('[ProximityGate] Could not initialize microphone audio analyser:', err);
      this.isActive = false;
      return false;
    }
  }

  /**
   * Stops the proximity monitor and releases the microphone track
   */
  public stop() {
    this.isActive = false;
    this.isGateOpen = false;
    this.currentVolume = 0;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }

    this.notify();
  }

  /**
   * Evaluates whether speech was spoken at close proximity to the phone
   * Returns true if near speech was detected within the last 1200ms
   */
  public isNearSpeechActive(): boolean {
    if (this.mode === 'all') return true;
    if (!this.isActive) return true; // Fallback if Web Audio was denied
    return (Date.now() - this.lastNearSpeechTime) <= 1200;
  }
}

export const voiceProximityManager = new VoiceProximityManager();
