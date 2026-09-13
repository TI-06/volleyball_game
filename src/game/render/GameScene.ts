import * as THREE from 'three';
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
import { BallView } from './BallView';
import { CameraView } from './CameraView';
import { CourtView } from './CourtView';
import { PlayerView } from './PlayerView';

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
  private readonly playerViews = new Map<string, PlayerView>();
  private readonly resizeObserver: ResizeObserver;

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

  update(
    state: MatchState,
    dt: number,
    options: {
      controlledPlayerId?: string | null;
      cameraSetting?: CameraSetting;
    } = {},
  ): void {
    const server = currentServer(state);
    const serveZ = server
      ? (server.side === 'home' ? -1 : 1) * (COURT.length / 2 + 0.35)
      : null;

    for (const player of state.players) {
      const displayPlayer = server?.id === player.id && serveZ !== null
        ? { ...player, position: { ...player.position, z: serveZ } }
        : player;
      this.playerViews.get(player.id)?.update(displayPlayer);
    }

    if (server && serveZ !== null) {
      this.ballView.update({
        ...state.ball,
        position: { x: server.position.x, y: 1.25, z: serveZ },
      });
    } else {
      this.ballView.update(state.ball);
    }

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
