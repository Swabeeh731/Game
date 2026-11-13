import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraMode, ReplayCameraMode, LevelConfig, VehicleConfig, Obstacle } from '../types/game';
import {
  buildCompositeCar,
  CarMeshes,
  buildParkedCar,
  buildPillar,
  buildTrafficCone,
  buildWheelStop,
  buildStreetLamp,
  buildParkingSlotMesh,
  createAsphaltTexture,
} from './models';

export class SceneManager {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public isSoftwareGl: boolean;

  // Active level elements
  private carMeshes: CarMeshes | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private slotMesh: THREE.Group | null = null;
  private obstacleMeshes: THREE.Object3D[] = [];
  private decorMeshes: THREE.Object3D[] = [];

  // Lighting
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Camera settings
  public cameraMode: CameraMode = 'chase';
  private cameraTarget = new THREE.Vector3();
  private cameraPosTarget = new THREE.Vector3();
  private orbitAngle: number = 0;

  constructor(container: HTMLDivElement) {
    // Software WebGL detection per skill directives
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 150);
    this.camera.position.set(0, 7, -12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Studio Environment map via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Key Light & Fill
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.7);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    this.dirLight.position.set(25, 45, 20);
    this.dirLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 120;
      const d = 35;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    // Distant background city silhouette
    this.buildCitySkyline();
  }

  private buildCitySkyline() {
    const skylineGroup = new THREE.Group();
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
      metalness: 0.1,
    });

    const windowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.75,
    });

    // Ring of perimeter buildings in the distance
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const dist = 55 + (i % 5) * 6;
      const bW = 8 + (i % 4) * 3;
      const bD = 8 + ((i * 3) % 4) * 3;
      const bH = 14 + (i % 7) * 6;

      const building = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), buildingMat);
      building.position.set(Math.cos(angle) * dist, bH / 2 - 1, Math.sin(angle) * dist);
      skylineGroup.add(building);

      // Lit office windows
      if (i % 2 === 0) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(bW * 0.7, bH * 0.6), windowMat);
        win.position.copy(building.position);
        win.position.y += 2;
        win.lookAt(0, win.position.y, 0);
        skylineGroup.add(win);
      }
    }

    this.scene.add(skylineGroup);
  }

  public setEnvironmentTime(skyTime: 'sunset' | 'night' | 'day', ambient: number, sun: number) {
    let bgColor = 0x0f172a;
    let fogDensity = 0.012;

    if (skyTime === 'sunset') {
      bgColor = 0x2d182e; // Deep twilight plum
      this.scene.background = new THREE.Color(bgColor);
      this.scene.fog = new THREE.FogExp2(bgColor, 0.01);
      this.hemiLight.color.setHex(0xfb923c); // Warm amber
      this.hemiLight.groundColor.setHex(0x311a3b);
      this.dirLight.color.setHex(0xfde047);
    } else if (skyTime === 'night') {
      bgColor = 0x060913; // Deep midnight navy
      this.scene.background = new THREE.Color(bgColor);
      this.scene.fog = new THREE.FogExp2(bgColor, 0.015);
      this.hemiLight.color.setHex(0x38bdf8);
      this.hemiLight.groundColor.setHex(0x0a0f1d);
      this.dirLight.color.setHex(0xc7d2fe);
    } else {
      bgColor = 0x1e293b;
      this.scene.background = new THREE.Color(bgColor);
      this.scene.fog = new THREE.FogExp2(bgColor, 0.008);
      this.hemiLight.color.setHex(0xdbeafe);
      this.hemiLight.groundColor.setHex(0x1e293b);
      this.dirLight.color.setHex(0xffffff);
    }

    this.hemiLight.intensity = ambient;
    this.dirLight.intensity = sun;
  }

  public loadLevel(level: LevelConfig, vehicleConfig: VehicleConfig) {
    this.clearLevel();

    // Environment Lighting
    this.setEnvironmentTime(
      level.environment.skyTime,
      level.environment.ambientIntensity,
      level.environment.sunIntensity
    );

    // 1. Asphalt Ground
    const [gw, gl] = level.environment.groundSize;
    const groundGeom = new THREE.PlaneGeometry(gw, gl);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: createAsphaltTexture(),
      roughness: 0.92,
      metalness: 0.08,
    });
    this.groundMesh = new THREE.Mesh(groundGeom, groundMat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 2. Target Parking Slot
    this.slotMesh = buildParkingSlotMesh(level.targetSlot);
    this.scene.add(this.slotMesh);

    // 3. Obstacles
    for (const obs of level.obstacles) {
      const mesh = this.createObstacleMesh(obs);
      if (mesh) {
        mesh.position.set(obs.x, 0, obs.z);
        mesh.rotation.y = obs.rotation;
        this.scene.add(mesh);
        this.obstacleMeshes.push(mesh);
      }
    }

    // 4. Player Vehicle
    this.carMeshes = buildCompositeCar(vehicleConfig);
    this.carMeshes.group.position.set(level.startPos[0], level.startPos[1], level.startPos[2]);
    this.carMeshes.group.rotation.y = level.startRot;
    this.scene.add(this.carMeshes.group);
  }

  private createObstacleMesh(obs: Obstacle): THREE.Object3D | null {
    switch (obs.type) {
      case 'car':
        return buildParkedCar(obs.color || '#3b82f6', obs.carModel === 'suv');
      case 'cone':
        return buildTrafficCone();
      case 'pillar':
        return buildPillar(obs.width, obs.length, obs.height);
      case 'wheelstop':
        return buildWheelStop(obs.width, obs.length, obs.height);
      case 'lamp':
        return buildStreetLamp(obs.height);
      case 'curb':
      case 'barrier':
      case 'wall': {
        const geom = new THREE.BoxGeometry(obs.width, obs.height, obs.length);
        const mat = new THREE.MeshStandardMaterial({
          color: obs.type === 'curb' ? 0x94a3b8 : 0x475569,
          roughness: 0.8,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = obs.height / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
      }
      default:
        return null;
    }
  }

  public updateCarVisuals(
    x: number,
    z: number,
    heading: number,
    steerAngle: number,
    wheelSpin: number,
    isBraking: boolean,
    isReverse: boolean
  ) {
    if (!this.carMeshes) return;

    // Root car transform
    this.carMeshes.group.position.x = x;
    this.carMeshes.group.position.z = z;
    this.carMeshes.group.rotation.y = heading;

    // Front wheels steering yaw
    this.carMeshes.frontLeftWheel.rotation.y = steerAngle;
    this.carMeshes.frontRightWheel.rotation.y = steerAngle;

    // Wheels rolling spin pitch
    this.carMeshes.frontLeftWheel.children[0].rotation.x = wheelSpin;
    this.carMeshes.frontRightWheel.children[0].rotation.x = wheelSpin;
    this.carMeshes.rearLeftWheel.children[0].rotation.x = wheelSpin;
    this.carMeshes.rearRightWheel.children[0].rotation.x = wheelSpin;

    // Brake lights glow
    const brakeEmissive = isBraking ? 1.6 : 0.4;
    for (const bl of this.carMeshes.brakeLights) {
      const mat = bl.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = brakeEmissive;
    }

    // Reverse white lights
    const revEmissive = isReverse ? 1.4 : 0.0;
    for (const rl of this.carMeshes.reverseLights) {
      const mat = rl.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = revEmissive;
    }
  }

  public updateCamera(
    dt: number,
    carX: number,
    carZ: number,
    heading: number,
    cameraShake: number,
    isTitleScreen: boolean = false
  ) {
    if (isTitleScreen) {
      // Atmospheric cinematic orbit around parked vehicle
      this.orbitAngle += dt * 0.35;
      const radius = 9.5;
      const camY = 3.6;
      this.camera.position.set(
        carX + Math.sin(this.orbitAngle) * radius,
        camY,
        carZ + Math.cos(this.orbitAngle) * radius
      );
      this.camera.lookAt(carX, 1.0, carZ);
      return;
    }

    // Camera Modes
    if (this.cameraMode === 'topdown') {
      // 90° Overhead Bird's-Eye
      const targetCamPos = new THREE.Vector3(carX, 22, carZ);
      this.camera.position.lerp(targetCamPos, dt * 6.0);
      this.camera.lookAt(carX, 0, carZ);
    } else if (this.cameraMode === 'cockpit') {
      // Driver Hood / Cockpit View
      const forwardX = Math.sin(heading);
      const forwardZ = Math.cos(heading);
      const hoodOffset = 0.6;
      const camY = 1.32;

      this.camera.position.set(
        carX + forwardX * hoodOffset,
        camY,
        carZ + forwardZ * hoodOffset
      );
      this.camera.lookAt(
        carX + forwardX * 18,
        1.1,
        carZ + forwardZ * 18
      );
    } else {
      // Chase Cam (Smooth spring damped third-person)
      const followDist = 7.4;
      const followHeight = 3.5;
      const backX = Math.sin(heading) * -followDist;
      const backZ = Math.cos(heading) * -followDist;

      this.cameraPosTarget.set(carX + backX, followHeight, carZ + backZ);
      this.cameraTarget.set(carX, 1.1, carZ);

      // Smooth exponential damp
      const lerpFactor = Math.min(1.0, dt * 5.0);
      this.camera.position.lerp(this.cameraPosTarget, lerpFactor);
      this.camera.lookAt(this.cameraTarget);
    }

    // Apply collision camera shake if active
    if (cameraShake > 0.01) {
      const shakeAmt = cameraShake * 0.25;
      this.camera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.y += (Math.random() - 0.5) * shakeAmt;
      this.camera.position.z += (Math.random() - 0.5) * shakeAmt;
    }
  }

  /**
   * Multi-Angle Cinematic Replay Camera System
   */
  public updateReplayCamera(
    dt: number,
    carX: number,
    carZ: number,
    heading: number,
    mode: ReplayCameraMode,
    slotX: number,
    slotZ: number,
    slotRot: number
  ) {
    if (mode === 'broadcast') {
      // Elevated trackside TV broadcast camera with smooth tracking pan
      const tvX = slotX + 8.5;
      const tvY = 5.2;
      const tvZ = slotZ - 10.5;
      this.camera.position.set(tvX, tvY, tvZ);
      this.cameraTarget.set(carX, 1.0, carZ);
      this.camera.lookAt(this.cameraTarget);
    } else if (mode === 'orbit') {
      // Smooth dynamic drone sweep around vehicle
      this.orbitAngle += dt * 0.5;
      const radius = 7.8;
      const camY = 3.2 + Math.sin(this.orbitAngle * 0.7) * 0.8;
      this.camera.position.set(
        carX + Math.sin(this.orbitAngle) * radius,
        camY,
        carZ + Math.cos(this.orbitAngle) * radius
      );
      this.cameraTarget.set(carX, 1.0, carZ);
      this.camera.lookAt(this.cameraTarget);
    } else if (mode === 'wheel') {
      // Low kerb ground-level wheel camera tracking front tire steer and rim
      const rightX = Math.cos(heading);
      const rightZ = -Math.sin(heading);
      const backX = Math.sin(heading) * -2.4;
      const backZ = Math.cos(heading) * -2.4;

      const camX = carX + rightX * 2.1 + backX;
      const camZ = carZ + rightZ * 2.1 + backZ;
      this.camera.position.set(camX, 0.42, camZ);
      this.cameraTarget.set(carX, 0.4, carZ);
      this.camera.lookAt(this.cameraTarget);
    } else if (mode === 'bay') {
      // Stationary parking bay camera placed at the rear end of the target slot looking outward
      const bayCos = Math.cos(slotRot);
      const baySin = Math.sin(slotRot);
      // Offset behind slot back line
      const backDist = 3.6;
      const camX = slotX - baySin * backDist;
      const camZ = slotZ - bayCos * backDist;
      this.camera.position.set(camX, 1.8, camZ);
      this.cameraTarget.set(carX, 0.9, carZ);
      this.camera.lookAt(this.cameraTarget);
    } else if (mode === 'hood') {
      // Forward cockpit hood camera
      const forwardX = Math.sin(heading);
      const forwardZ = Math.cos(heading);
      this.camera.position.set(carX + forwardX * 0.7, 1.35, carZ + forwardZ * 0.7);
      this.camera.lookAt(carX + forwardX * 16, 1.1, carZ + forwardZ * 16);
    } else if (mode === 'overhead') {
      // Bird's-eye 90° precision overhead
      this.camera.position.set(slotX * 0.3 + carX * 0.7, 20.0, slotZ * 0.3 + carZ * 0.7);
      this.camera.lookAt(carX, 0, carZ);
    }
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public clearLevel() {
    if (this.carMeshes) {
      this.scene.remove(this.carMeshes.group);
      this.carMeshes = null;
    }
    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh = null;
    }
    if (this.slotMesh) {
      this.scene.remove(this.slotMesh);
      this.slotMesh = null;
    }
    for (const mesh of this.obstacleMeshes) {
      this.scene.remove(mesh);
    }
    this.obstacleMeshes = [];
  }

  public dispose() {
    this.clearLevel();
    this.renderer.dispose();
  }
}
