import { CameraMode, DailyChallengeConfig, LevelConfig } from '../types/game';
import { LEVELS } from './levels';
import { VEHICLES } from './vehicles';

/**
 * Deterministic string hash (FNV-1a 32-bit) + Mulberry32 PRNG
 * Guarantees identical daily challenge configuration globally for a given UTC date.
 */
function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeUntilNextDailyReset(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  const diffMs = Math.max(0, nextMidnight - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { hours, minutes, seconds, formatted };
}

interface DailyPresetModifier {
  namePrefix: string;
  tagline: string;
  timeMultiplier: number;
  maxCollisionsOverride: number;
  forcedCamera: CameraMode | null;
}

const DAILY_MODIFIERS: DailyPresetModifier[] = [
  {
    namePrefix: 'Zero-Tolerance',
    tagline: 'One scratch disqualifies the run under a tightened clock.',
    timeMultiplier: 0.72,
    maxCollisionsOverride: 1,
    forcedCamera: null,
  },
  {
    namePrefix: 'Cockpit Pro',
    tagline: 'Driver hood camera locked — rely strictly on mirrors and sonar!',
    timeMultiplier: 0.8,
    maxCollisionsOverride: 2,
    forcedCamera: 'cockpit',
  },
  {
    namePrefix: 'Blitz Valet',
    tagline: 'Extreme time crunch. Smooth steering and brisk entry required.',
    timeMultiplier: 0.58,
    maxCollisionsOverride: 2,
    forcedCamera: null,
  },
  {
    namePrefix: 'Overhead Precision',
    tagline: '90° Bird-Eye perspective locked for surgical line alignment.',
    timeMultiplier: 0.75,
    maxCollisionsOverride: 1,
    forcedCamera: 'topdown',
  },
];

export function getDailyChallenge(dateKey: string = getTodayDateKey()): DailyChallengeConfig {
  const seed = hashDateKey(`daily-valet-${dateKey}`);
  const rand = createSeededRandom(seed);

  const levelIdx = Math.floor(rand() * LEVELS.length);
  const vehicleIdx = Math.floor(rand() * VEHICLES.length);
  const modifierIdx = Math.floor(rand() * DAILY_MODIFIERS.length);

  const baseLevel = LEVELS[levelIdx];
  const forcedVehicle = VEHICLES[vehicleIdx];
  const modifier = DAILY_MODIFIERS[modifierIdx];

  // Ensure timeLimit is challenging yet fair (minimum 35s)
  const constrainedTimeLimit = Math.max(35, Math.round((baseLevel.timeLimit * modifier.timeMultiplier) / 5) * 5);
  const constrainedMaxCollisions = Math.min(baseLevel.maxCollisions, modifier.maxCollisionsOverride);

  const constraints: string[] = [
    `Vehicle: ${forcedVehicle.name}`,
    `Time Limit: ${constrainedTimeLimit}s`,
    constrainedMaxCollisions === 1 ? 'Zero-Scratch (1 Strike Limit)' : `Max Strikes: ${constrainedMaxCollisions}`,
  ];

  if (modifier.forcedCamera === 'cockpit') {
    constraints.push('Camera Locked: Hood View');
  } else if (modifier.forcedCamera === 'topdown') {
    constraints.push('Camera Locked: 90° Bird-Eye');
  }

  const effectiveLevel: LevelConfig = {
    ...baseLevel,
    title: `${modifier.namePrefix}: ${baseLevel.title}`,
    subtitle: `Daily Challenge (${dateKey}) · ${baseLevel.subtitle}`,
    timeLimit: constrainedTimeLimit,
    maxCollisions: constrainedMaxCollisions,
  };

  return {
    dateKey,
    title: `${modifier.namePrefix} ${baseLevel.type}`,
    tagline: modifier.tagline,
    baseLevel,
    effectiveLevel,
    forcedVehicle,
    forcedCamera: modifier.forcedCamera,
    constraints,
  };
}
