/**
 * Procedural Web Audio Engine for Precision Parking 3D Simulator
 * 100% procedural Web Audio oscillators, filters and noise buffers (zero external file dependencies).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Proximity sensor sound
  private lastSonarBeepTime: number = 0;
  private isReverseBeeping: boolean = false;

  // Noise buffer for tire squeal & crashes
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  public init() {
    if (this.isInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create white noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.setupEngineSound();
      this.isInitialized = true;
    } catch {
      // AudioContext not supported or restricted
    }
  }

  private setupEngineSound() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Osc 1: Sub rumble
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Osc 2: Cylinder combustion harmonics
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  public updateEngine(speedNormalized: number, throttle: number, isMoving: boolean) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const absSpeed = Math.abs(speedNormalized);
    const rpmFactor = Math.max(absSpeed, throttle * 0.7);

    // Dynamic pitch: 40Hz idle up to 180Hz high rev
    const baseFreq = 42 + rpmFactor * 110;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.05, t, 0.08);

    // Dynamic filter: opens up as throttle is applied
    const cutoff = 200 + rpmFactor * 750 + (throttle > 0.1 ? 300 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.08);

    // Volume rises slightly when driving
    const targetVol = isMoving ? 0.12 + rpmFactor * 0.08 : 0.06;
    this.engineGain.gain.setTargetAtTime(targetVol, t, 0.1);
  }

  /**
   * Proximity Radar Sonar Beep
   * Realistic ultrasonic parking sensor. Beeps pulse faster as obstacle approaches.
   * If distance < 0.3m, becomes a continuous solid warning tone!
   */
  public updateParkingSonar(distance: number, inReverse: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    if (distance > 3.0 || distance <= 0) {
      this.isReverseBeeping = false;
      return;
    }

    const now = performance.now();
    // interval in ms: 3m -> 650ms, 1.5m -> 320ms, 0.5m -> 120ms, <0.3m -> solid continuous
    const isSolid = distance < 0.32;
    const interval = isSolid ? 40 : Math.max(80, (distance - 0.3) * 230 + 70);

    if (now - this.lastSonarBeepTime > interval) {
      this.lastSonarBeepTime = now;
      this.playSonarBlip(distance, isSolid);
    }
  }

  private playSonarBlip(distance: number, isSolid: boolean) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High clear parking sensor frequency ~ 1800-2200 Hz
    const freq = distance < 0.6 ? 2200 : 1850;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const dur = isSolid ? 0.08 : 0.045;
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  /**
   * Collision impact sound: metallic thud + scrape
   */
  public playCollisionSound(intensity: number = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const clampedInt = Math.min(Math.max(intensity, 0.3), 1.5);

    // 1. Low frequency sub thud
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * clampedInt, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.18);

    oscGain.gain.setValueAtTime(0.3 * clampedInt, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);

    // 2. Crunch / scrape noise
    if (this.noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(900, t);
      noiseFilter.Q.setValueAtTime(1.8, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25 * clampedInt, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSource.start(t);
      noiseSource.stop(t + 0.2);
    }
  }

  /**
   * Tire squeal / brake screech
   */
  public playTireSqueal(slipRatio: number) {
    if (!this.ctx || !this.masterGain || this.isMuted || !this.noiseBuffer) return;
    if (slipRatio < 0.4) return;

    const t = this.ctx.currentTime;
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100 + Math.random() * 200, t);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.12, (slipRatio - 0.4) * 0.2);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(t);
    noiseSource.stop(t + 0.15);
  }

  /**
   * Gear shift mechanical click
   */
  public playGearShift() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.04);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /**
   * Level success victory chime
   */
  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = this.ctx!.currentTime + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /**
   * Level failed buzzer
   */
  public playFailBuzzer() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.setValueAtTime(110, t + 0.15);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.4, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const soundEngine = new SoundEngine();
