import * as THREE from 'three';
import { ReworkCourtView } from '../../rework/render/ReworkCourtView';
import type { V3PlayerState } from '../types';
import type { V3RuntimeState } from '../core/runtime';
import { getReadableBallScale } from './ballReadability';
import { getV3CameraPose } from './camera';

const MAX_PIXEL_RATIO = 1.5;
const BALL_RADIUS = 0.17;

interface V3Avatar {
  group: THREE.Group;
  focusRing: THREE.Mesh;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
}

const CHARACTER_COLORS: Record<string, number> = {
  kai: 0x19c7b2,
  ren: 0x4da5ff,
  hina: 0xffba5c,
  shin: 0xf06b69,
  gou: 0xc26cff,
  yu: 0xff8f61,
};

function createMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createAvatar(player: V3PlayerState): V3Avatar {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const jersey = new THREE.MeshStandardMaterial({
    color: CHARACTER_COLORS[player.characterId] ?? (player.side === 'home' ? 0x2bb9d6 : 0xe36972),
    roughness: 0.7,
    metalness: 0,
  });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x172432, roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c4a2, roughness: 0.86 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.76 });
  materials.push(jersey, shorts, skin, shoe);

  const torsoGeometry = new THREE.CapsuleGeometry(0.23, 0.58, 6, 10);
  const headGeometry = new THREE.SphereGeometry(0.2, 16, 12);
  const limbGeometry = new THREE.CylinderGeometry(0.065, 0.075, 0.62, 10);
  const forearmGeometry = new THREE.CylinderGeometry(0.055, 0.065, 0.54, 10);
  const shortsGeometry = new THREE.BoxGeometry(0.48, 0.26, 0.32);
  const shoeGeometry = new THREE.BoxGeometry(0.16, 0.1, 0.28);
  geometries.push(
    torsoGeometry,
    headGeometry,
    limbGeometry,
    forearmGeometry,
    shortsGeometry,
    shoeGeometry,
  );

  const torso = createMesh(torsoGeometry, jersey, [0, 1.18, 0]);
  const head = createMesh(headGeometry, skin, [0, 1.83, 0]);
  const hips = createMesh(shortsGeometry, shorts, [0, 0.78, 0]);
  group.add(torso, head, hips);

  for (const side of [-1, 1] as const) {
    const leg = createMesh(limbGeometry, skin, [side * 0.13, 0.42, 0]);
    const shoeMesh = createMesh(shoeGeometry, shoe, [side * 0.13, 0.08, 0.07]);
    const arm = createMesh(forearmGeometry, skin, [side * 0.34, 1.2, 0]);
    arm.rotation.z = side * -0.25;
    group.add(leg, shoeMesh, arm);
  }

  const ringGeometry = new THREE.TorusGeometry(0.42, 0.04, 8, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x7fffdc,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  geometries.push(ringGeometry);
  materials.push(ringMaterial);
  const focusRing = new THREE.Mesh(ringGeometry, ringMaterial);
  focusRing.rotation.x = -Math.PI / 2;
  focusRing.position.y = 0.035;
  focusRing.renderOrder = 4;
  group.add(focusRing);

  return { group, focusRing, materials, geometries };
}

function disposeAvatar(avatar: V3Avatar): void {
  avatar.geometries.forEach((geometry) => geometry.dispose());
  avatar.materials.forEach((material) => material.dispose());
}

export class V3Scene {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(54, 16 / 9, 0.1, 90);
  private readonly court = new ReworkCourtView();
  private readonly avatars = new Map<string, V3Avatar>();
  private readonly ball: THREE.Mesh;
  private readonly forecast: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly host: HTMLElement, initialState: V3RuntimeState) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x07111a);
    this.scene.fog = new THREE.Fog(0x07111a, 25, 52);
    this.scene.add(this.court.group);

    const hemi = new THREE.HemisphereLight(0xdff8ff, 0x16141a, 2.05);
    const key = new THREE.DirectionalLight(0xffffff, 2.45);
    key.position.set(7, 14, -7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const rim = new THREE.DirectionalLight(0x6fffe6, 0.62);
    rim.position.set(-7, 8, 5);
    this.scene.add(hemi, key, rim);

    for (const player of initialState.players) {
      const avatar = createAvatar(player);
      this.avatars.set(player.id, avatar);
      this.scene.add(avatar.group);
    }

    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff7d8,
      emissive: 0x6c5b22,
      emissiveIntensity: 0.42,
      roughness: 0.52,
    });
    this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
    this.ball.castShadow = true;
    this.ball.renderOrder = 5;
    this.scene.add(this.ball);

    const forecastGeometry = new THREE.RingGeometry(0.76, 1, 48);
    const forecastMaterial = new THREE.MeshBasicMaterial({
      color: 0x72f0ff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.forecast = new THREE.Mesh(forecastGeometry, forecastMaterial);
    this.forecast.rotation.x = -Math.PI / 2;
    this.forecast.position.y = 0.045;
    this.forecast.renderOrder = 3;
    this.scene.add(this.forecast);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.update(initialState, 0);
  }

  update(state: V3RuntimeState, dt: number): void {
    const controlled = state.players.find((player) => player.id === state.controlledPlayerId);
    for (const player of state.players) {
      const avatar = this.avatars.get(player.id);
      if (!avatar) continue;
      avatar.group.position.set(player.position.x, 0, player.position.z);
      avatar.group.rotation.y = player.side === 'home' ? 0 : Math.PI;
      avatar.focusRing.visible = player.id === state.controlledPlayerId;
      if (player.id === 'home-0' && state.phase === 'ATTACK_AIRBORNE') {
        avatar.group.position.y = 0.58;
      }
    }

    this.ball.position.set(
      state.ball.position.x,
      state.ball.position.y,
      state.ball.position.z,
    );

    if (state.forecast) {
      this.forecast.visible = true;
      this.forecast.position.set(state.forecast.center.x, 0.045, state.forecast.center.z);
      this.forecast.scale.setScalar(state.forecast.radius);
      const material = this.forecast.material as THREE.MeshBasicMaterial;
      material.opacity = 0.24 + state.forecast.confidence * 0.34;
    } else {
      this.forecast.visible = false;
    }

    if (controlled) {
      const pose = getV3CameraPose({
        controlledPosition: controlled.position,
        ballPosition: state.ball.position,
        phase: state.phase,
        aspect: this.camera.aspect,
      });
      this.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      this.camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
      if (Math.abs(this.camera.fov - pose.fov) > 0.001) {
        this.camera.fov = pose.fov;
        this.camera.updateProjectionMatrix();
      }
    }

    const cameraDistance = this.camera.position.distanceTo(this.ball.position);
    const height = Math.max(1, this.host.clientHeight);
    const visibleHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * Math.max(0.1, cameraDistance);
    const projectedRadiusPx = BALL_RADIUS * (height / visibleHeight);
    this.ball.scale.setScalar(getReadableBallScale(projectedRadiusPx));

    this.renderer.render(this.scene, this.camera);
    void dt;
  }

  resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    for (const avatar of this.avatars.values()) disposeAvatar(avatar);
    this.avatars.clear();
    this.court.dispose();
    this.ball.geometry.dispose();
    const ballMaterial = this.ball.material;
    if (Array.isArray(ballMaterial)) ballMaterial.forEach((material) => material.dispose());
    else ballMaterial.dispose();
    this.forecast.geometry.dispose();
    const forecastMaterial = this.forecast.material;
    if (Array.isArray(forecastMaterial)) forecastMaterial.forEach((material) => material.dispose());
    else forecastMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
