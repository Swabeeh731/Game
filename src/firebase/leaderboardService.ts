import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth } from './config';
import { DailyChallengeConfig, GameStats, LevelConfig, VehicleConfig } from '../types/game';
import { getDailyChallenge } from '../game/dailyChallenge';

export interface LeaderboardRecord {
  id: string;
  userId: string;
  playerName: string;
  levelId: number;
  score: number;
  stars: number;
  timeSeconds: number;
  precisionPct: number;
  angleError: number;
  collisions: number;
  vehicleId: string;
  vehicleName: string;
  createdAt: string | number;
}

export interface DailyLeaderboardRecord extends LeaderboardRecord {
  dateKey: string;
  challengeTitle: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function isPermissionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied');
}

// Built-in benchmark competitor records to populate fresh standard leaderboards
const DEFAULT_BENCHMARKS: Record<number, LeaderboardRecord[]> = {
  1: [
    {
      id: 'bm_1_1',
      userId: 'bot_apex',
      playerName: 'Marcus Vance',
      levelId: 1,
      score: 99,
      stars: 3,
      timeSeconds: 14.2,
      precisionPct: 98,
      angleError: 0.4,
      collisions: 0,
      vehicleId: 'apex_gt',
      vehicleName: 'Apex GT Sport',
      createdAt: '2026-03-01T12:00:00Z',
    },
    {
      id: 'bm_1_2',
      userId: 'bot_elena',
      playerName: 'Elena Rostova',
      levelId: 1,
      score: 95,
      stars: 3,
      timeSeconds: 16.8,
      precisionPct: 94,
      angleError: 0.9,
      collisions: 0,
      vehicleId: 'vanguard',
      vehicleName: 'Vanguard Prestige',
      createdAt: '2026-03-02T14:30:00Z',
    },
    {
      id: 'bm_1_3',
      userId: 'bot_kenji',
      playerName: 'Kenji Sato',
      levelId: 1,
      score: 91,
      stars: 3,
      timeSeconds: 19.5,
      precisionPct: 90,
      angleError: 1.4,
      collisions: 0,
      vehicleId: 'titan_suv',
      vehicleName: 'Titan Horizon 4x4',
      createdAt: '2026-03-03T09:15:00Z',
    },
  ],
  2: [
    {
      id: 'bm_2_1',
      userId: 'bot_valet_pro',
      playerName: 'Dr. Drift',
      levelId: 2,
      score: 98,
      stars: 3,
      timeSeconds: 22.4,
      precisionPct: 97,
      angleError: 0.6,
      collisions: 0,
      vehicleId: 'apex_gt',
      vehicleName: 'Apex GT Sport',
      createdAt: '2026-03-04T10:00:00Z',
    },
    {
      id: 'bm_2_2',
      userId: 'bot_sarah',
      playerName: 'Sarah Chen',
      levelId: 2,
      score: 93,
      stars: 3,
      timeSeconds: 26.1,
      precisionPct: 92,
      angleError: 1.2,
      collisions: 0,
      vehicleId: 'vanguard',
      vehicleName: 'Vanguard Prestige',
      createdAt: '2026-03-05T11:45:00Z',
    },
  ],
  3: [
    {
      id: 'bm_3_1',
      userId: 'bot_parallel_king',
      playerName: 'Arthur Pendelton',
      levelId: 3,
      score: 97,
      stars: 3,
      timeSeconds: 28.5,
      precisionPct: 96,
      angleError: 0.7,
      collisions: 0,
      vehicleId: 'vanguard',
      vehicleName: 'Vanguard Prestige',
      createdAt: '2026-03-06T15:20:00Z',
    },
    {
      id: 'bm_3_2',
      userId: 'bot_leila',
      playerName: 'Leila Moreau',
      levelId: 3,
      score: 91,
      stars: 3,
      timeSeconds: 34.0,
      precisionPct: 89,
      angleError: 1.5,
      collisions: 0,
      vehicleId: 'titan_suv',
      vehicleName: 'Titan Horizon 4x4',
      createdAt: '2026-03-07T16:00:00Z',
    },
  ],
};

