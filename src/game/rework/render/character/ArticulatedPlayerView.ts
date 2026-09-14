import * as THREE from 'three';
import type { CharacterId } from '../../../characters/roster';
import type { MatchState, PlayerState, TeamSide } from '../../../core/types';
import type { ReworkEvent } from '../../types';
import {
  CHARACTER_SKINS,
  type CharacterPartName,
  type CharacterSkin,
  type CharacterVisualProfile,
} from './characterSkin';
import { MOTION_CLIPS, type MotionClipId } from './motionClips';
import { MotionPlayer, type MotionSample } from './motionPlayer';
import type { JointName, JointTransform } from './motionTypes';
import { resolveVisualIntent, type VisualIntent, type VisualIntentState } from './visualIntent';
import { DEFAULT_VISUAL_RIG, JOINT_NAMES } from './visualRig';

export type ArticulatedIntentInput = VisualIntentState;

const DEFAULT_BLEND_MS = 72;

const EVENT_SEQUENCES: Partial<Record<ReworkEvent['type'], readonly MotionClipId[]>> = {
  RECEIVE: ['receive_contact', 'receive_recover'],
  SET: ['set_contact', 'set_recover'],
  SERVE: ['serve_swing', 'serve_followthrough'],
  JUMP: ['spike_takeoff', 'spike_airborne_cock'],
  SPIKE: ['spike_contact', 'spike_followthrough', 'land'],
  BLOCK: ['block_press', 'block_land'],
};

const DIRECT_CLIP_BY_INTENT: Partial<Record<VisualIntent, MotionClipId>> = {
  READY: 'idle_ready',
  MOVE_LEFT: 'shuffle_left',
  MOVE_RIGHT: 'shuffle_right',
  MOVE_FORWARD: 'run_forward',
  MOVE_BACK: 'run_back',
  RECEIVE: 'receive_ready',
  SET: 'set_enter',
  CELEBRATE: 'celebrate_short',
  FRUSTRATED: 'frustrated_short',
};

const INTENT_SEQUENCES: Partial<Record<VisualIntent, readonly MotionClipId[]>> = {
  SERVE: ['serve_ready', 'serve_toss'],
  BLOCK: ['block_takeoff'],
  SPIKE_APPROACH: ['spike_approach_1', 'spike_approach_2', 'spike_plant'],
  SPIKE_JUMP: ['spike_takeoff', 'spike_airborne_cock'],
  SPIKE_CONTACT: ['spike_contact', 'spike_followthrough', 'land'],
};

const REPEATABLE_INTENTS = new Set<VisualIntent>([
  'MOVE_LEFT',
  'MOVE_RIGHT',
  'MOVE_FORWARD',
  'MOVE_BACK',
]);

export function isArticulatedCharacter(characterId: CharacterId): boolean {
  return CHARACTER_SKINS[characterId]?.id === characterId;
}

export class ArticulatedMotionController {
  private readonly motion = new MotionPlayer();
  private activeSequence: readonly MotionClipId[] | null = null;
  private sequenceIndex = 0;
  private sequenceIntent: VisualIntent | null = null;
  private clipStartedAtMs = 0;
  private currentIntent: VisualIntent | null = null;

  get currentClipId(): MotionClipId | null {
    return this.motion.currentClipId as MotionClipId | null;
  }

  private playClip(id: MotionClipId, nowMs: number, blendMs = DEFAULT_BLEND_MS): void {
    if (this.motion.currentClipId === id && this.clipStartedAtMs === nowMs) return;
    this.motion.play(MOTION_CLIPS[id], nowMs, this.motion.currentClipId ? blendMs : 0);
    this.clipStartedAtMs = nowMs;
  }

  private startSequence(
    clips: readonly MotionClipId[],
    intent: VisualIntent,
    nowMs: number,
  ): void {
    this.activeSequence = clips;
    this.sequenceIndex = 0;
    this.sequenceIntent = intent;
    this.currentIntent = intent;
    this.playClip(clips[0], nowMs);
  }

