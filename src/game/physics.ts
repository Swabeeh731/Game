import * as THREE from 'three';
import { Gear, VehicleConfig, Obstacle, ParkingSlot, ParkingAssessment, SensorReading } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export interface VehicleState {
  x: number;
  z: number;
  heading: number; // yaw in radians
  speed: number; // m/s (positive = forward, negative = reverse)
  steerAngle: number; // radians
  targetSteerAngle: number;
  gear: Gear;
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  handbrake: boolean;
  wheelSpin: number; // accumulated rotation in radians
  collisionCooldown: number;
}

export interface CollisionEvent {
  hit: boolean;
  intensity: number;
  obstacleId?: string;
  obstacleType?: string;
}

// 2D Box for SAT collision
interface Box2D {
  center: [number, number];
  halfExtents: [number, number];
  rotation: number;
}

/**
 * 2D Separating Axis Theorem (SAT) intersection between two rotated rectangles
 */
function testOBBCollision(boxA: Box2D, boxB: Box2D): boolean {
  const cornersA = getCorners(boxA);
  const cornersB = getCorners(boxB);

  const axes = [
    [Math.cos(boxA.rotation), Math.sin(boxA.rotation)],
    [-Math.sin(boxA.rotation), Math.cos(boxA.rotation)],
    [Math.cos(boxB.rotation), Math.sin(boxB.rotation)],
    [-Math.sin(boxB.rotation), Math.cos(boxB.rotation)],
  ];

  for (const [ax, ay] of axes) {
    let minA = Infinity, maxA = -Infinity;
    for (const [cx, cy] of cornersA) {
      const proj = cx * ax + cy * ay;
      if (proj < minA) minA = proj;
      if (proj > maxA) maxA = proj;
    }

    let minB = Infinity, maxB = -Infinity;
    for (const [cx, cy] of cornersB) {
      const proj = cx * ax + cy * ay;
      if (proj < minB) minB = proj;
      if (proj > maxB) maxB = proj;
    }

    if (maxA < minB || maxB < minA) {
      return false; // Separating axis found
    }
  }

  return true;
}

function getCorners(box: Box2D): [number, number][] {
  const { center, halfExtents, rotation } = box;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = halfExtents[0];
  const dz = halfExtents[1];

  const offsets = [
    [-dx, -dz],
    [dx, -dz],
    [dx, dz],
    [-dx, dz],
  ];

  return offsets.map(([ox, oz]) => {
    return [
      center[0] + ox * cos - oz * sin,
      center[1] + ox * sin + oz * cos,
    ];
  });
}

/**
 * Vehicle Simulation Controller
 */
export class VehiclePhysics {
  public state: VehicleState;
  public config: VehicleConfig;
  public collisionCount: number = 0;
  public cameraShake: number = 0;
  public holdTimer: number = 0;

  constructor(config: VehicleConfig, startPos: [number, number, number], startRot: number) {
    this.config = config;
    this.state = {
      x: startPos[0],
      z: startPos[2],
      heading: startRot,
      speed: 0,
      steerAngle: 0,
      targetSteerAngle: 0,
      gear: 'D',
      throttle: 0,
      brake: 0,
      handbrake: false,
      wheelSpin: 0,
      collisionCooldown: 0,
    };
  }

  public reset(config: VehicleConfig, startPos: [number, number, number], startRot: number) {
    this.config = config;
    this.state.x = startPos[0];
    this.state.z = startPos[2];
    this.state.heading = startRot;
    this.state.speed = 0;
    this.state.steerAngle = 0;
    this.state.targetSteerAngle = 0;
    this.state.gear = 'D';
    this.state.throttle = 0;
    this.state.brake = 0;
    this.state.handbrake = false;
    this.state.wheelSpin = 0;
    this.state.collisionCooldown = 0;
    this.collisionCount = 0;
    this.cameraShake = 0;
    this.holdTimer = 0;
  }

