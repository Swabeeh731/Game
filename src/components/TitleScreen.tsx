import React, { useState, useEffect } from 'react';
import { DailyChallengeConfig, LevelConfig, VehicleConfig } from '../types/game';
import { VEHICLES } from '../game/vehicles';
import { LEVELS } from '../game/levels';
import { getTimeUntilNextDailyReset } from '../game/dailyChallenge';
import { DailyLeaderboardRecord } from '../firebase/leaderboardService';
import {
  Play,
  Volume2,
  VolumeX,
  ShieldCheck,
  Trophy,
  Car,
  Calendar,
  Clock,
  Lock,
  Flame,
} from 'lucide-react';

interface TitleScreenProps {
  selectedVehicle: VehicleConfig;
  selectedLevel: LevelConfig;
  dailyChallenge: DailyChallengeConfig;
  dailyBestRecord: DailyLeaderboardRecord | null;
  onSelectVehicle: (v: VehicleConfig) => void;
  onSelectLevel: (lvl: LevelConfig) => void;
  onStartGame: () => void;
  onStartDailyChallenge: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenLeaderboard: () => void;
  onOpenDailyLeaderboard: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedVehicle,
  selectedLevel,
  dailyChallenge,
  dailyBestRecord,
  onSelectVehicle,
  onSelectLevel,
  onStartGame,
  onStartDailyChallenge,
  isMuted,
  onToggleMute,
  onOpenLeaderboard,
  onOpenDailyLeaderboard,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'garage' | 'levels'>('main');
  const [resetCountdown, setResetCountdown] = useState(() => getTimeUntilNextDailyReset().formatted);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResetCountdown(getTimeUntilNextDailyReset().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 select-none overflow-y-auto">
      {/* TOP HEADER: Mute & Valet Spec Tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-emerald-400 shadow-lg">
          <ShieldCheck size={16} />
          PRO VALET SIMULATOR & PRECISION DRIVING
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-xs font-bold text-amber-300 transition shadow-lg active:scale-95"
            title="View Global Valet Rankings"
          >
            <Trophy size={15} className="text-amber-400" />
            <span>Leaderboard</span>
          </button>

          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition shadow-lg active:scale-95"
          >
            {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-emerald-400" />}
            {isMuted ? 'Muted' : 'Audio On'}
          </button>
        </div>
      </div>

      {/* CENTER VIEW: Atmospheric negative space + Main Lockup & Daily Challenge Card */}
      {activeTab === 'main' && (
        <div className="my-auto flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full">
          {/* Left Hero Lockup & Standard CTAs */}
          <div className="max-w-xl">
            {/* Bespoke Inline SVG Title Lockup */}
            <div className="mb-4">
              <svg viewBox="0 0 540 100" className="w-full max-w-[480px] drop-shadow-2xl">
                <defs>
                  <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                  <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                {/* Graphic Icon Lockup */}
                <g transform="translate(10, 16)">
                  <rect x="0" y="0" width="46" height="58" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
                  <path d="M14 18 H32 M14 28 H28 M14 38 H22" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="34" cy="42" r="3" fill="#10b981" />
                </g>
                {/* Main Typography */}
                <text
                  x="70"
                  y="46"
                  fill="url(#titleGrad)"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="900"
                  fontSize="38"
                  letterSpacing="1.5"
                >
                  PRECISION
                </text>
                <text
                  x="315"
                  y="46"
                  fill="url(#accentGrad)"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="900"
                  fontSize="38"
                  letterSpacing="1.5"
                >
                  PARKING
                </text>
                <text
                  x="72"
                  y="74"
                  fill="#94a3b8"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="700"
                  fontSize="13"
                  letterSpacing="4"
                >
                  3D PROFESSIONAL DRIVING SIMULATOR
                </text>
              </svg>
            </div>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
              Master real-world parking maneuvers with authentic Ackermann steering physics, ultrasonic proximity sonar,
              and zero-tolerance valet challenges.
            </p>

            {/* Quick Config Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-7">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400">Selected Car:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: selectedVehicle.color }} />
                  {selectedVehicle.name}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400">Level:</span>
                <span className="font-bold text-emerald-400">
                  {selectedLevel.id}. {selectedLevel.title}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onStartGame}
                className="flex items-center gap-3 px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg tracking-wide uppercase shadow-2xl shadow-emerald-500/40 transition active:scale-95 group cursor-pointer"
              >
                <Play size={20} className="fill-slate-950 transition-transform group-hover:scale-110" />
                <span>START PARKING</span>
              </button>

              <button
                onClick={() => setActiveTab('garage')}
                className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-sm tracking-wide transition active:scale-95 cursor-pointer shadow-lg"
              >
                <Car size={18} className="text-sky-400" />
                <span>VEHICLE</span>
              </button>

              <button
                onClick={() => setActiveTab('levels')}
                className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-sm tracking-wide transition active:scale-95 cursor-pointer shadow-lg"
              >
                <Trophy size={18} className="text-amber-400" />
                <span>LEVELS</span>
              </button>

              <button
                onClick={onOpenLeaderboard}
                className="flex items-center gap-2 px-4 py-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 border border-amber-500/60 text-amber-300 font-bold text-sm tracking-wide transition active:scale-95 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <Trophy size={18} className="text-amber-400" />
                <span>GLOBAL RANKINGS</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Daily Challenge Feature Card */}
          <div className="w-full max-w-sm bg-slate-900/95 border border-cyan-500/50 rounded-3xl p-5 shadow-2xl shadow-black/70 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <Flame size={12} className="text-cyan-400" />
                DAILY CHALLENGE
              </span>

              <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 tabular-nums">
                <Clock size={12} className="text-cyan-400" />
                {resetCountdown}
              </span>
            </div>

            <div>
              <div className="text-[11px] font-mono text-cyan-400 font-semibold mb-0.5">
                {dailyChallenge.dateKey} · Level {dailyChallenge.baseLevel.id} ({dailyChallenge.baseLevel.title})
              </div>
              <h3 className="text-lg font-black text-white leading-tight">{dailyChallenge.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{dailyChallenge.tagline}</p>
            </div>

            {/* Locked Constraints */}
            <div className="flex flex-wrap gap-1.5">
              {dailyChallenge.constraints.map((constraint) => (
                <span
                  key={constraint}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-200"
                >
                  <Lock size={10} className="text-cyan-400" />
                  {constraint}
                </span>
              ))}
            </div>

            {/* Best Score Today Status */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Your Best Today</span>
              {dailyBestRecord ? (
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {dailyBestRecord.score}% · {dailyBestRecord.timeSeconds.toFixed(1)}s
                </span>
              ) : (
                <span className="font-semibold text-slate-500">Not Completed</span>
              )}
            </div>

            {/* Daily Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onStartDailyChallenge}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition active:scale-95 shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                <Play size={16} className="fill-slate-950" />
                <span>Play Daily</span>
              </button>

              <button
                onClick={onOpenDailyLeaderboard}
                className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                title="View Today's Daily Global Leaderboard"
              >
                <Calendar size={15} />
                <span>Daily Board</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GARAGE CAR SELECTOR MODAL */}
      {activeTab === 'garage' && (
        <div className="max-w-4xl w-full mx-auto my-auto bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Car className="text-emerald-400" />
                VALET FLEET & GARAGE
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Select your vehicle. Each car features unique dimensions, wheelbase turning angles, and power curves.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('main')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300 transition"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VEHICLES.map((v) => {
              const isSelected = selectedVehicle.id === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => onSelectVehicle(v)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-500'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: v.color }}
                        />
                        <h3 className="font-bold text-base text-white">{v.name}</h3>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{v.type}</span>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                        v.difficulty === 'Easy'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : v.difficulty === 'Medium'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : v.difficulty === 'Hard'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {v.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">{v.tagline}</p>

                  {/* Spec Bars */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5 text-[11px]">
                        <span>Handling & Agility</span>
                        <span className="font-bold text-white">{v.handling} / 5</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${(v.handling / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/80">
                      <span>Length: <strong className="text-white">{v.length}m</strong></span>
                      <span>Width: <strong className="text-white">{v.width}m</strong></span>
                      <span>Turn Angle: <strong className="text-white">{Math.round((v.maxSteerAngle * 180) / Math.PI)}°</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setActiveTab('main')}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition shadow-lg shadow-emerald-500/20"
            >
              Confirm Selection
            </button>
          </div>
        </div>
      )}

      {/* LEVEL SELECTOR MODAL */}
      {activeTab === 'levels' && (
        <div className="max-w-4xl w-full mx-auto my-auto bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Trophy className="text-amber-400" />
                PARKING CHALLENGES & MISSIONS
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                From spacious shopping bays to multi-storey pillars and zero-scratch valet suites.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('main')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-300 transition"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {LEVELS.map((lvl) => {
              const isSelected = selectedLevel.id === lvl.id;
              return (
                <div
                  key={lvl.id}
                  onClick={() => onSelectLevel(lvl)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-500'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        LEVEL 0{lvl.id}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {lvl.difficulty}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white mb-0.5">{lvl.title}</h3>
                    <p className="text-xs text-emerald-400 font-semibold mb-2">{lvl.subtitle}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{lvl.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Limit: <strong className="text-white">{lvl.timeLimit}s</strong></span>
                    <span>Max Strikes: <strong className="text-white">{lvl.maxCollisions}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setActiveTab('main')}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition shadow-lg shadow-emerald-500/20"
            >
              Select Level & Drive
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS HINT LINE (Game craft requirement: single flat control hint line) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-slate-300 font-bold">WASD / Arrows</span> Move ·{' '}
          <span className="text-slate-300 font-bold">Space</span> Action/Brake ·{' '}
          <span className="text-slate-300 font-bold">R</span> Reverse ·{' '}
          <span className="text-slate-300 font-bold">C</span> Camera ·{' '}
          <span className="text-slate-300 font-bold">Esc</span> Pause
        </div>

        <div className="text-[11px] text-slate-500">
          Pro Valet Physics v2.4 · 60 FPS Simulation
        </div>
      </div>
    </div>
  );
};