  private advanceSequence(nowMs: number): void {
    while (this.activeSequence) {
      const current = this.activeSequence[this.sequenceIndex];
      const duration = MOTION_CLIPS[current].durationMs;
      if (nowMs < this.clipStartedAtMs + duration) return;

      const nextIndex = this.sequenceIndex + 1;
      if (nextIndex >= this.activeSequence.length) {
        this.activeSequence = null;
        this.sequenceIndex = 0;
        this.sequenceIntent = null;
        return;
      }

      this.sequenceIndex = nextIndex;
      this.playClip(this.activeSequence[this.sequenceIndex], nowMs);
      return;
    }
  }

  private startIntent(intent: VisualIntent, nowMs: number): void {
    const sequence = INTENT_SEQUENCES[intent];
    if (sequence) {
      this.startSequence(sequence, intent, nowMs);
      return;
    }

    const clip = DIRECT_CLIP_BY_INTENT[intent] ?? 'idle_ready';
    this.activeSequence = null;
    this.sequenceIntent = null;
    this.currentIntent = intent;
    this.playClip(clip, nowMs);
  }

  private clipFinished(nowMs: number): boolean {
    const id = this.currentClipId;
    if (!id) return true;
    const clip = MOTION_CLIPS[id];
    if (clip.loop) return false;
    return nowMs >= this.clipStartedAtMs + clip.durationMs;
  }

  update(input: ArticulatedIntentInput, nowMs: number): MotionSample {
    this.advanceSequence(nowMs);

    if (input.contactEvent) {
      const sequence = EVENT_SEQUENCES[input.contactEvent.type];
      if (sequence) {
        this.startSequence(sequence, input.intent, nowMs);
        return this.motion.sample(nowMs);
      }
    }

    if (this.activeSequence) {
      const shouldInterruptApproach =
        this.sequenceIntent === 'SPIKE_APPROACH' && input.intent === 'SPIKE_JUMP';
      const shouldInterruptJump =
        this.sequenceIntent === 'SPIKE_JUMP' && input.intent === 'SPIKE_CONTACT';
      if (!shouldInterruptApproach && !shouldInterruptJump) {
        return this.motion.sample(nowMs);
      }
    }

    if (
      this.currentIntent !== input.intent ||
      !this.currentClipId ||
      (REPEATABLE_INTENTS.has(input.intent) && this.clipFinished(nowMs))
    ) {
      this.startIntent(input.intent, nowMs);
    }

    return this.motion.sample(nowMs);
  }
}

export interface PartLayout {
  joint: JointName;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  order: number;
}

export const ARTICULATED_PLAYER_DISPLAY_SCALE = 1.14;

export const ARTICULATED_PART_LAYOUT: Record<CharacterPartName, PartLayout> = {
  hairBack: { joint: 'head', width: 0.7, height: 0.7, offsetX: 0, offsetY: 0.04, order: 10 },
  head: { joint: 'head', width: 0.61, height: 0.66, offsetX: 0, offsetY: 0, order: 11 },
  face: { joint: 'head', width: 0.59, height: 0.62, offsetX: 0, offsetY: -0.01, order: 12 },
  hairFront: { joint: 'head', width: 0.7, height: 0.7, offsetX: 0, offsetY: 0.04, order: 13 },
  torso: { joint: 'chest', width: 0.68, height: 0.96, offsetX: 0, offsetY: -0.23, order: 8 },
  upperArmL: { joint: 'shoulderL', width: 0.52, height: 0.34, offsetX: -0.22, offsetY: -0.01, order: 7 },
  upperArmR: { joint: 'shoulderR', width: 0.52, height: 0.34, offsetX: 0.22, offsetY: -0.01, order: 7 },
  foreArmL: { joint: 'elbowL', width: 0.48, height: 0.3, offsetX: -0.21, offsetY: -0.01, order: 7 },
  foreArmR: { joint: 'elbowR', width: 0.48, height: 0.3, offsetX: 0.21, offsetY: -0.01, order: 7 },
  handL: { joint: 'wristL', width: 0.23, height: 0.21, offsetX: -0.08, offsetY: 0, order: 9 },
  handR: { joint: 'wristR', width: 0.23, height: 0.21, offsetX: 0.08, offsetY: 0, order: 9 },
  thighL: { joint: 'hipL', width: 0.35, height: 0.66, offsetX: 0, offsetY: -0.31, order: 6 },
  thighR: { joint: 'hipR', width: 0.35, height: 0.66, offsetX: 0, offsetY: -0.31, order: 6 },
  shinL: { joint: 'kneeL', width: 0.31, height: 0.64, offsetX: 0, offsetY: -0.29, order: 5 },
  shinR: { joint: 'kneeR', width: 0.31, height: 0.64, offsetX: 0, offsetY: -0.29, order: 5 },
  shoeL: { joint: 'ankleL', width: 0.4, height: 0.2, offsetX: -0.06, offsetY: -0.04, order: 6 },
  shoeR: { joint: 'ankleR', width: 0.4, height: 0.2, offsetX: 0.06, offsetY: -0.04, order: 6 },
};

