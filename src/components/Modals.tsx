import React from 'react';
import { DailyChallengeConfig, GameStats, LevelConfig, VehicleConfig } from '../types/game';
import {
  Trophy,
  Star,
  RotateCcw,
  Play,
  ArrowRight,
  Home,
  AlertOctagon,
  HelpCircle,
  Video,
  Calendar,
  CloudCheck,
} from 'lucide-react';

interface VictoryModalProps {
  stats: GameStats;
  level: LevelConfig;
  vehicle: VehicleConfig;
  dailyChallenge?: DailyChallengeConfig | null;
  syncedToCloud?: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
  onHome: () => void;
  onWatchReplay?: () => void;
  onViewLeaderboard?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  level,
  vehicle,
  dailyChallenge,
  syncedToCloud,
  onNextLevel,
  onRetry,
  onHome,
  onWatchReplay,
  onViewLeaderboard,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-black/80 flex flex-col items-center text-center">
        {/* Star Rating Badge */}
        <div className="flex items-center gap-2 mb-3">
          {[1, 2, 3].map((starIndex) => (
            <Star
              key={starIndex}
              size={36}
              className={`transition-all duration-300 ${
                starIndex <= stats.stars
                  ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] scale-110'
                  : 'text-slate-700 fill-slate-800'
              }`}
            />
          ))}
        </div>

        <span
          className={`text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full border mb-2 flex items-center gap-1.5 ${
            dailyChallenge
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {dailyChallenge && <Calendar size={12} />}
          {dailyChallenge ? 'DAILY CHALLENGE ACCOMPLISHED' : 'PARK ACCOMPLISHED'}
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
          {stats.stars === 3 ? 'FLAWLESS VALET PARK!' : 'EXCELLENT MANEUVER!'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          {dailyChallenge
            ? `${dailyChallenge.title} (${dailyChallenge.dateKey}) · ${vehicle.name}`
            : `Level ${level.id}: ${level.title} · Bay ${level.targetSlot.bayNumber}`}
        </p>

        {/* Leaderboard Sync Status Pill */}
        <div className="mb-4 px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
          <CloudCheck size={14} className={syncedToCloud ? 'text-emerald-400' : 'text-amber-400'} />
          <span>
            {dailyChallenge
              ? syncedToCloud
                ? 'Score published to Daily Global Leaderboard'
                : 'Score saved locally to Daily Standings'
              : syncedToCloud
              ? 'Score published to Global Leaderboard'
              : 'Score saved locally'}
          </span>
        </div>

        {/* Detailed Performance Scorecard */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-left">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400">Position Precision</span>
            <span className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
              {stats.precisionPct}%
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400">Heading Alignment</span>
            <span className="text-xl font-mono font-bold text-sky-400 tabular-nums">
              {stats.angleError <= 2 ? '0.0° (Perfect)' : `${stats.angleError.toFixed(1)}° Offset`}
            </span>
          </div>

          <div className="flex flex-col pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400">Time Taken</span>
            <span className="text-base font-mono font-bold text-white tabular-nums">
              {stats.timeElapsed.toFixed(1)}s / {level.timeLimit}s
            </span>
          </div>

          <div className="flex flex-col pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400">Collision Strikes</span>
            <span
              className={`text-base font-mono font-bold tabular-nums ${
                stats.collisions === 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stats.collisions === 0 ? '0 (Clean Sheet!)' : `${stats.collisions} strikes`}
            </span>
          </div>
        </div>

        {/* Secondary Action Row: Replay & Leaderboard */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {onWatchReplay && (
            <button
              onClick={onWatchReplay}
              className="py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-sky-400 hover:text-sky-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-lg group"
            >
              <Video size={16} className="text-sky-400 group-hover:scale-110 transition-transform" />
              <span>Watch Replay</span>
            </button>
          )}

          {onViewLeaderboard && (
            <button
              onClick={onViewLeaderboard}
              className={`py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-lg group ${
                dailyChallenge
                  ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
              }`}
            >
              {dailyChallenge ? (
                <Calendar size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              ) : (
                <Trophy size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
              )}
              <span>{dailyChallenge ? 'Daily Board' : 'Leaderboard'}</span>
            </button>
          )}
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw size={16} />
            {dailyChallenge ? 'Improve Time' : 'Retry'}
          </button>

          {dailyChallenge ? (
            <button
              onClick={onHome}
              className="w-full sm:flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-cyan-500/30"
            >
              <Home size={18} />
              <span>Back to Menu</span>
            </button>
          ) : (
            <button
              onClick={onNextLevel}
              className="w-full sm:flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-emerald-500/30"
            >
              <span>Next Level</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface FailedModalProps {
  reason: 'collisions' | 'time';
  level: LevelConfig;
  dailyChallenge?: DailyChallengeConfig | null;
  onRetry: () => void;
  onHome: () => void;
}

export const FailedModal: React.FC<FailedModalProps> = ({
  reason,
  level,
  dailyChallenge,
  onRetry,
  onHome,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl shadow-black/80 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mb-4">
          <AlertOctagon size={32} />
        </div>

        <span className="text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 mb-2">
          {dailyChallenge ? 'DAILY CHALLENGE FAILED' : 'PARK FAILED'}
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
          {reason === 'collisions' ? 'TOO MANY COLLISIONS!' : 'TIME RAN OUT!'}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {reason === 'collisions'
            ? `Exceeded the maximum allowed limit of ${level.maxCollisions} strikes.`
            : `Failed to secure the vehicle within the ${level.timeLimit}s time limit.`}
        </p>

        {/* Instructor Advice Box */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
          <HelpCircle size={20} className="text-sky-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">
              Valet Driving Instructor Advice
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">{level.advice}</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onHome}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Home size={16} />
            Menu
          </button>

          <button
            onClick={onRetry}
            className="w-full sm:flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-95 shadow-xl shadow-red-500/30"
          >
            <RotateCcw size={18} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  level: LevelConfig;
  dailyChallenge?: DailyChallengeConfig | null;
  onResume: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  dailyChallenge,
  onResume,
  onRetry,
  onHome,
}) => {
  return (
    <div className="absolute inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl shadow-black/80 flex flex-col items-center text-center">
        <h2 className="text-2xl font-black text-white mb-1">SIMULATION PAUSED</h2>
        <p className="text-xs text-slate-400 mb-6">
          {dailyChallenge ? `Daily Challenge: ${dailyChallenge.title}` : `Level ${level.id}: ${level.title}`}
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            <Play size={18} />
            <span>Resume (Esc)</span>
          </button>

          <button
            onClick={onRetry}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <RotateCcw size={16} />
            <span>Restart Run</span>
          </button>

          <button
            onClick={onHome}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Home size={16} />
            <span>Exit to Title</span>
          </button>
        </div>
      </div>
    </div>
  );
};
