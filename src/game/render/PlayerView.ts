import * as THREE from 'three';
import type { CharacterDefinition, CharacterId } from '../characters/roster';
import type { PlayerState } from '../core/types';
import type { RuntimeEventType } from '../runtime/matchRuntime';
import {
  getPlayerMotionPose,
  motionFromRuntimeEvent,
  type PlayerMotion,
} from './playerMotion';

const HEIGHT_SCALE: Record<CharacterDefinition['heightClass'], number> = {
  SHORT: 0.9,
  MEDIUM: 1,
  TALL: 1.08,
  VERY_TALL: 1.16,
};

const JERSEY_NUMBER: Record<CharacterId, string> = {
  kai: '10',
  ren: '6',
  hina: '4',
  shin: '7',
  gou: '3',
  yu: '11',
};

const HAIR_COLOR: Record<CharacterId, number> = {
  kai: 0x111a24,
  ren: 0xbac4ce,
  hina: 0x192633,
  shin: 0x3a2025,
  gou: 0x12161a,
  yu: 0x5a4136,
};

const SKIN_COLOR: Record<CharacterId, number> = {
  kai: 0xd49a72,
  ren: 0xe3b18d,
  hina: 0xe0aa83,
  shin: 0xdca17b,
  gou: 0xc98d68,
  yu: 0xe1ad88,
};

function bodyWidth(character: CharacterDefinition): number {
  if (character.archetype === 'POWER') return 1.08;
  if (character.archetype === 'BLOCK') return 1.14;
  if (character.archetype === 'SPEED') return 0.92;
  return 0.98;
}

function createNumberTexture(number: string, accent: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, 128, 128);
  context.fillStyle = '#f7fbff';
  context.font = '900 76px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = accent;
  context.shadowBlur = 4;
  context.fillText(number, 64, 67);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addSpikes(
  group: THREE.Group,
  material: THREE.Material,
  y: number,
  count: number,
  radius: number,
  height: number,
  tilt = 0.2,
): void {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 5),
      material,
    );
    spike.position.set(
      Math.cos(angle) * 0.18,
      y + Math.sin(index * 1.7) * 0.025,
      Math.sin(angle) * 0.18,
    );
    spike.rotation.z = Math.cos(angle) * tilt;
    spike.rotation.x = Math.sin(angle) * tilt;
    group.add(spike);
  }
}

function addHair(
  group: THREE.Group,
  character: CharacterDefinition,
  material: THREE.Material,
  headY: number,
): void {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.272, 12, 9), material);
  cap.scale.set(1, 0.67, 1);
  cap.position.y = headY + 0.13;
  group.add(cap);

  switch (character.id) {
    case 'kai':
      addSpikes(group, material, headY + 0.28, 8, 0.07, 0.28, 0.34);
      break;
    case 'ren': {
      const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 5), material);
      fringe.position.set(0.16, headY + 0.16, -0.16);
      fringe.rotation.z = -0.62;
      group.add(fringe);
      break;
    }
    case 'hina':
      addSpikes(group, material, headY + 0.22, 5, 0.065, 0.2, 0.18);
      break;
    case 'shin':
      addSpikes(group, material, headY + 0.27, 7, 0.06, 0.24, 0.27);
      break;
    case 'gou': {
      const flatTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.34), material);
      flatTop.position.y = headY + 0.27;
      group.add(flatTop);
      break;
    }
    case 'yu': {
      const sideLock = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 5), material);
      sideLock.position.set(-0.19, headY + 0.14, -0.04);
      sideLock.rotation.z = 0.5;
      group.add(sideLock);
      break;
    }
  }
}

function blend(base: number, target: number, amount: number): number {
  return THREE.MathUtils.lerp(base, target, amount);
}