function generateDailyBenchmarks(dateKey: string): DailyLeaderboardRecord[] {
  const daily = getDailyChallenge(dateKey);
  const timeCap = daily.effectiveLevel.timeLimit;
  return [
    {
      id: `bm_daily_${dateKey}_1`,
      userId: 'bot_daily_1',
      playerName: 'Elena Rostova',
      dateKey,
      challengeTitle: daily.title,
      levelId: daily.baseLevel.id,
      score: 98,
      stars: 3,
      timeSeconds: Number((timeCap * 0.42).toFixed(1)),
      precisionPct: 97,
      angleError: 0.5,
      collisions: 0,
      vehicleId: daily.forcedVehicle.id,
      vehicleName: daily.forcedVehicle.name,
      createdAt: `${dateKey}T01:15:00Z`,
    },
    {
      id: `bm_daily_${dateKey}_2`,
      userId: 'bot_daily_2',
      playerName: 'Marcus Vance',
      dateKey,
      challengeTitle: daily.title,
      levelId: daily.baseLevel.id,
      score: 94,
      stars: 3,
      timeSeconds: Number((timeCap * 0.51).toFixed(1)),
      precisionPct: 93,
      angleError: 1.1,
      collisions: 0,
      vehicleId: daily.forcedVehicle.id,
      vehicleName: daily.forcedVehicle.name,
      createdAt: `${dateKey}T02:40:00Z`,
    },
    {
      id: `bm_daily_${dateKey}_3`,
      userId: 'bot_daily_3',
      playerName: 'Kenji Sato',
      dateKey,
      challengeTitle: daily.title,
      levelId: daily.baseLevel.id,
      score: 89,
      stars: 2,
      timeSeconds: Number((timeCap * 0.64).toFixed(1)),
      precisionPct: 88,
      angleError: 1.8,
      collisions: 0,
      vehicleId: daily.forcedVehicle.id,
      vehicleName: daily.forcedVehicle.name,
      createdAt: `${dateKey}T04:10:00Z`,
    },
  ];
}

class LeaderboardService {
  private currentUser: User | null = null;
  private localStoredScores: LeaderboardRecord[] = [];
  private localDailyScores: DailyLeaderboardRecord[] = [];
  private localGuestId: string = 'guest_local';

  constructor() {
    try {
      const cached = localStorage.getItem('precision_parking_scores');
      if (cached) {
        this.localStoredScores = JSON.parse(cached);
      }
      const cachedDaily = localStorage.getItem('precision_parking_daily_scores');
      if (cachedDaily) {
        this.localDailyScores = JSON.parse(cachedDaily);
      }
      let savedGuest = localStorage.getItem('precision_parking_guest_id');
      if (!savedGuest) {
        savedGuest = 'guest_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('precision_parking_guest_id', savedGuest);
      }
      this.localGuestId = savedGuest;
    } catch {
      // Ignore localStorage issues
    }

    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  public async ensureAuth(): Promise<User | null> {
    if (auth.currentUser) {
      this.currentUser = auth.currentUser;
      return auth.currentUser;
    }

    try {
      const cred = await signInAnonymously(auth);
      this.currentUser = cred.user;
      return cred.user;
    } catch {
      return null;
    }
  }

  public async signInWithGoogle(): Promise<User | null> {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      this.currentUser = res.user;
      return res.user;
    } catch (err) {
      console.warn('Google sign-in cancelled or failed:', err);
      return null;
    }
  }

  public getCurrentUser(): User | null {
    return this.currentUser || auth.currentUser;
  }

  public getActiveUserId(): string {
    return this.getCurrentUser()?.uid || this.localGuestId;
  }

