import React, { useState } from 'react';
import { ReplayCameraMode, LevelConfig, VehicleConfig, GameStats } from '../types/game';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  FastForward,
  Camera,
  ArrowRight,
  Disc,
} from 'lucide-react';

interface ReplayOverlayProps {
  level: LevelConfig;
  vehicle: VehicleConfig;
  stats: GameStats;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  speedMultiplier: number;
  cameraMode: ReplayCameraMode;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onRestart: () => void;
  onSetSpeed: (speed: number) => void;
  onSetCameraMode: (mode: ReplayCameraMode) => void;
  onExitReplay: () => void;
  onNextLevel: () => void;
  onRetry: () => void;
}

export const ReplayOverlay: React.FC<ReplayOverlayProps> = ({
  level,
  vehicle,
  stats,
  currentTime,
  duration,
  isPlaying,
  speedMultiplier,
  cameraMode,
  onTogglePlay,
  onSeek,
  onRestart,
  onSetSpeed,
  onSetCameraMode,
  onExitReplay,
  onNextLevel,
  onRetry,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const cameras: { id: ReplayCameraMode; label: string; icon: string; desc: string }[] = [
    { id: 'broadcast', label: 'Broadcast TV', icon: '📡', desc: 'Trackside panning lens' },
    { id: 'orbit', label: 'Drone Orbit', icon: '🛸', desc: 'Sweeping 360° dynamic flyby' },
    { id: 'wheel', label: 'Wheel Kerb', icon: '🛞', desc: 'Low-angle tire & curb clearance' },
    { id: 'bay', label: 'Bay Cam', icon: '🅿️', desc: 'Target slot entrance view' },
    { id: 'hood', label: 'Hood Dash', icon: '🚘', desc: 'Driver cockpit perspective' },
    { id: 'overhead', label: '90° Overhead', icon: '📐', desc: 'Bird-eye line alignment' },
  ];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans z-30">
      {/* Cinematic Top Letterbox Bar with Live Replay Tag */}
      <header className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/90 to-transparent flex items-start justify-between px-4 sm:px-6 pt-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Pulsing Replay REC Tag */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/90 border border-red-500/70 text-red-300 text-xs font-bold tracking-wider uppercase shadow-lg shadow-red-950/40">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>REPLAY · REC</span>
          </div>

          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide">
              Level {level.id}: {level.title} · Bay {level.targetSlot.bayNumber}
            </span>
            <span className="text-[11px] text-slate-400">
              {stats.precisionPct}% Precision · {stats.angleError.toFixed(1)}° Offset · {vehicle.name}
            </span>
          </div>
        </div>

        {/* Cinematic Camera Quick Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 hidden md:inline">
            ANGLE:
          </span>
          {cameras.map((cam) => {
            const isActive = cameraMode === cam.id;
            return (
              <button
                key={cam.id}
                onClick={() => onSetCameraMode(cam.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={cam.desc}
              >
                <span>{cam.icon}</span>
                <span className="hidden lg:inline">{cam.label}</span>
              </button>
            );
          })}
        </div>

        {/* Exit Replay Button */}
        <button
          onClick={onExitReplay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white transition active:scale-95 shadow-lg"
          title="Return to Result Scorecard"
        >
          <X size={16} />
          <span>Close</span>
        </button>
      </header>

      {/* Cinematic Corner Watermark */}
      <div className="absolute left-6 top-20 text-[10px] font-mono tracking-widest text-white/40 uppercase hidden sm:block">
        CAMERA: {cameraMode.toUpperCase()} VIEW · 60 FPS TELEMETRY
      </div>

      {/* Bottom Replay Control Dock */}
      <footer
        className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${
          isDockCollapsed ? 'bottom-0 translate-y-[calc(100%-28px)]' : 'bottom-3'
        } max-w-[min(940px,96vw)] w-full`}
      >
        {/* Collapse / Expand Toggle Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="flex items-center gap-1 px-4 py-1 rounded-t-lg bg-slate-900/95 border-t border-x border-slate-700/80 text-[11px] font-semibold text-slate-400 hover:text-white transition shadow-lg active:scale-95"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp size={14} /> Show Replay Controls
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Hide Replay Controls
              </>
            )}
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl shadow-black/80 flex flex-col gap-3">
          {/* Timeline Scrubber Bar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums min-w-[44px]">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration)}
                step={0.05}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
              />
            </div>

            <span className="text-xs font-mono font-bold text-slate-400 tabular-nums min-w-[44px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Transport Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
            {/* Play/Pause & Restart */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center justify-center transition active:scale-95 shadow-md shadow-emerald-500/20"
                title={isPlaying ? 'Pause Replay (Space)' : 'Play Replay (Space)'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
              </button>

              <button
                onClick={onRestart}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center transition active:scale-95 border border-slate-700"
                title="Restart Replay"
              >
                <RotateCcw size={16} />
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 ml-2">
                {[0.5, 1.0, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => onSetSpeed(s)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      speedMultiplier === s
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Camera Select (Mobile/Compact) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline mr-1">
                CAM:
              </span>
              <div className="flex items-center gap-1">
                {cameras.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSetCameraMode(c.id)}
                    className={`p-2 rounded-xl text-xs font-bold transition ${
                      cameraMode === c.id
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title={c.label}
                  >
                    {c.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Progression CTAs */}
            <div className="flex items-center gap-2">
              <button
                onClick={onRetry}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition active:scale-95 border border-slate-700"
              >
                Retry
              </button>

              <button
                onClick={onNextLevel}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <span>Next</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
