import * as THREE from 'three';
import type { V3RuntimeState } from '../core/runtime';
import { deriveV3CharacterPresentation } from '../presentation/characterPresentation';
import type { V3CharacterMotionState } from '../presentation/characterMotion';
import type { V3Vec2 } from '../types';
import { getReadableBallScale } from './ballReadability';
import { getV3CameraPose } from './camera';
import { V3CourtView } from './V3CourtView';
import { createV3CharacterRig, type V3CharacterRig } from './character/V3CharacterRig';
import { sampleV3Pose } from './character/V3PoseLibrary';
import { profileFor } from './character/characterProfiles';

const MAX_PIXEL_RATIO = 1.5;
const BALL_RADIUS = 0.17;

interface V3Avatar {
  rig: V3CharacterRig;
  previousPosition: V3Vec2;
  motion: V3CharacterMotionState;
  motionAge: number;
}

export class V3Scene {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(54, 16 / 9, 0.1, 90);
  private readonly court = new V3CourtView();
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
      const rig = createV3CharacterRig(profileFor(player.characterId));
      rig.root.position.set(player.position.x, 0, player.position.z);
      rig.root.rotation.y = player.side === 'home' ? 0 : Math.PI;
      rig.setFocus(player.id === initialState.controlledPlayerId);
      rig.applyPose(sampleV3Pose('READY', 0, player.side));
      this.avatars.set(player.id, {
        rig,
        previousPosition: { ...player.position },
        motion: 'READY',
        motionAge: 0,
      });
      this.scene.add(rig.root);
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

      const presentation = deriveV3CharacterPresentation({
        playerId: player.id,
        side: player.side,
        currentPosition: player.position,
        previousPosition: avatar.previousPosition,
        dt,
        phase: state.phase,
        controlledPlayerId: state.controlledPlayerId,
        lastEvent: state.lastEvent,
        bufferedAction: state.bufferedAction,
        previousMotion: avatar.motion,
        previousMotionAge: avatar.motionAge,
        runtimeTime: state.time,
        attackContactAt: state.attackContactAt,
      });

      avatar.rig.root.position.set(player.position.x, 0, player.position.z);
      avatar.rig.root.rotation.y = player.side === 'home' ? 0 : Math.PI;
      avatar.rig.setFocus(player.id === state.controlledPlayerId);
      avatar.rig.applyPose(sampleV3Pose(presentation.motion, presentation.normalizedTime, player.side));

      avatar.previousPosition = { ...player.position };
      avatar.motion = presentation.motion;
      avatar.motionAge = presentation.motionAge;
    }

    this.ball.position.set(state.ball.position.x, state.ball.position.y, state.ball.position.z);

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
    for (const avatar of this.avatars.values()) avatar.rig.dispose();
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
