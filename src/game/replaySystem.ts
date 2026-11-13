import { ReplayFrame, ReplayCameraMode, Gear } from '../types/game';

/**
 * Replay Recording Engine
 * Captures vehicle state frames during the parking attempt.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private lastRecordedTime: number = -1;
  private minInterval: number = 0.03; // Record up to ~33 fps for memory efficiency and ultra-smooth interpolation

  public start() {
    this.frames = [];
    this.lastRecordedTime = -1;
  }

  public recordFrame(
    time: number,
    x: number,
    z: number,
    heading: number,
    steerAngle: number,
    wheelSpin: number,
    speed: number,
    gear: Gear,
    isBraking: boolean,
    isReverse: boolean
  ) {
    if (this.lastRecordedTime >= 0 && time - this.lastRecordedTime < this.minInterval) {
      return;
    }

    this.lastRecordedTime = time;
    this.frames.push({
      time,
      x,
      z,
      heading,
      steerAngle,
      wheelSpin,
      speed,
      gear,
      isBraking,
      isReverse,
    });
  }

  public getFrames(): ReplayFrame[] {
    return this.frames;
  }

  public getDuration(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].time;
  }
}

/**
 * Replay Player Engine
 * Performs time interpolation and multi-angle cinematic tracking.
 */
export class ReplayPlayer {
  public frames: ReplayFrame[] = [];
  public currentTime: number = 0;
  public duration: number = 0;
  public isPlaying: boolean = true;
  public speedMultiplier: number = 1.0;
  public cameraMode: ReplayCameraMode = 'broadcast';

  constructor(frames: ReplayFrame[]) {
    this.loadFrames(frames);
  }

  public loadFrames(frames: ReplayFrame[]) {
    this.frames = frames;
    this.duration = frames.length > 0 ? frames[frames.length - 1].time : 0;
    this.currentTime = 0;
    this.isPlaying = true;
  }

  public update(dt: number): ReplayFrame | null {
    if (this.frames.length === 0) return null;

    if (this.isPlaying) {
      this.currentTime += dt * this.speedMultiplier;
      if (this.currentTime >= this.duration) {
        this.currentTime = this.duration;
        this.isPlaying = false;
      }
    }

    return this.getFrameAtTime(this.currentTime);
  }

  public seek(targetTime: number) {
    this.currentTime = Math.max(0, Math.min(this.duration, targetTime));
  }

  public togglePlay() {
    if (!this.isPlaying && this.currentTime >= this.duration) {
      this.currentTime = 0;
    }
    this.isPlaying = !this.isPlaying;
  }

  public restart() {
    this.currentTime = 0;
    this.isPlaying = true;
  }

  public setSpeed(mult: number) {
    this.speedMultiplier = mult;
  }

  public setCameraMode(mode: ReplayCameraMode) {
    this.cameraMode = mode;
  }

  /**
   * Sample frame with Hermite / linear interpolation between adjacent samples
   */
  public getFrameAtTime(t: number): ReplayFrame {
    if (this.frames.length === 0) {
      return {
        time: 0,
        x: 0,
        z: 0,
        heading: 0,
        steerAngle: 0,
        wheelSpin: 0,
        speed: 0,
        gear: 'D',
        isBraking: false,
        isReverse: false,
      };
    }

    if (t <= this.frames[0].time) return this.frames[0];
    if (t >= this.duration) return this.frames[this.frames.length - 1];

    // Binary search for surrounding frame indices
    let low = 0;
    let high = this.frames.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.frames[mid].time <= t) {
        if (mid === this.frames.length - 1 || this.frames[mid + 1].time > t) {
          const f0 = this.frames[mid];
          const f1 = this.frames[mid + 1] || f0;
          const segmentDur = Math.max(0.0001, f1.time - f0.time);
          const alpha = (t - f0.time) / segmentDur;

          // Shortest angle difference for yaw
          let dHeading = (f1.heading - f0.heading) % (Math.PI * 2);
          if (dHeading > Math.PI) dHeading -= Math.PI * 2;
          if (dHeading < -Math.PI) dHeading += Math.PI * 2;

          return {
            time: t,
            x: f0.x + (f1.x - f0.x) * alpha,
            z: f0.z + (f1.z - f0.z) * alpha,
            heading: f0.heading + dHeading * alpha,
            steerAngle: f0.steerAngle + (f1.steerAngle - f0.steerAngle) * alpha,
            wheelSpin: f0.wheelSpin + (f1.wheelSpin - f0.wheelSpin) * alpha,
            speed: f0.speed + (f1.speed - f0.speed) * alpha,
            gear: alpha > 0.5 ? f1.gear : f0.gear,
            isBraking: alpha > 0.5 ? f1.isBraking : f0.isBraking,
            isReverse: alpha > 0.5 ? f1.isReverse : f0.isReverse,
          };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return this.frames[this.frames.length - 1];
  }
}