  public async submitScore(
    stats: GameStats,
    level: LevelConfig,
    vehicle: VehicleConfig,
    customPlayerName?: string
  ): Promise<{ record: LeaderboardRecord; syncedToCloud: boolean }> {
    const user = await this.ensureAuth();
    const uid = user?.uid || this.localGuestId;

    const playerName =
      customPlayerName?.trim() ||
      user?.displayName ||
      (user?.isAnonymous ? `Driver #${uid.substring(0, 5).toUpperCase()}` : 'Local Driver');

    const cleanId = `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const collectionPath = 'leaderboards';

    const record: LeaderboardRecord = {
      id: cleanId,
      userId: uid,
      playerName: playerName.slice(0, 32),
      levelId: level.id,
      score: Math.min(100, Math.max(0, Math.round(stats.score))),
      stars: Math.min(3, Math.max(1, stats.stars)),
      timeSeconds: Number(Math.max(0.1, stats.timeElapsed).toFixed(1)),
      precisionPct: Math.min(100, Math.max(0, Math.round(stats.precisionPct))),
      angleError: Number(Math.max(0, stats.angleError).toFixed(1)),
      collisions: Math.max(0, stats.collisions),
      vehicleId: vehicle.id.slice(0, 32),
      vehicleName: vehicle.name.slice(0, 48),
      createdAt: new Date().toISOString(),
    };

    // Store in local cache immediately
    this.localStoredScores.unshift(record);
    try {
      localStorage.setItem('precision_parking_scores', JSON.stringify(this.localStoredScores.slice(0, 50)));
    } catch {
      // Ignore
    }

    if (!user) {
      return { record, syncedToCloud: false };
    }

    try {
      const docRef = doc(db, collectionPath, cleanId);
      await setDoc(docRef, {
        id: cleanId,
        userId: uid,
        playerName: record.playerName,
        levelId: record.levelId,
        score: record.score,
        stars: record.stars,
        timeSeconds: record.timeSeconds,
        precisionPct: record.precisionPct,
        angleError: record.angleError,
        collisions: record.collisions,
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        createdAt: serverTimestamp(),
      });
      return { record, syncedToCloud: true };
    } catch (error) {
      if (isPermissionError(error)) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${cleanId}`);
        } catch {
          // Structured error logged by handleFirestoreError; preserve gameplay flow
        }
      } else {
        console.warn('Firestore write failed, stored locally:', error);
      }
      return { record, syncedToCloud: false };
    }
  }

  public async submitDailyScore(
    stats: GameStats,
    daily: DailyChallengeConfig,
    customPlayerName?: string
  ): Promise<{ record: DailyLeaderboardRecord; syncedToCloud: boolean }> {
    const user = await this.ensureAuth();
    const uid = user?.uid || this.localGuestId;

    const playerName =
      customPlayerName?.trim() ||
      user?.displayName ||
      (user?.isAnonymous ? `Driver #${uid.substring(0, 5).toUpperCase()}` : 'Local Driver');

    const cleanId = `daily_${daily.dateKey}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const collectionPath = 'daily_leaderboards';

    const record: DailyLeaderboardRecord = {
      id: cleanId,
      userId: uid,
      playerName: playerName.slice(0, 32),
      dateKey: daily.dateKey,
      challengeTitle: daily.title.slice(0, 64),
      levelId: daily.baseLevel.id,
      score: Math.min(100, Math.max(0, Math.round(stats.score))),
      stars: Math.min(3, Math.max(1, stats.stars)),
      timeSeconds: Number(Math.max(0.1, stats.timeElapsed).toFixed(1)),
      precisionPct: Math.min(100, Math.max(0, Math.round(stats.precisionPct))),
      angleError: Number(Math.max(0, stats.angleError).toFixed(1)),
      collisions: Math.max(0, stats.collisions),
      vehicleId: daily.forcedVehicle.id.slice(0, 32),
      vehicleName: daily.forcedVehicle.name.slice(0, 48),
      createdAt: new Date().toISOString(),
    };

    // Store in local cache immediately
    this.localDailyScores.unshift(record);
    try {
      localStorage.setItem('precision_parking_daily_scores', JSON.stringify(this.localDailyScores.slice(0, 50)));
    } catch {
      // Ignore
    }

    if (!user) {
      return { record, syncedToCloud: false };
    }

    try {
      const docRef = doc(db, collectionPath, cleanId);
      await setDoc(docRef, {
        id: cleanId,
        userId: uid,
        playerName: record.playerName,
        dateKey: record.dateKey,
        challengeTitle: record.challengeTitle,
        levelId: record.levelId,
        score: record.score,
        stars: record.stars,
        timeSeconds: record.timeSeconds,
        precisionPct: record.precisionPct,
        angleError: record.angleError,
        collisions: record.collisions,
        vehicleId: record.vehicleId,
        vehicleName: record.vehicleName,
        createdAt: serverTimestamp(),
      });
      return { record, syncedToCloud: true };
    } catch (error) {
      if (isPermissionError(error)) {
        try {
          handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${cleanId}`);
        } catch {
          // Structured error logged by handleFirestoreError; preserve gameplay flow
        }
      } else {
        console.warn('Firestore daily write failed, stored locally:', error);
      }
      return { record, syncedToCloud: false };
    }
  }

  public async fetchTopScores(levelId: number, limitCount: number = 20): Promise<LeaderboardRecord[]> {
    const collectionPath = 'leaderboards';
    const remoteScores: LeaderboardRecord[] = [];

    try {
      const q = query(
        collection(db, collectionPath),
        where('levelId', '==', levelId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = new Date().toISOString();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          formattedDate = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
          formattedDate = data.createdAt;
        }

        remoteScores.push({
          id: docSnap.id,
          userId: data.userId || 'unknown',
          playerName: data.playerName || 'Anonymous Driver',
          levelId: data.levelId,
          score: data.score,
          stars: data.stars || 1,
          timeSeconds: data.timeSeconds,
          precisionPct: data.precisionPct,
          angleError: data.angleError || 0,
          collisions: data.collisions || 0,
          vehicleId: data.vehicleId || 'apex_gt',
          vehicleName: data.vehicleName || 'Apex GT',
          createdAt: formattedDate,
        });
      });
    } catch (err) {
      if (isPermissionError(err)) {
        try {
          handleFirestoreError(err, OperationType.LIST, collectionPath);
        } catch {
          // Logged
        }
      } else {
        console.warn('Could not fetch from Firestore, falling back to local + benchmarks:', err);
      }
    }

    const localForLevel = this.localStoredScores.filter((s) => s.levelId === levelId);
    const benchmarksForLevel = DEFAULT_BENCHMARKS[levelId] || [];

    const map = new Map<string, LeaderboardRecord>();
    for (const item of [...remoteScores, ...localForLevel, ...benchmarksForLevel]) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
      return a.collisions - b.collisions;
    });

    return merged.slice(0, limitCount);
  }

  public async fetchDailyScores(dateKey: string, limitCount: number = 25): Promise<DailyLeaderboardRecord[]> {
    const collectionPath = 'daily_leaderboards';
    const remoteScores: DailyLeaderboardRecord[] = [];

    try {
      const q = query(
        collection(db, collectionPath),
        where('dateKey', '==', dateKey),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let formattedDate = new Date().toISOString();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          formattedDate = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
          formattedDate = data.createdAt;
        }

        remoteScores.push({
          id: docSnap.id,
          userId: data.userId || 'unknown',
          playerName: data.playerName || 'Anonymous Driver',
          dateKey: data.dateKey || dateKey,
          challengeTitle: data.challengeTitle || 'Daily Challenge',
          levelId: data.levelId,
          score: data.score,
          stars: data.stars || 1,
          timeSeconds: data.timeSeconds,
          precisionPct: data.precisionPct,
          angleError: data.angleError || 0,
          collisions: data.collisions || 0,
          vehicleId: data.vehicleId || 'apex_gt',
          vehicleName: data.vehicleName || 'Apex GT',
          createdAt: formattedDate,
        });
      });
    } catch (err) {
      if (isPermissionError(err)) {
        try {
          handleFirestoreError(err, OperationType.LIST, collectionPath);
        } catch {
          // Logged
        }
      } else {
        console.warn('Could not fetch daily scores from Firestore, falling back to local + benchmarks:', err);
      }
    }

    const localForDate = this.localDailyScores.filter((s) => s.dateKey === dateKey);
    const benchmarksForDate = generateDailyBenchmarks(dateKey);

    // Deduplicate by doc ID first, then keep each userId's personal best run for this date
    const byId = new Map<string, DailyLeaderboardRecord>();
    for (const item of [...remoteScores, ...localForDate, ...benchmarksForDate]) {
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    const allSorted = Array.from(byId.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
      return a.collisions - b.collisions;
    });

    const bestByUser = new Map<string, DailyLeaderboardRecord>();
    for (const entry of allSorted) {
      if (!bestByUser.has(entry.userId)) {
        bestByUser.set(entry.userId, entry);
      }
    }

    return Array.from(bestByUser.values()).slice(0, limitCount);
  }

  public getLocalBestDaily(dateKey: string): DailyLeaderboardRecord | null {
    const uid = this.getActiveUserId();
    const candidates = this.localDailyScores.filter(
      (s) => s.dateKey === dateKey && (s.userId === uid || s.userId === this.localGuestId)
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSeconds - b.timeSeconds;
    });
    return candidates[0];
  }
}

export const leaderboardService = new LeaderboardService();