const ATLAS_WIDTH = 640;
const ATLAS_HEIGHT = 512;
const atlasCache = new Map<string, THREE.Texture>();

function loadAtlas(url: string): THREE.Texture {
  const cached = atlasCache.get(url);
  if (cached) return cached;
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  atlasCache.set(url, texture);
  return texture;
}

function partTexture(skin: CharacterSkin, part: CharacterPartName): THREE.Texture {
  const source = loadAtlas(skin.atlasUrl);
  const rect = skin.atlasRects[part];
  const texture = source.clone();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(rect.width / ATLAS_WIDTH, rect.height / ATLAS_HEIGHT);
  texture.offset.set(
    rect.x / ATLAS_WIDTH,
    1 - (rect.y + rect.height) / ATLAS_HEIGHT,
  );
  texture.needsUpdate = true;
  return texture;
}

function partScale(
  part: CharacterPartName,
  visual: CharacterVisualProfile,
): { x: number; y: number } {
  if (part === 'head' || part === 'face' || part === 'hairFront' || part === 'hairBack') {
    return { x: visual.headScale, y: visual.headScale };
  }
  if (part === 'torso') return { x: visual.shoulderScale, y: 1 };
  if (
    part === 'upperArmL' ||
    part === 'upperArmR' ||
    part === 'foreArmL' ||
    part === 'foreArmR'
  ) {
    return { x: visual.armScale, y: 1 };
  }
  if (part === 'handL' || part === 'handR') {
    const handScale = 0.75 + visual.armScale * 0.25;
    return { x: handScale, y: handScale };
  }
  if (part === 'thighL' || part === 'thighR' || part === 'shinL' || part === 'shinR') {
    return { x: 1, y: visual.legScale };
  }
  if (part === 'shoeL' || part === 'shoeR') {
    return { x: 0.8 + visual.legScale * 0.2, y: 1 };
  }
  return { x: 1, y: 1 };
}

function profiledTransform(
  jointName: JointName,
  transform: JointTransform,
  visual: CharacterVisualProfile,
  clipId: MotionClipId | null,
): JointTransform {
  let x = transform.x;
  let y = transform.y;

  if (jointName === 'shoulderL' || jointName === 'shoulderR') {
    x *= visual.shoulderScale;
  }
  if (
    jointName === 'elbowL' ||
    jointName === 'elbowR' ||
    jointName === 'wristL' ||
    jointName === 'wristR'
  ) {
    x *= visual.armScale;
    y *= visual.armScale;
  }
  if (
    jointName === 'kneeL' ||
    jointName === 'kneeR' ||
    jointName === 'ankleL' ||
    jointName === 'ankleR'
  ) {
    y *= visual.legScale;
  }
  if (jointName === 'root' && clipId?.startsWith('spike_approach_')) {
    x *= visual.approachStride;
  }
  if (jointName === 'root' && clipId === 'land') {
    y -= 0.025 * visual.landingWeight;
  }

  return { ...transform, x, y };
}

