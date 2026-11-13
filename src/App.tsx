import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  CameraMode,
  ReplayCameraMode,
  Gear,
  LevelConfig,
  VehicleConfig,
  GameStats,
  ParkingAssessment,
  SensorReading,
  DailyChallengeConfig,
} from './types/game';
import { VEHICLES } from './game/vehicles';
import { LEVELS } from './game/levels';
import { getDailyChallenge } from './game/dailyChallenge';
import { SceneManager } from './game/sceneManager';
import { VehiclePhysics } from './game/physics';
import { soundEngine } from './audio/soundEngine';
import { ReplayRecorder, ReplayPlayer } from './game/replaySystem';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { VictoryModal, FailedModal, PauseModal } from './components/Modals';
import { ReplayOverlay } from './components/ReplayOverlay';
import { LeaderboardModal } from './components/LeaderboardModal';
import { leaderboardService, DailyLeaderboardRecord } from './firebase/leaderboardService';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const physicsRef = useRef<VehiclePhysics | null>(null);

  // Replay Recorder & Player
  const replayRecorderRef = useRef<ReplayRecorder>(new ReplayRecorder());
  const replayPlayerRef = useRef<ReplayPlayer | null>(null);

  // Daily Challenge Config (deterministic for today's UTC date)
  const dailyChallenge = useMemo(() => getDailyChallenge(), []);

  // Game UI States
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'success' | 'failed' | 'replay'>('title');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleConfig>(VEHICLES[0]);
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig>(LEVELS[0]);
  const [activeDailyChallenge, setActiveDailyChallenge] = useState<DailyChallengeConfig | null>(null);
  const [dailyBestRecord, setDailyBestRecord] = useState<DailyLeaderboardRecord | null>(() =>
    leaderboardService.getLocalBestDaily(dailyChallenge.dateKey)
  );
  const [syncedToCloud, setSyncedToCloud] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [isMuted, setIsMuted] = useState(false);

  // Replay UI States
  const [replayCameraMode, setReplayCameraMode] = useState<ReplayCameraMode>('broadcast');
  const [replayTime, setReplayTime] = useState(0);
  const [replayDuration, setReplayDuration] = useState(0);
  const [replayIsPlaying, setReplayIsPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState(1.0);

  // Leaderboard Modal State
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardInitialLevel, setLeaderboardInitialLevel] = useState(1);
  const [leaderboardInitialMode, setLeaderboardInitialMode] = useState<'standard' | 'daily'>('standard');

  // Derived active level & vehicle for current run
  const activeLevel = activeDailyChallenge ? activeDailyChallenge.effectiveLevel : selectedLevel;
  const activeVehicle = activeDailyChallenge ? activeDailyChallenge.forcedVehicle : selectedVehicle;

  // Refs for game loop (prevents stale closures without restarting WebGL loop)
  const activeLevelRef = useRef<LevelConfig>(activeLevel);
  activeLevelRef.current = activeLevel;
  const activeVehicleRef = useRef<VehicleConfig>(activeVehicle);
  activeVehicleRef.current = activeVehicle;
  const activeDailyChallengeRef = useRef<DailyChallengeConfig | null>(activeDailyChallenge);
  activeDailyChallengeRef.current = activeDailyChallenge;

  // Real-time HUD states (synced at ~30Hz without re-mounting 3D canvas)
  const [hudState, setHudState] = useState({
    speed: 0,
    gear: 'D' as Gear,
    steerAngle: 0,
    collisionCount: 0,
    timeRemaining: LEVELS[0].timeLimit,
    parkingAssessment: {
      inZone: false,
      positionScore: 0,
      angleScore: 0,
      angleErrorDeg: 0,
      depthScore: 0,
      overallScore: 0,
      isStable: false,
      holdTime: 0,
      holdRequired: 1.5,
      isPerfect: false,
    } as ParkingAssessment,
    sensors: {
      frontMin: 5,
      rearMin: 5,
      leftMin: 5,
      rightMin: 5,
      closestSector: 'none',
      minDistance: 5,
    } as SensorReading,
  });

  // End game stats & failure reason
  const [endStats, setEndStats] = useState<GameStats>({
    levelId: 1,
    stars: 3,
    score: 100,
    timeElapsed: 0,
    collisions: 0,
    precisionPct: 100,
    angleError: 0,
  });
  const [failReason, setFailReason] = useState<'collisions' | 'time'>('collisions');

  // Input state
  const keysRef = useRef<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
  });

  const touchInputsRef = useRef<{
    throttle: boolean;
    brake: boolean;
    left: boolean;
    right: boolean;
    handbrake: boolean;
  }>({
    throttle: false,
    brake: false,
    left: false,
    right: false,
    handbrake: false,
  });

  const timeRemainingRef = useRef<number>(LEVELS[0].timeLimit);
  const timeElapsedRef = useRef<number>(0);
  const hitstopCooldownRef = useRef<number>(0);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // 1. Initialize Scene & Three.js Canvas
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const sm = new SceneManager(canvasMountRef.current);
    sceneManagerRef.current = sm;

    const phys = new VehiclePhysics(selectedVehicle, selectedLevel.startPos, selectedLevel.startRot);
    physicsRef.current = phys;

    sm.loadLevel(selectedLevel, selectedVehicle);

    const handleResize = () => {
      if (canvasMountRef.current && sm) {
        sm.resize(canvasMountRef.current.clientWidth, canvasMountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      sm.dispose();
      sceneManagerRef.current = null;
      physicsRef.current = null;
    };
  }, []);

  // Start standard game handler
  const handleStartGame = useCallback(() => {
    soundEngine.init();
    setActiveDailyChallenge(null);
    activeDailyChallengeRef.current = null;
    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(selectedVehicle, selectedLevel.startPos, selectedLevel.startRot);
      sceneManagerRef.current.loadLevel(selectedLevel, selectedVehicle);
      timeRemainingRef.current = selectedLevel.timeLimit;
      timeElapsedRef.current = 0;
      setCameraMode('chase');
      replayRecorderRef.current.start();
      setGameState('playing');
    }
  }, [selectedLevel, selectedVehicle]);

  const handleStartGameRef = useRef(handleStartGame);
  handleStartGameRef.current = handleStartGame;

  // Start Daily Challenge handler
  const handleStartDailyChallenge = useCallback(() => {
    soundEngine.init();
    setActiveDailyChallenge(dailyChallenge);
    activeDailyChallengeRef.current = dailyChallenge;
    const lvl = dailyChallenge.effectiveLevel;
    const veh = dailyChallenge.forcedVehicle;
    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(veh, lvl.startPos, lvl.startRot);
      sceneManagerRef.current.loadLevel(lvl, veh);
      timeRemainingRef.current = lvl.timeLimit;
      timeElapsedRef.current = 0;
      setCameraMode(dailyChallenge.forcedCamera || 'chase');
      replayRecorderRef.current.start();
      setGameState('playing');
    }
  }, [dailyChallenge]);

  // Replay Handlers
  const handleToggleReplayPlay = useCallback(() => {
    if (replayPlayerRef.current) {
      replayPlayerRef.current.togglePlay();
      setReplayIsPlaying(replayPlayerRef.current.isPlaying);
    }
  }, []);

  const handleSeekReplay = useCallback((t: number) => {
    if (replayPlayerRef.current) {
      replayPlayerRef.current.seek(t);
      setReplayTime(t);
    }
  }, []);

  const handleRestartReplay = useCallback(() => {
    if (replayPlayerRef.current) {
      replayPlayerRef.current.restart();
      setReplayTime(0);
      setReplayIsPlaying(true);
    }
  }, []);

  const handleSetReplayCamera = useCallback((mode: ReplayCameraMode) => {
    if (replayPlayerRef.current) {
      replayPlayerRef.current.setCameraMode(mode);
      setReplayCameraMode(mode);
    }
  }, []);

  // 2. Keyboard Event Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();

      if (gameStateRef.current === 'replay') {
        if (e.key === ' ' || e.code === 'Space') {
          handleToggleReplayPlay();
          e.preventDefault();
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          handleRestartReplay();
          return;
        }
        if (e.key === 'Escape') {
          setGameState('success');
          return;
        }
        if (e.key === 'ArrowLeft') {
          if (replayPlayerRef.current) {
            handleSeekReplay(Math.max(0, replayPlayerRef.current.currentTime - 1.5));
          }
          return;
        }
        if (e.key === 'ArrowRight') {
          if (replayPlayerRef.current) {
            handleSeekReplay(Math.min(replayPlayerRef.current.duration, replayPlayerRef.current.currentTime + 1.5));
          }
          return;
        }
        const cameraKeys: ReplayCameraMode[] = ['broadcast', 'orbit', 'wheel', 'bay', 'hood', 'overhead'];
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= cameraKeys.length) {
          handleSetReplayCamera(cameraKeys[num - 1]);
          return;
        }
        return;
      }

      if (e.key === 'Escape') {
        if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
        }
        return;
      }

      // Quick Gear Shift with R (Toggle Reverse/Drive)
      if (e.key === 'r' || e.key === 'R') {
        if (physicsRef.current && gameStateRef.current === 'playing') {
          const currentGear = physicsRef.current.state.gear;
          const nextGear = currentGear === 'R' ? 'D' : 'R';
          physicsRef.current.shiftGear(nextGear);
        }
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        // Respect Daily Challenge camera lock constraint
        if (activeDailyChallengeRef.current?.forcedCamera) {
          return;
        }
        setCameraMode((prev) => {
          const modes: CameraMode[] = ['chase', 'cockpit', 'topdown'];
          const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
          return modes[nextIdx];
        });
        return;
      }

      // Enter/Space on Title Screen to start (only when leaderboard modal is closed)
      if ((e.key === 'Enter' || e.key === ' ') && gameStateRef.current === 'title') {
        handleStartGameRef.current();
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.right = true;
          break;
        case 'Space':
          keysRef.current.space = true;
          e.preventDefault();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.right = false;
          break;
        case 'Space':
          keysRef.current.space = false;
          break;
      }
    };

    const onBlur = () => {
      keysRef.current = { up: false, down: false, left: false, right: false, space: false };
      touchInputsRef.current = { throttle: false, brake: false, left: false, right: false, handbrake: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleToggleReplayPlay, handleRestartReplay, handleSeekReplay, handleSetReplayCamera]);

  // Synchronize cameraMode change with SceneManager
  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.cameraMode = cameraMode;
    }
  }, [cameraMode]);

  // 3. Main 60fps Game & Physics Simulation Loop
  useEffect(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    const isSoftware = sm.isSoftwareGl;

    let frameId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = sm!.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const phys = physicsRef.current;
      const currentGameState = gameStateRef.current;
      const lvl = activeLevelRef.current;
      const veh = activeVehicleRef.current;
      const daily = activeDailyChallengeRef.current;

      if (phys && sm) {
        if (currentGameState === 'playing') {
          if (hitstopCooldownRef.current > 0) {
            hitstopCooldownRef.current -= dt;
          } else {
            const k = keysRef.current;
            const t = touchInputsRef.current;

            const throttle = (k.up || t.throttle) ? 1.0 : 0.0;
            const brake = (k.down || t.brake) ? 1.0 : 0.0;
            const steer = ((k.left || t.left) ? 1.0 : 0.0) - ((k.right || t.right) ? 1.0 : 0.0);
            const handbrake = k.space || t.handbrake;

            const collisionEvent = phys.update(dt, { throttle, brake, steer, handbrake }, lvl.obstacles);

            if (collisionEvent.hit && collisionEvent.intensity > 1.2) {
              hitstopCooldownRef.current = 0.04;
            }

            if (phys.collisionCount >= lvl.maxCollisions) {
              soundEngine.playFailBuzzer();
              setFailReason('collisions');
              setGameState('failed');
            }

            timeRemainingRef.current = Math.max(0, timeRemainingRef.current - dt);
            timeElapsedRef.current += dt;
            if (timeRemainingRef.current <= 0) {
              soundEngine.playFailBuzzer();
              setFailReason('time');
              setGameState('failed');
            }

            // Record replay frame
            replayRecorderRef.current.recordFrame(
              timeElapsedRef.current,
              phys.state.x,
              phys.state.z,
              phys.state.heading,
              phys.state.steerAngle,
              phys.state.wheelSpin,
              phys.state.speed,
              phys.state.gear,
              keysRef.current.down || touchInputsRef.current.brake,
              phys.state.gear === 'R'
            );

            // Parking assessment
            const assessment = phys.assessParking(lvl.targetSlot, dt);

            // Victory check
            if (assessment.isStable && assessment.holdTime >= assessment.holdRequired) {
              soundEngine.playVictoryFanfare();

              const recordedFrames = replayRecorderRef.current.getFrames();
              const player = new ReplayPlayer(recordedFrames);
              replayPlayerRef.current = player;
              setReplayDuration(player.duration);

              let stars = 1;
              if (assessment.overallScore >= 80 && phys.collisionCount <= 1) stars = 2;
              if (
                assessment.overallScore >= 88 &&
                phys.collisionCount === 0 &&
                timeRemainingRef.current > lvl.timeLimit * 0.25
              ) {
                stars = 3;
              }

              const statsObj: GameStats = {
                levelId: lvl.id,
                stars,
                score: assessment.overallScore,
                timeElapsed: Number(timeElapsedRef.current.toFixed(1)),
                collisions: phys.collisionCount,
                precisionPct: assessment.positionScore,
                angleError: assessment.angleErrorDeg,
              };

              setEndStats(statsObj);
              setSyncedToCloud(false);

              if (daily) {
                leaderboardService.submitDailyScore(statsObj, daily).then((res) => {
                  setSyncedToCloud(res.syncedToCloud);
                  setDailyBestRecord(leaderboardService.getLocalBestDaily(daily.dateKey));
                });
              } else {
                leaderboardService.submitScore(statsObj, lvl, veh).then((res) => {
                  setSyncedToCloud(res.syncedToCloud);
                });
              }

              setGameState('success');
            }

            const sensors = phys.computeSensors(lvl.obstacles);

            hudTimer += dt;
            if (hudTimer >= 0.033) {
              hudTimer = 0;
              setHudState({
                speed: phys.state.speed,
                gear: phys.state.gear,
                steerAngle: phys.state.steerAngle,
                collisionCount: phys.collisionCount,
                timeRemaining: timeRemainingRef.current,
                parkingAssessment: assessment,
                sensors,
              });
            }
          }

          sm.updateCarVisuals(
            phys.state.x,
            phys.state.z,
            phys.state.heading,
            phys.state.steerAngle,
            phys.state.wheelSpin,
            keysRef.current.down || touchInputsRef.current.brake,
            phys.state.gear === 'R'
          );

          sm.updateCamera(
            dt,
            phys.state.x,
            phys.state.z,
            phys.state.heading,
            phys.cameraShake,
            false
          );

          sm.render();
        } else if (currentGameState === 'replay') {
          const player = replayPlayerRef.current;
          if (player) {
            const frame = player.update(dt);
            if (frame) {
              sm.updateCarVisuals(
                frame.x,
                frame.z,
                frame.heading,
                frame.steerAngle,
                frame.wheelSpin,
                frame.isBraking,
                frame.isReverse
              );

              sm.updateReplayCamera(
                dt,
                frame.x,
                frame.z,
                frame.heading,
                player.cameraMode,
                lvl.targetSlot.x,
                lvl.targetSlot.z,
                lvl.targetSlot.rotation
              );

              soundEngine.updateEngine(
                frame.speed / veh.maxSpeed,
                Math.abs(frame.speed) > 0.1 ? 0.75 : 0,
                Math.abs(frame.speed) > 0.05
              );
            }

            hudTimer += dt;
            if (hudTimer >= 0.033) {
              hudTimer = 0;
              setReplayTime(player.currentTime);
              setReplayIsPlaying(player.isPlaying);
            }
          }

          sm.render();
        } else {
          sm.updateCamera(
            dt,
            phys.state.x,
            phys.state.z,
            phys.state.heading,
            phys.cameraShake,
            currentGameState === 'title'
          );
          sm.render();
        }
      }

      if (isSoftware) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftware) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      if (isSoftware) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  // Restart / Retry current run (standard or daily)
  const handleRetry = useCallback(() => {
    const lvl = activeDailyChallenge ? activeDailyChallenge.effectiveLevel : selectedLevel;
    const veh = activeDailyChallenge ? activeDailyChallenge.forcedVehicle : selectedVehicle;

    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(veh, lvl.startPos, lvl.startRot);
      sceneManagerRef.current.loadLevel(lvl, veh);
      timeRemainingRef.current = lvl.timeLimit;
      timeElapsedRef.current = 0;
      setCameraMode(activeDailyChallenge?.forcedCamera || 'chase');
      replayRecorderRef.current.start();
      setGameState('playing');
    }
  }, [activeDailyChallenge, selectedLevel, selectedVehicle]);

  // Next level handler (standard progression)
  const handleNextLevel = useCallback(() => {
    setActiveDailyChallenge(null);
    activeDailyChallengeRef.current = null;
    const nextIdx = (LEVELS.findIndex((l) => l.id === selectedLevel.id) + 1) % LEVELS.length;
    const nextLvl = LEVELS[nextIdx];
    setSelectedLevel(nextLvl);
    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(selectedVehicle, nextLvl.startPos, nextLvl.startRot);
      sceneManagerRef.current.loadLevel(nextLvl, selectedVehicle);
      timeRemainingRef.current = nextLvl.timeLimit;
      timeElapsedRef.current = 0;
      setCameraMode('chase');
      replayRecorderRef.current.start();
      setGameState('playing');
    }
  }, [selectedLevel, selectedVehicle]);

  // Exit back to title screen
  const handleReturnHome = useCallback(() => {
    setActiveDailyChallenge(null);
    activeDailyChallengeRef.current = null;
    setCameraMode('chase');
    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(selectedVehicle, selectedLevel.startPos, selectedLevel.startRot);
      sceneManagerRef.current.loadLevel(selectedLevel, selectedVehicle);
      timeRemainingRef.current = selectedLevel.timeLimit;
      timeElapsedRef.current = 0;
    }
    setGameState('title');
  }, [selectedLevel, selectedVehicle]);

  // Select vehicle from garage
  const handleSelectVehicle = useCallback((v: VehicleConfig) => {
    setSelectedVehicle(v);
    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(v, selectedLevel.startPos, selectedLevel.startRot);
      sceneManagerRef.current.loadLevel(selectedLevel, v);
    }
  }, [selectedLevel]);

  // Select level from menu
  const handleSelectLevel = useCallback((lvl: LevelConfig) => {
    setSelectedLevel(lvl);
    if (physicsRef.current && sceneManagerRef.current) {
      physicsRef.current.reset(selectedVehicle, lvl.startPos, lvl.startRot);
      sceneManagerRef.current.loadLevel(lvl, selectedVehicle);
      timeRemainingRef.current = lvl.timeLimit;
      timeElapsedRef.current = 0;
    }
  }, [selectedVehicle]);

  // Gear Shift
  const handleShiftGear = useCallback((g: Gear) => {
    if (physicsRef.current) {
      physicsRef.current.shiftGear(g);
    }
  }, []);

  // Toggle Camera
  const handleToggleCamera = useCallback(() => {
    if (activeDailyChallengeRef.current?.forcedCamera) return;
    setCameraMode((prev) => {
      const modes: CameraMode[] = ['chase', 'cockpit', 'topdown'];
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      return modes[nextIdx];
    });
  }, []);

  // Toggle Audio Mute
  const handleToggleMute = useCallback(() => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  // Touch / On-screen control buttons
  const handleInputStart = (action: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake') => {
    soundEngine.init();
    touchInputsRef.current[action] = true;
  };

  const handleInputEnd = (action: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake') => {
    touchInputsRef.current[action] = false;
  };

  const handleWatchReplay = useCallback(() => {
    if (replayPlayerRef.current) {
      replayPlayerRef.current.restart();
      setReplayTime(0);
      setReplayIsPlaying(true);
      setGameState('replay');
    }
  }, []);

  const handleSetReplaySpeed = useCallback((mult: number) => {
    if (replayPlayerRef.current) {
      replayPlayerRef.current.setSpeed(mult);
      setReplaySpeed(mult);
    }
  }, []);

  const handleExitReplay = useCallback(() => {
    setGameState('success');
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          selectedVehicle={selectedVehicle}
          selectedLevel={selectedLevel}
          dailyChallenge={dailyChallenge}
          dailyBestRecord={dailyBestRecord}
          onSelectVehicle={handleSelectVehicle}
          onSelectLevel={handleSelectLevel}
          onStartGame={handleStartGame}
          onStartDailyChallenge={handleStartDailyChallenge}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenLeaderboard={() => {
            setLeaderboardInitialMode('standard');
            setLeaderboardInitialLevel(selectedLevel.id);
            setShowLeaderboard(true);
          }}
          onOpenDailyLeaderboard={() => {
            setLeaderboardInitialMode('daily');
            setShowLeaderboard(true);
          }}
        />
      )}

      {/* Active Game HUD (Playing & Paused) */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          level={activeLevel}
          vehicle={activeVehicle}
          dailyChallenge={activeDailyChallenge}
          speed={hudState.speed}
          gear={hudState.gear}
          steerAngle={hudState.steerAngle}
          collisionCount={hudState.collisionCount}
          timeRemaining={hudState.timeRemaining}
          parkingAssessment={hudState.parkingAssessment}
          sensors={hudState.sensors}
          cameraMode={cameraMode}
          isMuted={isMuted}
          onShiftGear={handleShiftGear}
          onToggleCamera={handleToggleCamera}
          onToggleMute={handleToggleMute}
          onPause={() => setGameState('paused')}
          onInputStart={handleInputStart}
          onInputEnd={handleInputEnd}
        />
      )}

      {/* Cinematic Replay Mode Overlay */}
      {gameState === 'replay' && (
        <ReplayOverlay
          level={activeLevel}
          vehicle={activeVehicle}
          stats={endStats}
          currentTime={replayTime}
          duration={replayDuration}
          isPlaying={replayIsPlaying}
          speedMultiplier={replaySpeed}
          cameraMode={replayCameraMode}
          onTogglePlay={handleToggleReplayPlay}
          onSeek={handleSeekReplay}
          onRestart={handleRestartReplay}
          onSetSpeed={handleSetReplaySpeed}
          onSetCameraMode={handleSetReplayCamera}
          onExitReplay={handleExitReplay}
          onNextLevel={activeDailyChallenge ? handleReturnHome : handleNextLevel}
          onRetry={handleRetry}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          level={activeLevel}
          dailyChallenge={activeDailyChallenge}
          onResume={() => setGameState('playing')}
          onRetry={handleRetry}
          onHome={handleReturnHome}
        />
      )}

      {/* Victory / Park Accomplished Modal */}
      {gameState === 'success' && (
        <VictoryModal
          stats={endStats}
          level={activeLevel}
          vehicle={activeVehicle}
          dailyChallenge={activeDailyChallenge}
          syncedToCloud={syncedToCloud}
          onNextLevel={handleNextLevel}
          onRetry={handleRetry}
          onHome={handleReturnHome}
          onWatchReplay={handleWatchReplay}
          onViewLeaderboard={() => {
            setLeaderboardInitialMode(activeDailyChallenge ? 'daily' : 'standard');
            setLeaderboardInitialLevel(activeLevel.id);
            setShowLeaderboard(true);
          }}
        />
      )}

      {/* Failed Modal */}
      {gameState === 'failed' && (
        <FailedModal
          reason={failReason}
          level={activeLevel}
          dailyChallenge={activeDailyChallenge}
          onRetry={handleRetry}
          onHome={handleReturnHome}
        />
      )}

      {/* Global Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          initialLevelId={leaderboardInitialLevel}
          initialMode={leaderboardInitialMode}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </main>
  );
}