  public update(
    dt: number,
    inputs: { throttle: number; brake: number; steer: number; handbrake: boolean },
    obstacles: Obstacle[]
  ): CollisionEvent {
    const s = this.state;
    const cfg = this.config;

    // Decay camera shake
    this.cameraShake = Math.max(0, this.cameraShake - dt * 3.5);

    if (s.collisionCooldown > 0) {
      s.collisionCooldown -= dt;
    }

    // Steering input interpolation
    s.targetSteerAngle = inputs.steer * cfg.maxSteerAngle;
    const steerSpeed = 6.0; // rad/s
    s.steerAngle += (s.targetSteerAngle - s.steerAngle) * Math.min(1.0, dt * steerSpeed);

    s.throttle = inputs.throttle;
    s.brake = inputs.brake;
    s.handbrake = inputs.handbrake;

    // Acceleration & Braking based on Gear
    let targetAccel = 0;

    if (s.gear === 'P') {
      // Park locks wheels
      s.speed *= Math.max(0, 1 - dt * 15);
      if (Math.abs(s.speed) < 0.05) s.speed = 0;
    } else if (s.gear === 'N') {
      // Neutral rolls with air resistance and light friction
      s.speed *= Math.max(0, 1 - dt * 0.8);
      if (inputs.brake > 0) {
        const brakeForce = inputs.brake * cfg.braking * dt;
        if (s.speed > 0) s.speed = Math.max(0, s.speed - brakeForce);
        else s.speed = Math.min(0, s.speed + brakeForce);
      }
    } else if (s.gear === 'D') {
      // Drive forward
      if (inputs.throttle > 0) {
        targetAccel = inputs.throttle * cfg.acceleration;
      }
      if (inputs.brake > 0) {
        targetAccel -= inputs.brake * cfg.braking;
      }
      // Natural engine braking/idle creep
      if (inputs.throttle === 0 && inputs.brake === 0) {
        if (Math.abs(s.speed) > 0.01) {
          s.speed *= Math.max(0, 1 - dt * 1.5);
        }
      }
      s.speed += targetAccel * dt;
      s.speed = Math.min(cfg.maxSpeed, Math.max(-1.5, s.speed));
    } else if (s.gear === 'R') {
      // Reverse
      if (inputs.throttle > 0) {
        targetAccel = -inputs.throttle * (cfg.acceleration * 0.7);
      }
      if (inputs.brake > 0) {
        targetAccel += inputs.brake * cfg.braking;
      }
      if (inputs.throttle === 0 && inputs.brake === 0) {
        if (Math.abs(s.speed) > 0.01) {
          s.speed *= Math.max(0, 1 - dt * 1.5);
        }
      }
      s.speed += targetAccel * dt;
      s.speed = Math.max(-cfg.reverseSpeed, Math.min(1.5, s.speed));
    }

    // Handbrake
    if (inputs.handbrake) {
      s.speed *= Math.max(0, 1 - dt * 18);
      soundEngine.playTireSqueal(0.8);
    }

    // Minimum deadband
    if (Math.abs(s.speed) < 0.005) s.speed = 0;

    // Ackermann Kinematics
    // Heading rate of turn = (speed / wheelbase) * tan(steerAngle)
    const turnRate = (s.speed / cfg.wheelBase) * Math.tan(s.steerAngle);
    s.heading += turnRate * dt;

    // Movement forward/backward in heading direction
    // In Three.js, positive Z is facing forward if aligned, but let's define heading 0 as +Z forward
    const dx = Math.sin(s.heading) * s.speed * dt;
    const dz = Math.cos(s.heading) * s.speed * dt;

    const prevX = s.x;
    const prevZ = s.z;

    s.x += dx;
    s.z += dz;

    // Accumulate wheel spin rotation
    const wheelRadius = 0.35;
    s.wheelSpin += (s.speed * dt) / wheelRadius;

    // Update sound engine
    soundEngine.updateEngine(s.speed / cfg.maxSpeed, s.throttle, Math.abs(s.speed) > 0.05);

    // Collision Check against obstacles
    const carBox: Box2D = {
      center: [s.x, s.z],
      halfExtents: [cfg.width / 2, cfg.length / 2],
      rotation: s.heading,
    };

    let collisionEvent: CollisionEvent = { hit: false, intensity: 0 };

    for (const obs of obstacles) {
      const obsBox: Box2D = {
        center: [obs.x, obs.z],
        halfExtents: [obs.width / 2, obs.length / 2],
        rotation: obs.rotation,
      };

      if (testOBBCollision(carBox, obsBox)) {
        // Collision detected!
        collisionEvent = {
          hit: true,
          intensity: Math.abs(s.speed),
          obstacleId: obs.id,
          obstacleType: obs.type,
        };

        if (s.collisionCooldown <= 0) {
          this.collisionCount++;
          this.cameraShake = Math.min(0.6, 0.2 + Math.abs(s.speed) * 0.1);
          soundEngine.playCollisionSound(Math.abs(s.speed) + 0.5);
          s.collisionCooldown = 0.6; // cooldown between registered strikes
        }

        // Rebound physics: bounce back and absorb speed
        s.x = prevX - dx * 0.5;
        s.z = prevZ - dz * 0.5;
        s.speed = -s.speed * 0.35;
        break;
      }
    }

    return collisionEvent;
  }