export class PlayerView {
  readonly group = new THREE.Group();
  private readonly heightScale: number;
  private readonly bodyScale: number;
  private readonly leftArm: THREE.Mesh;
  private readonly rightArm: THREE.Mesh;
  private readonly leftLeg: THREE.Mesh;
  private readonly rightLeg: THREE.Mesh;
  private readonly selectionRing: THREE.Mesh;
  private readonly numberTexture: THREE.CanvasTexture | null;
  private readonly phaseOffset: number;
  private activeMotion: PlayerMotion | null = null;
  private motionStartedAt = 0;

  constructor(
    readonly playerId: string,
    character: CharacterDefinition,
    side: 'home' | 'away',
  ) {
    this.heightScale = HEIGHT_SCALE[character.heightClass];
    this.bodyScale = bodyWidth(character);
    this.phaseOffset = [...playerId].reduce((sum, value) => sum + value.charCodeAt(0), 0) * 0.11;

    const jerseyColor = side === 'home' ? 0x102b48 : 0x7a2027;
    const accentColor = new THREE.Color(character.accent);
    const skin = new THREE.MeshToonMaterial({ color: SKIN_COLOR[character.id] });
    const jersey = new THREE.MeshToonMaterial({ color: jerseyColor });
    const accent = new THREE.MeshToonMaterial({ color: accentColor });
    const shorts = new THREE.MeshToonMaterial({ color: side === 'home' ? 0x091b2d : 0x401218 });
    const hair = new THREE.MeshToonMaterial({ color: HAIR_COLOR[character.id] });
    const shoe = new THREE.MeshToonMaterial({ color: 0xf4f7f8 });

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.66, 32),
      new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.025;
    this.selectionRing.visible = false;
    this.group.add(this.selectionRing);

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.29 * this.bodyScale, 0.68, 5, 9),
      jersey,
    );
    torso.position.y = 1.28 * this.heightScale;
    torso.scale.y = this.heightScale;
    torso.castShadow = true;
    this.group.add(torso);

    const shortsMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55 * this.bodyScale, 0.3, 0.34),
      shorts,
    );
    shortsMesh.position.y = 0.82 * this.heightScale;
    shortsMesh.castShadow = true;
    this.group.add(shortsMesh);

    const headY = 2.04 * this.heightScale;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), skin);
    head.position.y = headY;
    head.castShadow = true;
    this.group.add(head);
    addHair(this.group, character, hair, headY);

    const shoulderStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.7 * this.bodyScale, 0.075, 0.36),
      accent,
    );
    shoulderStripe.position.y = 1.59 * this.heightScale;
    this.group.add(shoulderStripe);

    const armGeometry = new THREE.CapsuleGeometry(0.075, 0.5, 4, 6);
    this.leftArm = new THREE.Mesh(armGeometry, skin);
    this.rightArm = new THREE.Mesh(armGeometry, skin);
    this.leftArm.position.set(-0.39 * this.bodyScale, 1.28 * this.heightScale, 0);
    this.rightArm.position.set(0.39 * this.bodyScale, 1.28 * this.heightScale, 0);
    this.leftArm.rotation.z = -0.12;
    this.rightArm.rotation.z = 0.12;
    this.leftArm.castShadow = true;
    this.rightArm.castShadow = true;
    this.group.add(this.leftArm, this.rightArm);

    const legGeometry = new THREE.CapsuleGeometry(0.085, 0.5, 4, 6);
    this.leftLeg = new THREE.Mesh(legGeometry, shorts);
    this.rightLeg = new THREE.Mesh(legGeometry, shorts);
    this.leftLeg.position.set(-0.17 * this.bodyScale, 0.44 * this.heightScale, 0);
    this.rightLeg.position.set(0.17 * this.bodyScale, 0.44 * this.heightScale, 0);
    this.leftLeg.scale.y = this.heightScale;
    this.rightLeg.scale.y = this.heightScale;
    this.leftLeg.castShadow = true;
    this.rightLeg.castShadow = true;
    this.group.add(this.leftLeg, this.rightLeg);

    for (const x of [-0.17, 0.17]) {
      const sneaker = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.1, 0.31), shoe);
      sneaker.position.set(x * this.bodyScale, 0.08, -0.05);
      sneaker.castShadow = true;
      this.group.add(sneaker);
    }

    this.numberTexture = createNumberTexture(JERSEY_NUMBER[character.id], character.accent);
    if (this.numberTexture) {
      const number = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32 * this.bodyScale, 0.32),
        new THREE.MeshBasicMaterial({
          map: this.numberTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      number.position.set(0, 1.31 * this.heightScale, -0.305 * this.bodyScale);
      number.rotation.y = Math.PI;
      this.group.add(number);
    }

    this.group.rotation.y = side === 'home' ? 0 : Math.PI;
  }

  setSelected(selected: boolean): void {
    this.selectionRing.visible = selected;
  }

  playAction(eventType: RuntimeEventType): void {
    const motion = motionFromRuntimeEvent(eventType);
    if (!motion) return;
    this.activeMotion = motion;
    this.motionStartedAt = performance.now();
  }

  update(player: PlayerState): void {
    this.group.position.set(player.position.x, player.position.y, player.position.z);

    const groundSpeed = Math.hypot(player.velocity.x, player.velocity.z);
    const runAmount = Math.min(1, groundSpeed / 7.5);
    const now = performance.now();
    const phase = now * 0.009 + this.phaseOffset;
    const swing = Math.sin(phase) * 0.55 * runAmount;

    const baseLeftArmX = player.isAirborne ? -1.05 : swing;
    const baseRightArmX = player.isAirborne ? -1.05 : -swing;
    const baseLeftLegX = player.isAirborne ? 0.16 : -swing * 0.65;
    const baseRightLegX = player.isAirborne ? -0.16 : swing * 0.65;
    const baseArmY = 1.28;
    const baseArmSpread = 0.39;

    let motionAmount = 0;
    let pose = this.activeMotion ? getPlayerMotionPose(this.activeMotion) : null;
    if (pose) {
      const elapsed = Math.max(0, now - this.motionStartedAt);
      if (elapsed >= pose.durationMs) {
        this.activeMotion = null;
        pose = null;
      } else {
        motionAmount = 1 - elapsed / pose.durationMs;
      }
    }

    const leftArmY = pose ? blend(baseArmY, pose.leftArmY, motionAmount) : baseArmY;
    const rightArmY = pose ? blend(baseArmY, pose.rightArmY, motionAmount) : baseArmY;
    const armSpread = pose ? blend(baseArmSpread, pose.armSpread, motionAmount) : baseArmSpread;

    this.leftArm.position.x = -armSpread * this.bodyScale;
    this.rightArm.position.x = armSpread * this.bodyScale;
    this.leftArm.position.y = leftArmY * this.heightScale;
    this.rightArm.position.y = rightArmY * this.heightScale;
    this.leftArm.rotation.x = pose
      ? blend(baseLeftArmX, pose.leftArmRotationX, motionAmount)
      : baseLeftArmX;
    this.rightArm.rotation.x = pose
      ? blend(baseRightArmX, pose.rightArmRotationX, motionAmount)
      : baseRightArmX;
    this.leftArm.rotation.z = pose
      ? blend(-0.12, pose.leftArmRotationZ, motionAmount)
      : -0.12;
    this.rightArm.rotation.z = pose
      ? blend(0.12, pose.rightArmRotationZ, motionAmount)
      : 0.12;
    this.leftLeg.rotation.x = pose
      ? blend(baseLeftLegX, pose.leftLegRotationX, motionAmount)
      : baseLeftLegX;
    this.rightLeg.rotation.x = pose
      ? blend(baseRightLegX, pose.rightLegRotationX, motionAmount)
      : baseRightLegX;

    const lateralLean = THREE.MathUtils.clamp(player.velocity.x * -0.018, -0.13, 0.13);
    this.group.rotation.z = lateralLean;
    const airborneStretch = player.isAirborne ? 1.025 : 1;
    this.group.scale.set(airborneStretch, airborneStretch, airborneStretch);
  }

  dispose(): void {
    this.numberTexture?.dispose();
  }
}
