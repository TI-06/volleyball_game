import * as THREE from 'three';
import { STARTER_ROSTER, type CharacterId } from '../../characters/roster';
import { COURT } from '../../core/constants';
import type { MatchState, PlayerState } from '../../core/types';
import { BallView } from '../../render/BallView';
import type { ReworkEvent } from '../types';
import { ReworkBallTrail } from './ReworkBallTrail';
import { getReworkCameraFrame, type ReworkCameraFrame } from './ReworkCamera';
import { ReworkCourtView } from './ReworkCourtView';
import { ReworkImpactEffects } from './ReworkImpactEffects';
import { ReworkMarkers } from './ReworkMarkers';
import { ArticulatedPlayerView } from './character/ArticulatedPlayerView';
import { getReworkMarkerState } from './markerState';
import { getReworkServeStagePosition } from './serveStaging';

const SERVE_RETURN_MS = 420;
const MAX_RENDER_PIXEL_RATIO = 1.5;

interface ServeFollowThrough {
  playerId: string;
  serviceZ: number;
  startedAt: number;
}

function currentServer(state: MatchState): PlayerState | null {
  if (state.rally.phase !== 'SERVE_READY') return null;
  const players = state.players.filter((player) => player.side === state.rally.servingSide);
  return players[state.rally.serverIndex[state.rally.servingSide] % players.length] ?? null;
}

function serviceZ(player: PlayerState): number {
  return (player.side === 'home' ? -1 : 1) * (COURT.length / 2 + 0.35);
}

function easeOutCubic(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - clamped, 3);
}

function eventImpact(event: ReworkEvent): number {
  if (event.type === 'SPIKE' && event.quality === 'PERFECT') return 0.04;
  if (event.type === 'BLOCK' && event.quality === 'PERFECT') return 0.035;
  if (event.type === 'RECEIVE' && event.quality === 'PERFECT') return 0.014;
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
  private readonly impacts = new ReworkImpactEffects();
  private readonly ballTrail = new ReworkBallTrail();
  private readonly ball = new BallView();
  private readonly players = new Map<string, ArticulatedPlayerView>();
  private readonly resizeObserver: ResizeObserver;
  private impactPeak = 0;
  private impactStartedAt = 0;
  private serveFollowThrough: ServeFollowThrough | null = null;

  constructor(
    private readonly host: HTMLElement,
    initialState: MatchState,
    private readonly focusPlayerId = 'home-0',
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_RENDER_PIXEL_RATIO));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x050c14);
    this.scene.fog = new THREE.Fog(0x050c14, 24, 48);
    this.scene.add(this.court.group);
    this.scene.add(this.markers.group);
    this.scene.add(this.impacts.group);
    this.scene.add(this.ballTrail.group);
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

    const now = performance.now();
    for (const player of initialState.players) {
      const character = STARTER_ROSTER[player.characterId as CharacterId];
      if (!character) continue;
      const view = new ArticulatedPlayerView(character.id, player.side);
      view.setFocused(player.id === this.focusPlayerId);
      view.update(player, initialState, now);
      this.players.set(player.id, view);
      this.scene.add(view.group);
    }

    this.ball.update(initialState.ball);
    this.ballTrail.update(initialState.ball);
    applyCameraFrame(this.camera, getReworkCameraFrame(initialState));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  playEvent(event: ReworkEvent): void {
    for (const view of this.players.values()) view.observeEvent(event);

    if (event.actorId) {
      const view = this.players.get(event.actorId);
      if (view) this.impacts.play(event, view.group.position.clone());
    }

    const impact = eventImpact(event);
    if (impact > 0) {
      this.impactPeak = impact;
      this.impactStartedAt = performance.now();
    }

    if (event.type === 'SERVE' && event.actorId) {
      const side = event.actorId.startsWith('home-') ? 'home' : 'away';
      this.serveFollowThrough = {
        playerId: event.actorId,
        serviceZ: (side === 'home' ? -1 : 1) * (COURT.length / 2 + 0.35),
        startedAt: performance.now(),
      };
    }
  }

  update(state: MatchState, dt: number): void {
    const now = performance.now();
    const elapsed = Math.max(0, now - this.impactStartedAt);
    const decay = this.impactPeak > 0 ? Math.max(0, 1 - elapsed / 170) : 0;
    const impact = this.impactPeak * decay;
    if (decay === 0) this.impactPeak = 0;

    const server = currentServer(state);
    const follow = this.serveFollowThrough;
    const followElapsed = follow ? Math.max(0, now - follow.startedAt) : 0;
    const followActive = Boolean(follow && followElapsed < SERVE_RETURN_MS);

    for (const player of state.players) {
      const view = this.players.get(player.id);
      if (!view) continue;
      view.setFocused(player.id === this.focusPlayerId);

      let displayPlayer = player;
      if (server?.id === player.id) {
        displayPlayer = {
          ...player,
          position: { ...player.position, z: serviceZ(player) },
        };
      } else if (followActive && follow?.playerId === player.id) {
        const amount = easeOutCubic(followElapsed / SERVE_RETURN_MS);
        displayPlayer = {
          ...player,
          position: {
            ...player.position,
            z: follow.serviceZ + (player.position.z - follow.serviceZ) * amount,
          },
        };
      }

      view.update(displayPlayer, state, now);
    }

    if (follow && !followActive) this.serveFollowThrough = null;

    if (server) {
      this.ball.update({
        ...state.ball,
        position: getReworkServeStagePosition(server),
      });
    } else {
      this.ball.update(state.ball);
    }
    this.ballTrail.update(state.ball);

    this.markers.update(getReworkMarkerState(state, this.focusPlayerId), state.time);
    this.impacts.update(now);
    applyCameraFrame(this.camera, getReworkCameraFrame(state, impact));
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
    for (const view of this.players.values()) view.dispose();
    this.players.clear();
    this.court.dispose();
    this.markers.dispose();
    this.impacts.dispose();
    this.ballTrail.dispose();
    this.ball.mesh.geometry.dispose();
    const ballMaterial = this.ball.mesh.material;
    if (Array.isArray(ballMaterial)) ballMaterial.forEach((material) => material.dispose());
    else ballMaterial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