export class ArticulatedPlayerView {
  readonly group = new THREE.Group();
  private readonly bodyRoot = new THREE.Group();
  private readonly joints = new Map<JointName, THREE.Group>();
  private readonly partMeshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly partTextures: THREE.Texture[] = [];
  private readonly selectionRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly controller = new ArticulatedMotionController();
  private readonly skin: CharacterSkin;
  private pendingEvent: ReworkEvent | null = null;

  constructor(
    characterId: CharacterId,
    private readonly side: TeamSide,
  ) {
    const skin = CHARACTER_SKINS[characterId];
    if (!skin) throw new Error(`Missing CharacterSkin for ${characterId}`);
    this.skin = skin;

    for (const jointName of JOINT_NAMES) {
      this.joints.set(jointName, new THREE.Group());
    }
    for (const jointName of JOINT_NAMES) {
      const joint = this.joints.get(jointName)!;
      const parentName = DEFAULT_VISUAL_RIG.parentByJoint[jointName];
      if (parentName) this.joints.get(parentName)!.add(joint);
      else this.bodyRoot.add(joint);
    }

    for (const [partName, layout] of Object.entries(ARTICULATED_PART_LAYOUT) as [
      CharacterPartName,
      PartLayout,
    ][]) {
      const texture = partTexture(skin, partName);
      this.partTextures.push(texture);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.04,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(layout.width, layout.height), material);
      const scale = partScale(partName, skin.visual);
      mesh.scale.set(scale.x, scale.y, 1);
      mesh.position.set(layout.offsetX, layout.offsetY, layout.order * 0.0015);
      mesh.renderOrder = layout.order;
      this.joints.get(layout.joint)!.add(mesh);
      this.partMeshes.push(mesh);
    }

    this.bodyRoot.scale.setScalar(
      skin.visual.heightScale * ARTICULATED_PLAYER_DISPLAY_SCALE,
    );
    this.bodyRoot.rotation.y = this.side === 'home' ? -0.08 : 0.08;
    this.group.add(this.bodyRoot);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 28),
      new THREE.MeshBasicMaterial({
        color: 0x02060a,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.018;
    this.shadow.scale.set(1.2, 0.72, 1);
    this.group.add(this.shadow);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.86, 32),
      new THREE.MeshBasicMaterial({
        color: 0x59f4df,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.026;
    this.selectionRing.visible = false;
    this.group.add(this.selectionRing);
  }

  setFocused(focused: boolean): void {
    this.selectionRing.visible = focused;
  }

  observeEvent(event: ReworkEvent): void {
    this.pendingEvent = event;
  }

  playEvent(event: ReworkEvent): void {
    this.observeEvent(event);
  }

  private applySample(sample: MotionSample): void {
    const clipId = this.controller.currentClipId;
    for (const jointName of JOINT_NAMES) {
      const joint = this.joints.get(jointName)!;
      const transform = profiledTransform(
        jointName,
        sample.pose[jointName],
        this.skin.visual,
        clipId,
      );
      joint.position.set(transform.x, transform.y, 0);
      joint.rotation.set(0, 0, transform.rotation);
      joint.scale.set(transform.scaleX, transform.scaleY, 1);
    }
  }

  update(player: PlayerState, match: MatchState, nowMs: number): void {
    const intent = resolveVisualIntent(match, player, this.pendingEvent);
    const visualNowMs = nowMs * this.skin.visual.motionSpeed;
    const sample = this.controller.update(intent, visualNowMs);
    this.pendingEvent = null;
    this.applySample(sample);

    this.group.position.set(player.position.x, 0, player.position.z);
    this.bodyRoot.position.y = Math.max(0, player.position.y * this.skin.visual.jumpVisualScale);

    const airborne = Math.max(0, player.position.y * this.skin.visual.jumpVisualScale);
    const shadowScale = Math.max(0.62, 1 - airborne * 0.16);
    this.shadow.scale.set(1.2 * shadowScale, 0.72 * shadowScale, 1);
    this.shadow.material.opacity = Math.max(0.12, 0.32 - airborne * 0.08);
  }

  dispose(): void {
    for (const mesh of this.partMeshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    for (const texture of this.partTextures) texture.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.selectionRing.geometry.dispose();
    this.selectionRing.material.dispose();
  }
}