  /**
   * Raycast 6 proximity sonar sensors (Front L, C, R; Rear L, C, R)
   */
  public computeSensors(obstacles: Obstacle[]): SensorReading {
    const s = this.state;
    const cfg = this.config;

    const cos = Math.cos(s.heading);
    const sin = Math.sin(s.heading);

    const halfW = cfg.width * 0.45;
    const halfL = cfg.length * 0.48;

    // Sensor origins on vehicle perimeter
    const sensors = {
      frontCenter: [s.x + halfL * sin, s.z + halfL * cos],
      frontLeft: [s.x + halfL * sin - halfW * cos, s.z + halfL * cos + halfW * sin],
      frontRight: [s.x + halfL * sin + halfW * cos, s.z + halfL * cos - halfW * sin],
      rearCenter: [s.x - halfL * sin, s.z - halfL * cos],
      rearLeft: [s.x - halfL * sin - halfW * cos, s.z - halfL * cos + halfW * sin],
      rearRight: [s.x - halfL * sin + halfW * cos, s.z - halfL * cos - halfW * sin],
    };

    let frontMin = 5.0;
    let rearMin = 5.0;
    let leftMin = 5.0;
    let rightMin = 5.0;

    for (const obs of obstacles) {
      // Distance from center
      const dObs = Math.hypot(obs.x - s.x, obs.z - s.z);
      if (dObs > 10.0) continue; // skip distant obstacles

      // Approximate edge distances
      const approxObsRadius = Math.hypot(obs.width, obs.length) / 2;

      for (const [name, pt] of Object.entries(sensors)) {
        const dist = Math.max(0.05, Math.hypot(obs.x - pt[0], obs.z - pt[1]) - approxObsRadius * 0.7);

        if (name.startsWith('front')) {
          frontMin = Math.min(frontMin, dist);
        } else {
          rearMin = Math.min(rearMin, dist);
        }

        if (name.includes('Left')) {
          leftMin = Math.min(leftMin, dist);
        } else if (name.includes('Right')) {
          rightMin = Math.min(rightMin, dist);
        }
      }
    }

    const minDistance = Math.min(frontMin, rearMin, leftMin, rightMin);
    let closestSector: SensorReading['closestSector'] = 'none';

    if (minDistance < 3.0) {
      if (minDistance === rearMin) closestSector = 'rear';
      else if (minDistance === frontMin) closestSector = 'front';
      else if (minDistance === leftMin) closestSector = 'left';
      else closestSector = 'right';
    }

    // Sound sonar beeper
    const relevantDist = s.gear === 'R' ? rearMin : Math.min(frontMin, rearMin);
    soundEngine.updateParkingSonar(relevantDist, s.gear === 'R');

    return {
      frontMin: Number(frontMin.toFixed(2)),
      rearMin: Number(rearMin.toFixed(2)),
      leftMin: Number(leftMin.toFixed(2)),
      rightMin: Number(rightMin.toFixed(2)),
      closestSector,
      minDistance: Number(minDistance.toFixed(2)),
    };
  }

  /**
   * Assesses parking quality against targetSlot
   */
  public assessParking(slot: ParkingSlot, dt: number): ParkingAssessment {
    const s = this.state;
    const cfg = this.config;

    // Vector from slot center to car center in slot local coordinates
    const dx = s.x - slot.x;
    const dz = s.z - slot.z;

    const cos = Math.cos(-slot.rotation);
    const sin = Math.sin(-slot.rotation);

    const localX = dx * cos - dz * sin; // lateral offset
    const localZ = dx * sin + dz * cos; // longitudinal offset

    const maxLateralTol = (slot.width - cfg.width) / 2 + 0.35;
    const maxLongTol = (slot.length - cfg.length) / 2 + 0.55;

    // Angle alignment
    // Depending on slot requirements, forward or reverse
    let rawAngleDiff = (s.heading - slot.rotation) % (Math.PI * 2);
    while (rawAngleDiff > Math.PI) rawAngleDiff -= Math.PI * 2;
    while (rawAngleDiff < -Math.PI) rawAngleDiff += Math.PI * 2;

    let angleDiff = Math.abs(rawAngleDiff);
    // If standard bay allows forward or reverse
    if (slot.type === 'standard' || slot.type === 'angled') {
      const altDiff = Math.abs(Math.abs(rawAngleDiff) - Math.PI);
      angleDiff = Math.min(angleDiff, altDiff);
    }

    const angleErrorDeg = (angleDiff * 180) / Math.PI;

    // Scoring
    const latScore = Math.max(0, 100 - (Math.abs(localX) / 0.5) * 80);
    const depthScore = Math.max(0, 100 - (Math.abs(localZ) / 0.8) * 80);
    const angleScore = Math.max(0, 100 - (angleErrorDeg / 10) * 80);

    const positionScore = (latScore + depthScore) / 2;
    const overallScore = Math.round(positionScore * 0.6 + angleScore * 0.4);

    const inZone =
      Math.abs(localX) < maxLateralTol &&
      Math.abs(localZ) < maxLongTol &&
      angleErrorDeg < 14;

    const isStopped = Math.abs(s.speed) < 0.08;
    const isStable = inZone && isStopped;

    const holdRequired = 1.5; // seconds to hold park

    if (isStable) {
      this.holdTimer += dt;
    } else {
      this.holdTimer = Math.max(0, this.holdTimer - dt * 2.0);
    }

    return {
      inZone,
      positionScore: Math.round(positionScore),
      angleScore: Math.round(angleScore),
      angleErrorDeg: Number(angleErrorDeg.toFixed(1)),
      depthScore: Math.round(depthScore),
      overallScore,
      isStable,
      holdTime: Number(this.holdTimer.toFixed(1)),
      holdRequired,
      isPerfect: overallScore >= 90 && angleErrorDeg <= 3.0,
    };
  }

  public shiftGear(newGear: Gear) {
    if (this.state.gear !== newGear) {
      this.state.gear = newGear;
      soundEngine.playGearShift();
    }
  }
}
