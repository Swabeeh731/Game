import React, { useState, useEffect } from 'react';
import { LEVELS } from '../game/levels';
import { getDailyChallenge, getTimeUntilNextDailyReset } from '../game/dailyChallenge';
import {
  leaderboardService,
  LeaderboardRecord,
  DailyLeaderboardRecord,
} from '../firebase/leaderboardService';
import {
  Trophy,
  Car,
  Star,
  ShieldCheck,
  User,
  X,
  LogIn,
  RotateCw,
  Sparkles,
  Calendar,
  Clock,
} from 'lucide-react';

interface LeaderboardModalProps {
  initialLevelId?: number;
  initialMode?: 'standard' | 'daily';
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  initialLevelId = 1,
  initialMode = 'standard',
  onClose,
}) => {
  const [boardMode, setBoardMode] = useState<'standard' | 'daily'>(initialMode);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(initialLevelId);
  const [records, setRecords] = useState<(LeaderboardRecord | DailyLeaderboardRecord)[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState(leaderboardService.getCurrentUser());
  const [resetCountdown, setResetCountdown] = useState(() => getTimeUntilNextDailyReset().formatted);

  const dailyChallenge = getDailyChallenge();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResetCountdown(getTimeUntilNextDailyReset().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadScores = async (mode: 'standard' | 'daily', lvlId: number) => {
    setIsLoading(true);
    try {
      if (mode === 'daily') {
        const data = await leaderboardService.fetchDailyScores(dailyChallenge.dateKey, 25);
        setRecords(data);
      } else {
        const data = await leaderboardService.fetchTopScores(lvlId, 25);
        setRecords(data);
      }
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScores(boardMode, selectedLevelId);
  }, [boardMode, selectedLevelId]);

  const handleGoogleSignIn = async () => {
    const user = await leaderboardService.signInWithGoogle();
    if (user) {
      setCurrentUser(user);
      loadScores(boardMode, selectedLevelId);
    }
  };

  const currentLevelConfig = LEVELS.find((l) => l.id === selectedLevelId) || LEVELS[0];
  const activeUserId = leaderboardService.getActiveUserId();

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full h-[90vh] max-h-[740px] shadow-2xl shadow-black/90 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-lg ${
                boardMode === 'daily'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-cyan-500/10'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10'
              }`}
            >
              {boardMode === 'daily' ? <Calendar size={24} /> : <Trophy size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {boardMode === 'daily' ? 'DAILY GLOBAL LEADERBOARD' : 'GLOBAL LEADERBOARD'}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  FIRESTORE LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {boardMode === 'daily'
                  ? `Official global standings for today's constrained challenge (${dailyChallenge.dateKey}).`
                  : 'Top recorded precision scores and completion times across all valet levels.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && !currentUser.isAnonymous ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                <User size={14} className="text-emerald-400" />
                <span className="font-bold text-white max-w-[120px] truncate">
                  {currentUser.displayName || 'Authenticated'}
                </span>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95"
                title="Sign in with Google to save under your permanent account"
              >
                <LogIn size={14} className="text-sky-400" />
                <span>Google Sign-In</span>
              </button>
            )}

            <button
              onClick={() => loadScores(boardMode, selectedLevelId)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
              title="Refresh Leaderboard"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Board Mode Switcher: Standard Levels vs Daily Challenge */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setBoardMode('standard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                boardMode === 'standard'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy size={14} />
              <span>Standard Levels</span>
            </button>
            <button
              onClick={() => setBoardMode('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                boardMode === 'daily'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar size={14} />
              <span>Daily Challenge</span>
            </button>
          </div>

          {boardMode === 'daily' && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={14} className="text-cyan-400" />
              <span>Resets in</span>
              <span className="font-mono font-bold text-cyan-300 tabular-nums">{resetCountdown}</span>
            </div>
          )}
        </div>

        {/* Sub-Bar: Standard Level Tabs OR Daily Challenge Constraints Summary */}
        {boardMode === 'standard' ? (
          <>
            <div className="flex items-center gap-1.5 p-3 px-6 bg-slate-950/30 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
              {LEVELS.map((lvl) => {
                const isActive = lvl.id === selectedLevelId;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
                    }`}
                  >
                    <span>Lvl {lvl.id}</span>
                    <span className="opacity-80">· {lvl.title}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
              <span>
                Target: <strong className="text-white">Bay {currentLevelConfig.targetSlot.bayNumber}</strong> · Type:{' '}
                <strong className="text-emerald-400">{currentLevelConfig.type} Parking</strong>
              </span>
              <span className="font-mono text-[11px]">Time Limit: {currentLevelConfig.timeLimit}s</span>
            </div>
          </>
        ) : (
          <div className="px-6 py-3 bg-cyan-950/20 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-col">
              <span className="font-bold text-white">
                {dailyChallenge.title} — <span className="text-cyan-300">{dailyChallenge.baseLevel.title}</span>
              </span>
              <span className="text-[11px] text-slate-400">{dailyChallenge.tagline}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {dailyChallenge.constraints.map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/90 text-cyan-300 border border-cyan-500/30"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RotateCw size={24} className="animate-spin text-emerald-400" />
              <span className="text-xs font-medium">Fetching global standings...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
              <ShieldCheck size={32} className="text-slate-600" />
              <p className="text-sm font-bold text-slate-300">No records found yet.</p>
              <p className="text-xs text-slate-500">Be the first to complete the park and claim rank #1!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((rec, index) => {
                const isTop3 = index < 3;
                const isCurrentUser =
                  (currentUser?.uid && currentUser.uid === rec.userId) || activeUserId === rec.userId;

                let medalBadge = (
                  <span className="w-7 h-7 rounded-lg bg-slate-800 font-mono font-bold text-xs flex items-center justify-center text-slate-400">
                    #{index + 1}
                  </span>
                );

                if (index === 0) {
                  medalBadge = (
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs flex items-center justify-center shadow-md shadow-amber-500/20">
                      🥇
                    </span>
                  );
                } else if (index === 1) {
                  medalBadge = (
                    <span className="w-7 h-7 rounded-lg bg-slate-400/20 text-slate-300 border border-slate-400/40 font-bold text-xs flex items-center justify-center">
                      🥈
                    </span>
                  );
                } else if (index === 2) {
                  medalBadge = (
                    <span className="w-7 h-7 rounded-lg bg-amber-700/20 text-amber-500 border border-amber-700/40 font-bold text-xs flex items-center justify-center">
                      🥉
                    </span>
                  );
                }

                return (
                  <div
                    key={rec.id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all ${
                      isCurrentUser
                        ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                        : isTop3
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-800'
                    }`}
                  >
                    {/* Rank & Driver Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {medalBadge}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[220px]">
                            {rec.playerName}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Car size={12} className="text-slate-500" />
                            {rec.vehicleName || 'Vehicle'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="flex items-center gap-3 sm:gap-6 text-right">
                      {/* Stars */}
                      <div className="hidden sm:flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            className={
                              s <= rec.stars
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-800 fill-slate-800'
                            }
                          />
                        ))}
                      </div>

                      {/* Time */}
                      <div className="flex flex-col min-w-[54px]">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Time</span>
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-200 tabular-nums">
                          {rec.timeSeconds.toFixed(1)}s
                        </span>
                      </div>

                      {/* Precision Match */}
                      <div className="flex flex-col min-w-[62px]">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Score</span>
                        <span className="text-sm sm:text-base font-mono font-black text-emerald-400 tabular-nums">
                          {rec.score}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-400" />
            Rankings prioritize overall alignment score, completion time, and zero-strike clean sheets.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wide transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
