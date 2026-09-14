import * as THREE from 'three';
import { getLandingAssist } from '../ball/landingAssist';
import {
  getCameraIntent,
  type CameraSetting,
} from '../camera/cameraDirector';
import {
  STARTER_ROSTER,
  type CharacterId,
} from '../characters/roster';
import { COURT } from '../core/constants';
import type { MatchState, PlayerState } from '../core/types';
import type { RuntimeEvent } from '../runtime/matchRuntime';
import { BallView } from './BallView';
import { CameraView } from './CameraView';
import { CourtView } from './CourtView';
import { LandingMarkerView } from './LandingMarkerView';
import { PlayerView } from './PlayerView';
import {
  SERVE_FOLLOW_THROUGH_MS,
  interpolateServeReturnZ,
} from './servePresentation';

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

export class GameScene {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraView: CameraView;
  private readonly ballView = new BallView();
  private readonly landingMarkerView = new LandingMarkerView();
  private readonly playerViews = new Map<string, PlayerView>();
  private readonly resizeObserver: ResizeObserver;
  private serveFollowThrough: ServeFollowThrough | null = null;

  constructor(private readonly host: HTMLElement, initialState: MatchState) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x07111f);
    this.scene.fog = new THREE.Fog(0x07111f, 20, 34);

    const court = new CourtView();
    this.scene.add(court.group);
    this.scene.add(this.ballView.mesh);
    this.scene.add(this.landingMarkerView.mesh);

    const hemi = new THREE.HemisphereLight(0xe8fbff, 0x102331, 2.2);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-6, 13, -8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    this.camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 80);
    this.cameraView = new CameraView(this.camera);
    this.cameraView.snap(getCameraIntent(initialState));

    for (const player of initialState.players) {
      const character = STARTER_ROSTER[player.characterId as CharacterId];
      if (!character) continue;
      const view = new PlayerView(player.id, character, player.side);
      view.update(player);
      this.playerViews.set(player.id, view);
      this.scene.add(view.group);
    }
    this.ballView.update(initialState.ball);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
  }

  playEvent(event: RuntimeEvent): void {
    if (!event.actorId) return;
    this.playerViews.get(event.actorId)?.playAction(event.type);

    if (event.type === 'SERVE') {
      const sideSign = event.actorId.startsWith('home-') ? -1 : 1;
      this.serveFollowThrough = {
        playerId: event.actorId,
        serviceZ: sideSign * (COURT.length / 2 + 0.35),
        startedAt: performance.now(),
      };
    }
  }

  update(
    state: MatchState,
    dt: number,
    options: {
      controlledPlayerId?: string | null;
      cameraSetting?: CameraSetting;
    } = {},
  ): void {
    const now = performance.now();
    const server = currentServer(state);
    const serveZ = server
      ? (server.side === 'home' ? -1 : 1) * (COURT.length / 2 + 0.35)
      : null;
    const followThrough = this.serveFollowThrough;
    const followThroughElapsed = followThrough
      ? Math.max(0, now - followThrough.startedAt)
      : 0;
    const followThroughActive = Boolean(
      followThrough && followThroughElapsed < SERVE_FOLLOW_THROUGH_MS,
    );

    for (const player of state.players) {
      let displayPlayer = player;
      if (server?.id === player.id && serveZ !== null) {
        displayPlayer = { ...player, position: { ...player.position, z: serveZ } };
      } else if (followThroughActive && followThrough?.playerId === player.id) {
        displayPlayer = {
          ...player,
          position: {
            ...player.position,
            z: interpolateServeReturnZ(
              followThrough.serviceZ,
              player.position.z,
              followThroughElapsed,
            ),
          },
        };
      }

      const view = this.playerViews.get(player.id);
      view?.setSelected(player.id === options.controlledPlayerId);
      view?.update(displayPlayer);
    }

    if (followThrough && !followThroughActive) {
      this.serveFollowThrough = null;
    }

    if (server && serveZ !== null) {
      this.ballView.update({
        ...state.ball,
        position: { x: server.position.x, y: 1.25, z: serveZ },
      });
    } else {
      this.ballView.update(state.ball);
    }

    this.landingMarkerView.update(
      options.controlledPlayerId
        ? getLandingAssist(state, options.controlledPlayerId)
        : null,
    );

    this.cameraView.update(
      getCameraIntent(state, {
        controlledPlayerId: options.controlledPlayerId,
        setting: options.cameraSetting,
      }),
      dt,
    );
    this.renderer.render(this.scene, this.camera);
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
    for (const view of this.playerViews.values()) {
      view.dispose();
    }
    this.playerViews.clear();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
