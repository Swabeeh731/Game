import * as THREE from 'three';
import { VehicleConfig, Obstacle, ParkingSlot } from '../types/game';

/**
 * Procedural Texture Generator
 * Generates asphalt, road markings, parking box stripes, and warning chevrons on dynamic canvases.
 */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, 512, 512);

  // Micro gravel noise
  for (let i = 0; i < 35000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = 35 + Math.random() * 40;
    ctx.fillStyle = `rgb(${brightness}, ${brightness + 2}, ${brightness + 4})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Subtle aggregate speckles
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(200,200,200,0.15)' : 'rgba(10,10,10,0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates texture for traffic cones with reflective white bands
 */
export function createTrafficConeMaterial(): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // High-vis fluorescent orange
  ctx.fillStyle = '#ff5500';
  ctx.fillRect(0, 0, 128, 256);

  // White retroreflective band across middle
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 90, 128, 55);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.35,
    metalness: 0.05,
  });
}

/**
 * Creates hazard stripes texture for concrete pillars and wheel stops
 */
export function createHazardStripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Yellow and black diagonal caution stripes
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#18181b';
  for (let i = -64; i < 320; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 16 - 32, 64);
    ctx.lineTo(i - 32, 64);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Contact Shadow Texture (Soft radial drop shadow under car)
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(128, 256, 40, 128, 256, 220);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
  gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 512);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export interface CarMeshes {
  group: THREE.Group;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  brakeLights: THREE.Mesh[];
  reverseLights: THREE.Mesh[];
  headlights: THREE.Mesh[];
}

/**
 * Composite 3D Car Model Builder (10+ distinct parts)
 * Complies strictly with Three.js skill composite object standard:
 * - Primary silhouette: lower hull/chassis, sculpted car body
 * - Secondary read: cabin & tinted glass, wheels & brake rotors
 * - Accent detail: headlights, brake lights, reverse lights, grille, side mirrors, spoiler, exhaust
 * - Root pivot at ground level (y=0)
 */
export function buildCompositeCar(config: VehicleConfig): CarMeshes {
  const group = new THREE.Group();
  group.name = `car_${config.id}`;

  const { length, width, height, wheelBase, trackWidth, color, accentColor, rimColor } = config;

  // Materials
  const carPaintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });

  const cabinGlassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x0a1017),
    metalness: 0.95,
    roughness: 0.08,
    transparent: true,
    opacity: 0.88,
  });

  const chassisDarkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x18181b),
    metalness: 0.3,
    roughness: 0.8,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xeeeeee),
    metalness: 0.95,
    roughness: 0.1,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0xccddff),
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xaa1111),
    emissive: new THREE.Color(0xff1111),
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xdddddd),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.0,
    roughness: 0.2,
  });

  // 1. Lower Chassis base
  const chassisGeom = new THREE.BoxGeometry(width * 0.92, 0.25, length * 0.94);
  const chassisMesh = new THREE.Mesh(chassisGeom, chassisDarkMat);
  chassisMesh.position.y = 0.28;
  chassisMesh.castShadow = true;
  group.add(chassisMesh);

  // 2. Main Car Body (Extruded/layered sculpted profile)
  const bodyHeight = height * 0.45;
  const bodyGeom = new THREE.BoxGeometry(width, bodyHeight, length);
  const bodyMesh = new THREE.Mesh(bodyGeom, carPaintMat);
  bodyMesh.position.y = 0.28 + bodyHeight / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 3. Front Bumper / Aero splitter
  const splitterGeom = new THREE.BoxGeometry(width * 0.96, 0.14, 0.35);
  const splitterMesh = new THREE.Mesh(splitterGeom, chassisDarkMat);
  splitterMesh.position.set(0, 0.18, length / 2 + 0.12);
  splitterMesh.castShadow = true;
  group.add(splitterMesh);

  // 4. Front Radiator Grille
  const grilleGeom = new THREE.BoxGeometry(width * 0.55, 0.2, 0.08);
  const grilleMesh = new THREE.Mesh(grilleGeom, chassisDarkMat);
  grilleMesh.position.set(0, 0.42, length / 2 + 0.02);
  group.add(grilleMesh);

  // 5. Cabin & Roof (Secondary read)
  const cabinWidth = width * 0.82;
  const cabinHeight = height * 0.52;
  const cabinLength = length * 0.52;
  const cabinGeom = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const cabinMesh = new THREE.Mesh(cabinGeom, cabinGlassMat);
  // Position cabin slightly toward the rear
  cabinMesh.position.set(0, 0.28 + bodyHeight + cabinHeight / 2 - 0.05, -length * 0.06);
  cabinMesh.castShadow = true;
  group.add(cabinMesh);

  // Roof cap
  const roofGeom = new THREE.BoxGeometry(cabinWidth * 0.95, 0.08, cabinLength * 0.85);
  const roofMesh = new THREE.Mesh(roofGeom, carPaintMat);
  roofMesh.position.set(0, cabinMesh.position.y + cabinHeight / 2 + 0.02, -length * 0.06);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // 6. Side Mirrors (Left & Right)
  const mirrorGeom = new THREE.BoxGeometry(0.24, 0.12, 0.16);
  const mirrorLeft = new THREE.Mesh(mirrorGeom, carPaintMat);
  mirrorLeft.position.set(-width / 2 - 0.1, bodyMesh.position.y + bodyHeight * 0.4, length * 0.12);
  group.add(mirrorLeft);

  const mirrorRight = new THREE.Mesh(mirrorGeom, carPaintMat);
  mirrorRight.position.set(width / 2 + 0.1, bodyMesh.position.y + bodyHeight * 0.4, length * 0.12);
  group.add(mirrorRight);

  // 7. Headlights (Accent details)
  const headlightGeom = new THREE.BoxGeometry(0.36, 0.14, 0.08);
  const hlLeft = new THREE.Mesh(headlightGeom, headlightMat);
  hlLeft.position.set(-width * 0.36, bodyMesh.position.y + 0.08, length / 2 + 0.01);
  group.add(hlLeft);

  const hlRight = new THREE.Mesh(headlightGeom, headlightMat);
  hlRight.position.set(width * 0.36, bodyMesh.position.y + 0.08, length / 2 + 0.01);
  group.add(hlRight);

  // 8. Taillights & Reverse Lights (Accent details)
  const taillightGeom = new THREE.BoxGeometry(0.38, 0.14, 0.08);
  const tlLeft = new THREE.Mesh(taillightGeom, brakeLightMat);
  tlLeft.position.set(-width * 0.36, bodyMesh.position.y + 0.08, -length / 2 - 0.01);
  group.add(tlLeft);

  const tlRight = new THREE.Mesh(taillightGeom, brakeLightMat);
  tlRight.position.set(width * 0.36, bodyMesh.position.y + 0.08, -length / 2 - 0.01);
  group.add(tlRight);

  // Reverse lights (clear white strip)
  const revGeom = new THREE.BoxGeometry(0.18, 0.08, 0.08);
  const revLeft = new THREE.Mesh(revGeom, reverseLightMat);
  revLeft.position.set(-width * 0.18, bodyMesh.position.y + 0.08, -length / 2 - 0.01);
  group.add(revLeft);

  const revRight = new THREE.Mesh(revGeom, reverseLightMat);
  revRight.position.set(width * 0.18, bodyMesh.position.y + 0.08, -length / 2 - 0.01);
  group.add(revRight);

  // 9. Rear Exhaust Tips
  const exhaustGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
  exhaustGeom.rotateX(Math.PI / 2);
  const exhaustL = new THREE.Mesh(exhaustGeom, chromeMat);
  exhaustL.position.set(-width * 0.3, 0.22, -length / 2 - 0.08);
  group.add(exhaustL);

  const exhaustR = new THREE.Mesh(exhaustGeom, chromeMat);
  exhaustR.position.set(width * 0.3, 0.22, -length / 2 - 0.08);
  group.add(exhaustR);

  // 10. Rear Spoiler (if sport/supercar)
  if (config.id === 'apex_gt' || config.id === 'spectre') {
    const spoilerGeom = new THREE.BoxGeometry(width * 0.88, 0.06, 0.32);
    const spoiler = new THREE.Mesh(spoilerGeom, carPaintMat);
    spoiler.position.set(0, bodyMesh.position.y + bodyHeight / 2 + 0.25, -length / 2 + 0.2);
    group.add(spoiler);

    // Stanchions
    const stanGeom = new THREE.BoxGeometry(0.06, 0.24, 0.12);
    const stanL = new THREE.Mesh(stanGeom, chassisDarkMat);
    stanL.position.set(-width * 0.3, bodyMesh.position.y + bodyHeight / 2 + 0.12, -length / 2 + 0.2);
    group.add(stanL);

    const stanR = new THREE.Mesh(stanGeom, chassisDarkMat);
    stanR.position.set(width * 0.3, bodyMesh.position.y + bodyHeight / 2 + 0.12, -length / 2 + 0.2);
    group.add(stanR);
  }

  // 11. Soft Contact Shadow Plane Grounding
  const shadowPlaneGeom = new THREE.PlaneGeometry(width * 1.35, length * 1.25);
  shadowPlaneGeom.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowMat);
  shadowPlane.position.y = 0.02; // prevent z-fighting
  group.add(shadowPlane);

  // 12. Four Detailed Wheels with Alloy Rims, Calipers & Rubber Tires
  const wheelRadius = 0.35;
  const wheelThickness = 0.26;

  function createDetailedWheel(isLeft: boolean): THREE.Group {
    const wheelGroup = new THREE.Group();

    // Tire
    const tireGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 24);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const tireMesh = new THREE.Mesh(tireGeom, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Alloy Rim
    const rimGeom = new THREE.CylinderGeometry(wheelRadius * 0.68, wheelRadius * 0.68, wheelThickness + 0.01, 16);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor),
      metalness: 0.9,
      roughness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeom, rimMat);
    wheelGroup.add(rimMesh);

    // Brake Rotor Disc
    const rotorGeom = new THREE.CylinderGeometry(wheelRadius * 0.52, wheelRadius * 0.52, 0.04, 16);
    rotorGeom.rotateZ(Math.PI / 2);
    const rotorMesh = new THREE.Mesh(rotorGeom, chromeMat);
    wheelGroup.add(rotorMesh);

    // Red Brake Caliper
    const caliperGeom = new THREE.BoxGeometry(0.08, 0.14, 0.12);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.7,
      roughness: 0.3,
    });
    const caliperMesh = new THREE.Mesh(caliperGeom, caliperMat);
    caliperMesh.position.set(isLeft ? 0.06 : -0.06, wheelRadius * 0.3, 0);
    wheelGroup.add(caliperMesh);

    return wheelGroup;
  }

  // Wheel mounts
  const halfWheelBase = wheelBase / 2;
  const halfTrack = trackWidth / 2;

  const frontLeftWheel = createDetailedWheel(true);
  frontLeftWheel.position.set(-halfTrack, wheelRadius, halfWheelBase);
  group.add(frontLeftWheel);

  const frontRightWheel = createDetailedWheel(false);
  frontRightWheel.position.set(halfTrack, wheelRadius, halfWheelBase);
  group.add(frontRightWheel);

  const rearLeftWheel = createDetailedWheel(true);
  rearLeftWheel.position.set(-halfTrack, wheelRadius, -halfWheelBase);
  group.add(rearLeftWheel);

  const rearRightWheel = createDetailedWheel(false);
  rearRightWheel.position.set(halfTrack, wheelRadius, -halfWheelBase);
  group.add(rearRightWheel);

  return {
    group,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    brakeLights: [tlLeft, tlRight],
    reverseLights: [revLeft, revRight],
    headlights: [hlLeft, hlRight],
  };
}

/**
 * Builds Parked Civilian Cars (Obstacles)
 */
export function buildParkedCar(color: string = '#3b82f6', isSuv: boolean = false): THREE.Group {
  const group = new THREE.Group();
  const width = isSuv ? 2.15 : 2.0;
  const length = isSuv ? 4.9 : 4.6;
  const height = isSuv ? 1.68 : 1.38;

  const paintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.28,
    metalness: 0.8,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.8,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85,
  });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.5, length), paintMat);
  body.position.y = 0.26 + (height * 0.5) / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, height * 0.5, length * 0.55), glassMat);
  cabin.position.set(0, body.position.y + (height * 0.5) / 2 + (height * 0.5) / 2 - 0.05, -length * 0.04);
  cabin.castShadow = true;
  group.add(cabin);

  // Wheels (4 cylinders)
  const wheelGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const wZ = length * 0.3;
  const wX = width * 0.48;

  const positions = [
    [-wX, 0.34, wZ],
    [wX, 0.34, wZ],
    [-wX, 0.34, -wZ],
    [wX, 0.34, -wZ],
  ];

  positions.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeom, darkMat);
    w.position.set(x, y, z);
    w.castShadow = true;
    group.add(w);
  });

  // Headlights & Taillights
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeeaa, emissiveIntensity: 0.3 });
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0x991b1b, emissiveIntensity: 0.4 });

  const hlGeom = new THREE.BoxGeometry(0.32, 0.12, 0.05);
  const hl1 = new THREE.Mesh(hlGeom, hlMat);
  hl1.position.set(-width * 0.35, body.position.y + 0.05, length / 2 + 0.01);
  const hl2 = hl1.clone();
  hl2.position.x = width * 0.35;
  group.add(hl1, hl2);

  const tl1 = new THREE.Mesh(hlGeom, tlMat);
  tl1.position.set(-width * 0.35, body.position.y + 0.05, -length / 2 - 0.01);
  const tl2 = tl1.clone();
  tl2.position.x = width * 0.35;
  group.add(tl1, tl2);

  // Shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.3, length * 1.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: createContactShadowTexture(), transparent: true, opacity: 0.6, depthWrite: false })
  );
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  return group;
}

/**
 * Builds Concrete Pillar with Hazard Striping
 */
export function buildPillar(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();

  // Concrete column
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.85,
    metalness: 0.05,
  });

  const column = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), concreteMat);
  column.position.y = height / 2;
  column.castShadow = true;
  column.receiveShadow = true;
  group.add(column);

  // Hazard striped safety guard sleeve near base
  const hazardMat = new THREE.MeshStandardMaterial({
    map: createHazardStripeTexture(),
    roughness: 0.5,
  });
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.8, length + 0.04), hazardMat);
  sleeve.position.y = 0.5;
  group.add(sleeve);

  return group;
}

/**
 * Builds Traffic Cone with Square Rubber Base
 */
export function buildTrafficCone(): THREE.Group {
  const group = new THREE.Group();

  // Square black rubber base
  const baseGeom = new THREE.BoxGeometry(0.44, 0.05, 0.44);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.025;
  base.castShadow = true;
  group.add(base);

  // Cone body
  const coneGeom = new THREE.ConeGeometry(0.18, 0.72, 16);
  const coneMat = createTrafficConeMaterial();
  const cone = new THREE.Mesh(coneGeom, coneMat);
  cone.position.y = 0.05 + 0.72 / 2;
  cone.castShadow = true;
  group.add(cone);

  return group;
}

/**
 * Builds Rubber Wheel Stop with Hazard Stripes
 */
export function buildWheelStop(width: number, length: number, height: number): THREE.Group {
  const group = new THREE.Group();
  const stopGeom = new THREE.BoxGeometry(width, height, length);
  const mat = new THREE.MeshStandardMaterial({
    map: createHazardStripeTexture(),
    roughness: 0.7,
  });
  const stop = new THREE.Mesh(stopGeom, mat);
  stop.position.y = height / 2;
  stop.castShadow = true;
  group.add(stop);
  return group;
}

/**
 * Builds Street Lamp / Lighting Rig
 */
export function buildStreetLamp(height: number = 5.5): THREE.Group {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });

  // Post
  const postGeom = new THREE.CylinderGeometry(0.12, 0.16, height, 12);
  const post = new THREE.Mesh(postGeom, metalMat);
  post.position.y = height / 2;
  post.castShadow = true;
  group.add(post);

  // Arm overhang
  const armGeom = new THREE.BoxGeometry(0.1, 0.1, 1.4);
  const arm = new THREE.Mesh(armGeom, metalMat);
  arm.position.set(0, height - 0.1, 0.6);
  group.add(arm);

  // Fixture head
  const headGeom = new THREE.BoxGeometry(0.3, 0.15, 0.5);
  const head = new THREE.Mesh(headGeom, metalMat);
  head.position.set(0, height - 0.2, 1.15);
  group.add(head);

  // Emissive bulb
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3cc });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.4), bulbMat);
  bulb.position.set(0, height - 0.28, 1.15);
  group.add(bulb);

  // Spotlight casting downward light pool
  const spotLight = new THREE.SpotLight(0xffeedd, 1.5, 18, Math.PI / 4, 0.4, 1.2);
  spotLight.position.set(0, height - 0.28, 1.15);
  spotLight.target.position.set(0, 0, 1.15);
  group.add(spotLight);
  group.add(spotLight.target);

  return group;
}

/**
 * Builds Parking Stall Guideline Decal / Mesh
 */
export function buildParkingSlotMesh(slot: ParkingSlot): THREE.Group {
  const group = new THREE.Group();
  group.position.set(slot.x, 0.025, slot.z);
  group.rotation.y = slot.rotation;

  const w = slot.width;
  const l = slot.length;
  const lineThickness = 0.14;

  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e, // Neon green target bay
    transparent: true,
    opacity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // Left line
  const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(lineThickness, l).rotateX(-Math.PI / 2), lineMat);
  leftLine.position.set(-w / 2, 0, 0);
  group.add(leftLine);

  // Right line
  const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(lineThickness, l).rotateX(-Math.PI / 2), lineMat);
  rightLine.position.set(w / 2, 0, 0);
  group.add(rightLine);

  // Back stop line
  const backLine = new THREE.Mesh(new THREE.PlaneGeometry(w, lineThickness).rotateX(-Math.PI / 2), lineMat);
  backLine.position.set(0, 0, l / 2);
  group.add(backLine);

  // Center Target Decal Canvas (shows Bay Number and Arrow)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Green tinted subtle glow fill
  ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
  ctx.fillRect(0, 0, 256, 256);

  // Border
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 236, 236);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slot.bayNumber, 128, 90);

  ctx.fillStyle = '#4ade80';
  ctx.font = '600 24px sans-serif';
  ctx.fillText('TARGET BAY', 128, 140);

  // Direction arrow
  ctx.beginPath();
  ctx.moveTo(128, 170);
  ctx.lineTo(110, 210);
  ctx.lineTo(122, 210);
  ctx.lineTo(122, 230);
  ctx.lineTo(134, 230);
  ctx.lineTo(134, 210);
  ctx.lineTo(146, 210);
  ctx.closePath();
  ctx.fillStyle = '#4ade80';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const centerDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.75, l * 0.6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  group.add(centerDecal);

  return group;
}
