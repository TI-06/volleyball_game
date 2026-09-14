import * as THREE from 'three';
import { STARTER_ROSTER, type CharacterId } from '../../characters/roster';
import type { MatchState } from '../../core/types';
import { BallView } from '../../render/BallView';
import type { ReworkEvent } from '../types';
import { ReworkCameraFrame, getReworkCameraFrame } from './ReworkCamera';
import { ReworkCourtView } from './ReworkCourtView';
import { ReworkMarkers } from './ReworkMarkers';
import { getReworkMarkerState } from './markerState';
import { ToonPlayerProxy } from './ToonPlayerProxy';

function eventImpact(event: ReworkEvent): number {
  if (event.type === 'SPIKE' && event.quality === 'PERFECT') return 0.05;
  if (event.type === 'BLOCK' && event.quality === 'PERFECT') return 0.045;
  if (event.type === 'RECEIVE' && event.quality === 'PERFECT') return 0.018;
  return 0;
}

function applyCameraFrame(camera: THREE.PerspectiveCamera, frame: ReworkCameraFrame): void {
  camera.position.set(frame.position.x, frame.position.y, frame.position.z);
  camera.lookAt(frame.lookAt.x, frame.lookAt.y, frame.lookAt.z);
  if (Math.abs(camera.fov - frame.fov) > 0.001) {
    camera.fov = frame.fov;
    camera.updateProjectionMatrix();
  }
}

export class ReworkScene {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 90);
  private readonly court = new ReworkCourtView();
  private readonly markers = new ReworkMarkers();
  private readonly ball = new BallView();
  private readonly players = new Map<string, ToonPlayerProxy>();
  private readonly resizeObserver: ResizeObserver;
  private impactPeak = 0;
  private impactStartedAt = 0;

  constructor(
    private readonly host: HTMLElement,
    initialState: MatchState,
    private readonly focusPlayerId = 'home-0',
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x050c14);
    this.scene.fog = new THREE.Fog(0x050c14, 24, 48);
    this.scene.add(this.court.group);
    this.scene.add(this.markers.group);
    this.scene.add(this.ball.mesh);

    const hemi = new THREE.HemisphereLight(0xd9f6ff, 0x111018, 2.15);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(9, 15, -5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x75eadd, 0.9);
    rim.position.set(-8, 7, 4);
    this.scene.add(rim);

    for (const player of initialState.players) {
      const character = STARTER_ROSTER[player.characterId as CharacterId];
      if (!character) continue;
      const proxy = new ToonPlayerProxy(character, player.side);
      proxy.setFocused(player.id === this.focusPlayerId);
      proxy.update(player);
      this.players.set(player.id, proxy);
      this.scene.add(proxy.group);
    }

    this.ball.update(initialState.ball);
    applyCameraFrame(this.camera, getReworkCameraFrame(initialState));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  playEvent(event: ReworkEvent): void {
    if (event.actorId) this.players.get(event.actorId)?.playEvent(event);
    const impact = eventImpact(event);
    if (impact > 0) {
      this.impactPeak = impact;
      this.impactStartedAt = performance.now();
    }
    if (event.type === 'POINT' && event.value && event.value > 0) {
      this.players.get(this.focusPlayerId)?.playEvent({ type: 'POINT', actorId: this.focusPlayerId });
    }
  }

  update(state: MatchState, dt: number): void {
    const now = performance.now();
    const elapsed = Math.max(0, now - this.impactStartedAt);
    const decay = this.impactPeak > 0 ? Math.max(0, 1 - elapsed / 180) : 0;
    const impact = this.impactPeak * decay;
    if (decay === 0) this.impactPeak = 0;

    for (const player of state.players) {
      const proxy = this.players.get(player.id);
      if (!proxy) continue;
      proxy.setFocused(player.id === this.focusPlayerId);
      proxy.update(player);
    }
    this.ball.update(state.ball);
    this.markers.update(getReworkMarkerState(state, this.focusPlayerId), state.time);

    const frame = getReworkCameraFrame(state, impact);
    applyCameraFrame(this.camera, frame);
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
    for (const proxy of this.players.values()) proxy.dispose();
    this.players.clear();
    this.court.dispose();
    this.markers.dispose();
    this.ball.mesh.geometry.dispose();
    const ballMaterial = this.ball.mesh.material;
    if (Array.isArray(ballMaterial)) ballMaterial.forEach((material) => material.dispose());
    else ballMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
