import { LevelConfig } from '../types/game';

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: 'Plaza Bay Parking',
    subtitle: 'Standard 90° Forward Stall',
    type: 'Bay',
    difficulty: 'Beginner',
    description: 'Drive forward smoothly into the marked green parking bay. Straighten your wheels and stop inside the zone.',
    advice: 'Line up your vehicle ahead of the bay before turning in. Watch the parking radar guide bars on your dashboard.',
    timeLimit: 75,
    maxCollisions: 3,
    startPos: [0, 0, -18],
    startRot: 0,
    targetSlot: {
      id: 'slot_1',
      x: 0,
      z: 7,
      width: 2.8,
      length: 5.4,
      rotation: 0,
      bayNumber: 'A-01',
      type: 'standard',
    },
    obstacles: [
      // Traffic guidance cones marking the entrance
      { id: 'c1', type: 'cone', x: -3.2, z: 2, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'c2', type: 'cone', x: 3.2, z: 2, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'c3', type: 'cone', x: -3.2, z: 7, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'c4', type: 'cone', x: 3.2, z: 7, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      // Wheel stop at the back of the stall
      { id: 'ws1', type: 'wheelstop', x: 0, z: 9.3, width: 2.2, length: 0.35, height: 0.16, rotation: 0 },
      // Curbs on left and right
      { id: 'curb_l', type: 'curb', x: -7.0, z: 5, width: 0.4, length: 22, height: 0.25, rotation: 0 },
      { id: 'curb_r', type: 'curb', x: 7.0, z: 5, width: 0.4, length: 22, height: 0.25, rotation: 0 },
      // Decorative light poles
      { id: 'lp1', type: 'lamp', x: -6.5, z: -10, width: 0.4, length: 0.4, height: 5.5, rotation: 0 },
      { id: 'lp2', type: 'lamp', x: 6.5, z: 12, width: 0.4, length: 0.4, height: 5.5, rotation: 0 },
    ],
    environment: {
      groundSize: [60, 60],
      skyTime: 'day',
      ambientIntensity: 0.7,
      sunIntensity: 1.4,
      fogDensity: 0.008,
    },
  },
  {
    id: 2,
    title: 'Reverse Bay Maneuver',
    subtitle: 'Backing In Between Parked Cars',
    type: 'Reverse',
    difficulty: 'Intermediate',
    description: 'Reverse into the marked slot between two parked luxury cars. Press R to shift into Reverse and listen for the proximity beeper.',
    advice: 'Drive past the slot, steer sharply as you reverse, and check your side mirrors or top-down camera (C key).',
    timeLimit: 85,
    maxCollisions: 3,
    startPos: [0, 0, -14],
    startRot: 0,
    targetSlot: {
      id: 'slot_2',
      x: 0,
      z: 6.5,
      width: 2.7,
      length: 5.2,
      rotation: Math.PI, // Facing backward
      bayNumber: 'B-12',
      type: 'standard',
    },
    obstacles: [
      // Left parked civilian car
      { id: 'parked_left', type: 'car', x: -3.2, z: 6.5, width: 2.1, length: 4.8, height: 1.4, rotation: 0, color: '#3b82f6', carModel: 'sedan' },
      // Right parked civilian car
      { id: 'parked_right', type: 'car', x: 3.2, z: 6.5, width: 2.2, length: 4.9, height: 1.6, rotation: 0, color: '#64748b', carModel: 'suv' },
      // Back curb wall
      { id: 'back_wall', type: 'curb', x: 0, z: 10.2, width: 14, length: 0.5, height: 0.35, rotation: 0 },
      // Wheel stop
      { id: 'ws2', type: 'wheelstop', x: 0, z: 8.8, width: 2.2, length: 0.35, height: 0.16, rotation: 0 },
      // Cones at lane edge
      { id: 'c_lane1', type: 'cone', x: -6, z: -4, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'c_lane2', type: 'cone', x: 6, z: -4, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
    ],
    environment: {
      groundSize: [60, 60],
      skyTime: 'sunset',
      ambientIntensity: 0.6,
      sunIntensity: 1.2,
      fogDensity: 0.009,
    },
  },
  {
    id: 3,
    title: 'Metropolitan Parallel',
    subtitle: 'Street Curb Parallel Parking',
    type: 'Parallel',
    difficulty: 'Advanced',
    description: 'Perform an authentic parallel parking maneuver along the curb between a parked SUV and sedan.',
    advice: 'Pull up beside the front car, shift into reverse, cut the wheel 45°, back up until your front clears, then counter-steer.',
    timeLimit: 90,
    maxCollisions: 3,
    startPos: [-3.5, 0, -12],
    startRot: 0,
    targetSlot: {
      id: 'slot_3',
      x: 3.0,
      z: 2.5,
      width: 2.6,
      length: 6.8,
      rotation: 0,
      bayNumber: 'ST-07',
      type: 'parallel',
    },
    obstacles: [
      // Sidewalk curb along right side
      { id: 'sidewalk_curb', type: 'curb', x: 5.2, z: 0, width: 0.6, length: 34, height: 0.28, rotation: 0 },
      // Road divider curb along left side
      { id: 'left_curb', type: 'curb', x: -7.5, z: 0, width: 0.6, length: 34, height: 0.28, rotation: 0 },
      // Front parked car
      { id: 'front_car', type: 'car', x: 3.0, z: 8.5, width: 2.1, length: 4.7, height: 1.45, rotation: 0, color: '#ef4444', carModel: 'sedan' },
      // Rear parked car
      { id: 'rear_car', type: 'car', x: 3.0, z: -3.8, width: 2.2, length: 4.9, height: 1.7, rotation: 0, color: '#10b981', carModel: 'suv' },
      // Street lights along sidewalk
      { id: 'lamp_st1', type: 'lamp', x: 5.8, z: -8, width: 0.4, length: 0.4, height: 5.5, rotation: 0 },
      { id: 'lamp_st2', type: 'lamp', x: 5.8, z: 12, width: 0.4, length: 0.4, height: 5.5, rotation: 0 },
    ],
    environment: {
      groundSize: [60, 60],
      skyTime: 'sunset',
      ambientIntensity: 0.65,
      sunIntensity: 1.25,
      fogDensity: 0.007,
    },
  },
  {
    id: 4,
    title: 'Multi-Storey Slalom',
    subtitle: 'Concrete Pillars & 45° Angle Bay',
    type: 'Slalom',
    difficulty: 'Advanced',
    description: 'Navigate through structural concrete pillars and park into a diagonal angled bay with tight clearances.',
    advice: 'Watch your rear overhang around concrete pillars. Angled parking is best entered in one continuous smooth sweep.',
    timeLimit: 95,
    maxCollisions: 3,
    startPos: [-9, 0, -18],
    startRot: 0,
    targetSlot: {
      id: 'slot_4',
      x: 4.5,
      z: 5.0,
      width: 2.8,
      length: 5.5,
      rotation: Math.PI / 4, // 45 degrees
      bayNumber: 'P2-44',
      type: 'angled',
    },
    obstacles: [
      // Concrete structural pillars with yellow warning tape
      { id: 'pillar_1', type: 'pillar', x: -4.0, z: -10, width: 1.0, length: 1.0, height: 4.2, rotation: 0 },
      { id: 'pillar_2', type: 'pillar', x: -4.0, z: 0, width: 1.0, length: 1.0, height: 4.2, rotation: 0 },
      { id: 'pillar_3', type: 'pillar', x: -4.0, z: 10, width: 1.0, length: 1.0, height: 4.2, rotation: 0 },
      { id: 'pillar_4', type: 'pillar', x: 4.0, z: -10, width: 1.0, length: 1.0, height: 4.2, rotation: 0 },
      // Adjacent parked car in slot P2-43
      { id: 'adj_car', type: 'car', x: 8.5, z: 8.5, width: 2.1, length: 4.8, height: 1.45, rotation: Math.PI / 4, color: '#f59e0b', carModel: 'sedan' },
      // Wheel stop
      { id: 'ws4', type: 'wheelstop', x: 6.4, z: 6.9, width: 2.2, length: 0.35, height: 0.16, rotation: Math.PI / 4 },
      // Barrier rails
      { id: 'bar1', type: 'barrier', x: 10, z: -3, width: 0.3, length: 12, height: 1.0, rotation: 0 },
      { id: 'bar2', type: 'barrier', x: -11, z: 0, width: 0.3, length: 24, height: 1.0, rotation: 0 },
    ],
    environment: {
      groundSize: [60, 60],
      skyTime: 'day',
      ambientIntensity: 0.55,
      sunIntensity: 0.9,
      fogDensity: 0.012,
    },
  },
  {
    id: 5,
    title: 'Rooftop Helipad Deck',
    subtitle: 'Night Floodlit Precision Circuit',
    type: 'Rooftop',
    difficulty: 'Master',
    description: 'High above the skyline, navigate tight perimeter fences and safety cones to park on the rooftop executive deck.',
    advice: 'Use the 90° Bird-Eye camera view (C key) if distance perception is tricky in the dark.',
    timeLimit: 100,
    maxCollisions: 2,
    startPos: [-12, 0, -14],
    startRot: Math.PI / 2,
    targetSlot: {
      id: 'slot_5',
      x: 0,
      z: 8.5,
      width: 2.9,
      length: 5.6,
      rotation: 0,
      bayNumber: 'ROOF-X',
      type: 'vip',
    },
    obstacles: [
      // Rooftop perimeter barriers
      { id: 'rf_bar_n', type: 'barrier', x: 0, z: 15, width: 30, length: 0.4, height: 1.3, rotation: 0 },
      { id: 'rf_bar_s', type: 'barrier', x: 0, z: -20, width: 30, length: 0.4, height: 1.3, rotation: 0 },
      { id: 'rf_bar_e', type: 'barrier', x: 15, z: -2.5, width: 0.4, length: 35, height: 1.3, rotation: 0 },
      { id: 'rf_bar_w', type: 'barrier', x: -15, z: -2.5, width: 0.4, length: 35, height: 1.3, rotation: 0 },
      // Slalom cones
      { id: 'c_rf1', type: 'cone', x: -5, z: -8, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'c_rf2', type: 'cone', x: 2, z: -3, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'c_rf3', type: 'cone', x: -4, z: 2, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      // Left and right bay parked vehicles
      { id: 'rf_car1', type: 'car', x: -3.5, z: 8.5, width: 2.1, length: 4.8, height: 1.4, rotation: 0, color: '#8b5cf6', carModel: 'sedan' },
      { id: 'rf_car2', type: 'car', x: 3.5, z: 8.5, width: 2.2, length: 5.0, height: 1.7, rotation: 0, color: '#0284c7', carModel: 'suv' },
      // Wheel stop
      { id: 'rf_ws', type: 'wheelstop', x: 0, z: 11.2, width: 2.2, length: 0.35, height: 0.16, rotation: 0 },
    ],
    environment: {
      groundSize: [65, 65],
      skyTime: 'night',
      ambientIntensity: 0.35,
      sunIntensity: 0.4,
      fogDensity: 0.015,
    },
  },
  {
    id: 6,
    title: 'The Valet VIP Suite',
    subtitle: 'Zero-Tolerance Flawless Park',
    type: 'VIP',
    difficulty: 'Master',
    description: 'The ultimate parking challenge. Reverse park into the narrow velvet-rope VIP stall between multi-million dollar hypercars. Zero collisions allowed!',
    advice: 'Micro-corrections only. Take your time and keep your steering straight once you align the rear wheels.',
    timeLimit: 110,
    maxCollisions: 1,
    startPos: [8, 0, -16],
    startRot: Math.PI,
    targetSlot: {
      id: 'slot_6',
      x: -2.0,
      z: 7.0,
      width: 2.65,
      length: 5.3,
      rotation: Math.PI, // Reverse in
      bayNumber: 'VIP-01',
      type: 'vip',
    },
    obstacles: [
      // Left exotic hypercar
      { id: 'vip_car_l', type: 'car', x: -5.1, z: 7.0, width: 2.15, length: 4.9, height: 1.25, rotation: 0, color: '#dc2626', carModel: 'sedan' },
      // Right exotic hypercar
      { id: 'vip_car_r', type: 'car', x: 1.1, z: 7.0, width: 2.15, length: 4.9, height: 1.25, rotation: 0, color: '#eab308', carModel: 'sedan' },
      // Bollards / stanchions
      { id: 'bol1', type: 'pillar', x: -6.8, z: 3.8, width: 0.3, length: 0.3, height: 1.0, rotation: 0 },
      { id: 'bol2', type: 'pillar', x: 2.8, z: 3.8, width: 0.3, length: 0.3, height: 1.0, rotation: 0 },
      // Back wall
      { id: 'vip_wall', type: 'wall', x: -2.0, z: 10.5, width: 12, length: 0.6, height: 3.0, rotation: 0 },
      { id: 'ws_vip', type: 'wheelstop', x: -2.0, z: 9.3, width: 2.2, length: 0.35, height: 0.16, rotation: 0 },
      // Chicane cones
      { id: 'chicane1', type: 'cone', x: 3, z: -5, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
      { id: 'chicane2', type: 'cone', x: -4, z: -9, width: 0.45, length: 0.45, height: 0.75, rotation: 0 },
    ],
    environment: {
      groundSize: [60, 60],
      skyTime: 'sunset',
      ambientIntensity: 0.6,
      sunIntensity: 1.2,
      fogDensity: 0.008,
    },
  },
];
