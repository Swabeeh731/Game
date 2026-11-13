export type Gear = 'P' | 'R' | 'N' | 'D';

export type CameraMode = 'chase' | 'cockpit' | 'topdown' | 'free';

export type ReplayCameraMode = 'broadcast' | 'orbit' | 'wheel' | 'bay' | 'hood' | 'overhead';

export interface ReplayFrame {
  time: number;
  x: number;
  z: number;
  heading: number;
  steerAngle: number;
  wheelSpin: number;
  speed: number;
  gear: Gear;
  isBraking: boolean;
  isReverse: boolean;
}

export interface VehicleConfig {
  id: string;
  name: string;
  type: string;
  tagline: string;
  color: string;
  accentColor: string;
  rimColor: string;
  length: number;
  width: number;
  height: number;
  wheelBase: number;
  trackWidth: number;
  maxSpeed: number; // m/s
  reverseSpeed: number;
  acceleration: number;
  braking: number;
  maxSteerAngle: number; // radians
  handling: number; // 1-5 rating
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
}

export interface ParkingSlot {
  id: string;
  x: number;
  z: number;
  width: number;
  length: number;
  rotation: number; // yaw in radians
  bayNumber: string;
  type: 'standard' | 'parallel' | 'angled' | 'vip';
}

export interface Obstacle {
  id: string;
  type: 'curb' | 'cone' | 'car' | 'barrier' | 'pillar' | 'wall' | 'wheelstop' | 'tree' | 'lamp';
  x: number;
  z: number;
  width: number;
  length: number;
  height: number;
  rotation: number;
  color?: string;
  carModel?: string;
}

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  type: 'Bay' | 'Reverse' | 'Parallel' | 'Slalom' | 'Rooftop' | 'VIP';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  description: string;
  advice: string;
  timeLimit: number; // seconds
  maxCollisions: number;
  startPos: [number, number, number]; // x, y, z
  startRot: number; // yaw in radians
  targetSlot: ParkingSlot;
  obstacles: Obstacle[];
  environment: {
    groundSize: [number, number];
    skyTime: 'sunset' | 'night' | 'day';
    ambientIntensity: number;
    sunIntensity: number;
    fogDensity: number;
  };
}

export interface ParkingAssessment {
  inZone: boolean;
  positionScore: number; // 0 to 100
  angleScore: number; // 0 to 100
  angleErrorDeg: number;
  depthScore: number; // 0 to 100
  overallScore: number; // 0 to 100
  isStable: boolean;
  holdTime: number; // seconds held stationary in target zone
  holdRequired: number; // e.g. 1.5s
  isPerfect: boolean;
}

export interface SensorReading {
  frontMin: number; // meters
  rearMin: number;
  leftMin: number;
  rightMin: number;
  closestSector: 'front' | 'rear' | 'left' | 'right' | 'none';
  minDistance: number;
}

export interface GameStats {
  levelId: number;
  stars: number;
  score: number;
  timeElapsed: number;
  collisions: number;
  precisionPct: number;
  angleError: number;
}

export interface DailyChallengeConfig {
  dateKey: string; // YYYY-MM-DD (UTC)
  title: string;
  tagline: string;
  baseLevel: LevelConfig;
  effectiveLevel: LevelConfig; // LevelConfig with daily constraints applied (timeLimit, maxCollisions, etc.)
  forcedVehicle: VehicleConfig;
  forcedCamera: CameraMode | null;
  constraints: string[]; // Human-readable constraint labels
}

