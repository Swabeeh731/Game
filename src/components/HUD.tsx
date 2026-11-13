import React, { useState } from 'react';
import {
  CameraMode,
  DailyChallengeConfig,
  Gear,
  ParkingAssessment,
  SensorReading,
  LevelConfig,
  VehicleConfig,
} from '../types/game';
import {
  Volume2,
  VolumeX,
  Pause,
  Camera,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Gauge,
  Compass,
} from 'lucide-react';

interface HUDProps {
  level: LevelConfig;
  vehicle: VehicleConfig;
  dailyChallenge?: DailyChallengeConfig | null;
  speed: number;
  gear: Gear;
  steerAngle: number;
  collisionCount: number;
  timeRemaining: number;
  parkingAssessment: ParkingAssessment;
  sensors: SensorReading;
  cameraMode: CameraMode;
  isMuted: boolean;
  onShiftGear: (gear: Gear) => void;
  onToggleCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  // Touch/Button input handlers
  onInputStart?: (action: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake') => void;
  onInputEnd?: (action: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake') => void;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  vehicle,
  dailyChallenge,
  speed,
  gear,
  steerAngle,
  collisionCount,
  timeRemaining,
  parkingAssessment,
  sensors,
  cameraMode,
  isMuted,
  onShiftGear,
  onToggleCamera,
  onToggleMute,
  onPause,
  onInputStart,
  onInputEnd,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const speedKmh = Math.abs(Math.round(speed * 3.6));
  const steerDeg = Math.round((steerAngle * 180) / Math.PI);

  // Proximity sensor color helper
  const getSensorColor = (dist: number) => {
    if (dist <= 0.35) return 'text-red-500 fill-red-500/80 stroke-red-500 animate-pulse';
    if (dist <= 0.8) return 'text-red-400 fill-red-400/60 stroke-red-400';
    if (dist <= 1.6) return 'text-amber-400 fill-amber-400/50 stroke-amber-400';
    if (dist <= 2.8) return 'text-emerald-400 fill-emerald-400/40 stroke-emerald-400';
    return 'text-slate-600 fill-slate-700/20 stroke-slate-600';
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. TOP PERIMETER CLUSTER */}
      <header className="absolute top-3 inset-x-3 flex items-start justify-between gap-3 z-20">
        {/* Level & Objective Info */}
        <div
          className={`pointer-events-auto bg-slate-900/95 border rounded-xl px-4 py-2.5 shadow-xl shadow-black/40 flex items-center gap-3 ${
            dailyChallenge ? 'border-cyan-500/60' : 'border-slate-700/80'
          }`}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              {dailyChallenge ? (
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  DAILY CHALLENGE
                </span>
              ) : (
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LEVEL {level.id}
                </span>
              )}
              <span className="text-sm font-bold text-white tracking-wide">{level.title}</span>
            </div>
            <span className="text-xs text-slate-400 mt-0.5">
              Bay <span className="text-emerald-300 font-semibold">{level.targetSlot.bayNumber}</span> ·{' '}
              {dailyChallenge ? `${vehicle.name}${dailyChallenge.forcedCamera ? ' · Cam Locked' : ''}` : level.subtitle}
            </span>
          </div>
        </div>

        {/* Center Live Parking Accuracy Status */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            className={`px-4 py-1.5 rounded-full border transition-all duration-300 shadow-lg flex items-center gap-2 ${
              parkingAssessment.isStable
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-300 shadow-emerald-500/20'
                : parkingAssessment.inZone
                ? 'bg-amber-950/95 border-amber-500 text-amber-300 shadow-amber-500/20'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                parkingAssessment.isStable
                  ? 'bg-emerald-400'
                  : parkingAssessment.inZone
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold tracking-wide">
              {parkingAssessment.isStable
                ? `HOLDING POSITION (${parkingAssessment.holdTime.toFixed(1)}s / ${parkingAssessment.holdRequired}s)`
                : parkingAssessment.inZone
                ? 'IN TARGET BAY · APPLY BRAKE / STOP'
                : 'ALIGN INTO GREEN PARKING BAY'}
            </span>
            {parkingAssessment.inZone && (
              <span className="text-xs font-mono font-bold bg-black/40 px-2 py-0.5 rounded text-white tabular-nums">
                {parkingAssessment.overallScore}% MATCH
              </span>
            )}
          </div>

          {/* Hold progress bar when stationary in zone */}
          {parkingAssessment.isStable && (
            <div className="w-56 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-emerald-500/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-75"
                style={{
                  width: `${Math.min(100, (parkingAssessment.holdTime / parkingAssessment.holdRequired) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Top-Right Metrics: Collision Strikes & Countdown Timer */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Collision Strikes */}
          <div
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-lg ${
              collisionCount >= level.maxCollisions - 1
                ? 'bg-red-950/95 border-red-500 text-red-300'
                : collisionCount > 0
                ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
                : 'bg-slate-900/95 border-slate-700/80 text-slate-300'
            }`}
          >
            <ShieldAlert size={16} className={collisionCount > 0 ? 'text-amber-400' : 'text-slate-400'} />
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">
                Strikes
              </span>
              <span className="text-xs font-mono font-bold tabular-nums">
                {collisionCount} / {level.maxCollisions}
              </span>
            </div>
          </div>

          {/* Time Countdown */}
          <div
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-lg ${
              timeRemaining < 20
                ? 'bg-red-950/95 border-red-500 text-red-300'
                : 'bg-slate-900/95 border-slate-700/80 text-slate-300'
            }`}
          >
            <Clock size={16} className={timeRemaining < 20 ? 'text-red-400' : 'text-slate-400'} />
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">
                Time
              </span>
              <span className="text-xs font-mono font-bold tabular-nums">{Math.ceil(timeRemaining)}s</span>
            </div>
          </div>

          {/* Camera View Switcher */}
          <button
            onClick={onToggleCamera}
            disabled={Boolean(dailyChallenge?.forcedCamera)}
            title={
              dailyChallenge?.forcedCamera
                ? 'Camera Locked by Daily Challenge Constraint'
                : 'Toggle Camera View (Chase / Hood / Top-Down)'
            }
            className={`p-2 rounded-xl border transition shadow-lg ${
              dailyChallenge?.forcedCamera
                ? 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-900/95 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white active:scale-95'
            }`}
          >
            <Camera size={18} />
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleMute}
            title="Toggle Audio"
            className="p-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95 shadow-lg"
          >
            {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-emerald-400" />}
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            title="Pause Game (Esc)"
            className="p-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition active:scale-95 shadow-lg"
          >
            <Pause size={18} />
          </button>
        </div>
      </header>

      {/* 2. PARKING PROXIMITY RADAR SONAR (Top-Right Floating Widget) */}
      <div className="absolute right-3 top-18 pointer-events-auto bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-xl shadow-black/40 w-44 flex flex-col items-center">
        <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Compass size={12} className="text-emerald-400" />
            PARK SONAR
          </span>
          <span
            className={`text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.2 rounded ${
              sensors.minDistance <= 0.35
                ? 'bg-red-500/20 text-red-400'
                : sensors.minDistance <= 1.2
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {sensors.minDistance > 4.5 ? '> 4.5m' : `${sensors.minDistance.toFixed(1)}m`}
          </span>
        </div>

        {/* Ultrasonic Radar Schematic Display */}
        <div className="relative w-28 h-32 flex items-center justify-center">
          {/* Front Distance Arcs */}
          <div className="absolute top-0 inset-x-0 flex justify-center gap-1">
            <div className={`h-2.5 w-6 rounded-t-sm border-t-2 ${getSensorColor(sensors.frontMin)}`} />
            <div className={`h-3 w-8 rounded-t-md border-t-2 ${getSensorColor(sensors.frontMin)}`} />
            <div className={`h-2.5 w-6 rounded-t-sm border-t-2 ${getSensorColor(sensors.frontMin)}`} />
          </div>

          {/* Car Silhouette Wireframe */}
          <div className="w-14 h-22 rounded-md border-2 border-slate-500/60 bg-slate-800/80 flex flex-col items-center justify-between p-1 relative">
            <div className="w-8 h-2 rounded bg-slate-600/80" />
            <div className="text-[9px] font-bold text-slate-400 tracking-wider">
              {gear === 'R' ? 'REV' : 'FWD'}
            </div>
            <div className="w-8 h-1.5 rounded-sm bg-red-900/60" />
          </div>

          {/* Left / Right Distance Arcs */}
          <div
            className={`absolute left-1 top-12 w-2 h-8 border-l-2 rounded-l-sm ${getSensorColor(sensors.leftMin)}`}
          />
          <div
            className={`absolute right-1 top-12 w-2 h-8 border-r-2 rounded-r-sm ${getSensorColor(sensors.rightMin)}`}
          />

          {/* Rear Distance Arcs */}
          <div className="absolute bottom-0 inset-x-0 flex justify-center gap-1">
            <div className={`h-2.5 w-6 rounded-b-sm border-b-2 ${getSensorColor(sensors.rearMin)}`} />
            <div className={`h-3 w-8 rounded-b-md border-b-2 ${getSensorColor(sensors.rearMin)}`} />
            <div className={`h-2.5 w-6 rounded-b-sm border-b-2 ${getSensorColor(sensors.rearMin)}`} />
          </div>
        </div>

        {/* Distance summary */}
        <div className="w-full grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-2 border-t border-slate-800 text-center font-mono">
          <div>
            F: <span className="text-white font-bold">{sensors.frontMin.toFixed(1)}m</span>
          </div>
          <div>
            R: <span className="text-white font-bold">{sensors.rearMin.toFixed(1)}m</span>
          </div>
        </div>
      </div>

      {/* 3. COLLAPSIBLE BOTTOM CONTROL DOCK (Three.js skill directive: zero viewport occlusion) */}
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
                <ChevronUp size={14} /> Show Dashboard & Controls (H)
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Hide Dashboard (H)
              </>
            )}
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl shadow-black/60 flex flex-wrap items-center justify-between gap-3">
          {/* Speedometer & Gear Display */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 min-w-[76px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Gauge size={12} className="text-emerald-400" /> SPEED
              </span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-mono font-black text-white tabular-nums">{speedKmh}</span>
                <span className="text-[10px] font-bold text-slate-400">km/h</span>
              </div>
            </div>

            {/* PRND Interactive Gear Shifter */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GEAR BOX</span>
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                {(['P', 'R', 'N', 'D'] as Gear[]).map((g) => {
                  const isActive = gear === g;
                  let colorClass = 'text-slate-400 hover:text-slate-200';
                  if (isActive) {
                    if (g === 'P') colorClass = 'bg-red-600 text-white shadow-md shadow-red-600/30';
                    else if (g === 'R') colorClass = 'bg-amber-600 text-white shadow-md shadow-amber-600/30';
                    else if (g === 'N') colorClass = 'bg-blue-600 text-white shadow-md shadow-blue-600/30';
                    else colorClass = 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30';
                  }

                  return (
                    <button
                      key={g}
                      onClick={() => onShiftGear(g)}
                      className={`w-8 h-8 rounded-lg font-bold text-sm transition-all duration-150 active:scale-95 flex items-center justify-center ${colorClass}`}
                      title={`Shift to ${g}`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Steering Wheel Angle Indicator */}
            <div className="hidden sm:flex flex-col items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 min-w-[70px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STEER</span>
              <span className="text-sm font-mono font-bold text-slate-200 tabular-nums">
                {steerDeg > 0 ? `+${steerDeg}°` : `${steerDeg}°`}
              </span>
            </div>
          </div>

          {/* Quick On-Screen Touch Driving Controls (Responsive / Mobile / Touch Friendly) */}
          <div className="flex items-center gap-2">
            {/* Steering Buttons */}
            <div className="flex items-center gap-1">
              <button
                onPointerDown={() => onInputStart?.('left')}
                onPointerUp={() => onInputEnd?.('left')}
                onPointerLeave={() => onInputEnd?.('left')}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white font-bold flex items-center justify-center transition active:scale-95"
                title="Steer Left (A / Left Arrow)"
              >
                ◀
              </button>
              <button
                onPointerDown={() => onInputStart?.('right')}
                onPointerUp={() => onInputEnd?.('right')}
                onPointerLeave={() => onInputEnd?.('right')}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white font-bold flex items-center justify-center transition active:scale-95"
                title="Steer Right (D / Right Arrow)"
              >
                ▶
              </button>
            </div>

            {/* Brake Pedal */}
            <button
              onPointerDown={() => onInputStart?.('brake')}
              onPointerUp={() => onInputEnd?.('brake')}
              onPointerLeave={() => onInputEnd?.('brake')}
              className="px-4 h-10 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-300 font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center gap-1"
              title="Foot Brake (S / Down Arrow)"
            >
              BRAKE
            </button>

            {/* Gas Pedal */}
            <button
              onPointerDown={() => onInputStart?.('throttle')}
              onPointerUp={() => onInputEnd?.('throttle')}
              onPointerLeave={() => onInputEnd?.('throttle')}
              className="px-4 h-10 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 font-bold text-xs tracking-wider uppercase transition active:scale-95 flex items-center gap-1"
              title="Accelerate / Gas (W / Up Arrow)"
            >
              GAS
            </button>

            {/* Handbrake */}
            <button
              onPointerDown={() => onInputStart?.('handbrake')}
              onPointerUp={() => onInputEnd?.('handbrake')}
              onPointerLeave={() => onInputEnd?.('handbrake')}
              className="px-3 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-bold uppercase transition active:scale-95"
              title="Handbrake (Space)"
            >
              (P)
            </button>
          </div>

          {/* Camera View Mode Pills & Keyboard Shortcuts */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              {(
                [
                  { id: 'chase', label: 'Chase' },
                  { id: 'cockpit', label: 'Hood' },
                  { id: 'topdown', label: '90° Bird' },
                ] as const
              ).map((cam) => {
                const isLockedOut = Boolean(dailyChallenge?.forcedCamera && dailyChallenge.forcedCamera !== cam.id);
                return (
                  <button
                    key={cam.id}
                    onClick={onToggleCamera}
                    disabled={isLockedOut || Boolean(dailyChallenge?.forcedCamera)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      cameraMode === cam.id
                        ? 'bg-slate-700 text-white'
                        : isLockedOut
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>

            {/* Flat control hint line */}
            <div className="text-[11px] text-slate-400 font-medium px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800/80 hidden md:block">
              <span className="text-slate-300 font-semibold">WASD / Arrows</span> Drive ·{' '}
              <span className="text-slate-300 font-semibold">Space</span> Brake ·{' '}
              <span className="text-slate-300 font-semibold">R</span> Reverse ·{' '}
              <span className="text-slate-300 font-semibold">C</span> Cam
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
