import * as THREE from 'three';
import type { CharacterDefinition, CharacterId, HeightClass } from '../../characters/roster';
import type { PlayerState, TeamSide } from '../../core/types';
import type { ReworkEvent } from '../types';
import { poseForEvent, poseForPlayerState, type ToonPose } from './toonPresentation';

const HEIGHT_BY_CLASS: Record<HeightClass, number> = {
  SHORT: 1.9,
  MEDIUM: 2.02,
  TALL: 2.16,
  VERY_TALL: 2.3,
};

const NUMBER_BY_CHARACTER: Record<CharacterId, string> = {
  kai: '10',
  ren: '6',
  hina: '4',
  shin: '7',
  gou: '3',
  yu: '11',
};

const HAIR_BY_CHARACTER: Record<CharacterId, string> = {
  kai: '#102339',
  ren: '#5d647d',
  hina: '#342b46',
  shin: '#692b2d',
  gou: '#201c22',
  yu: '#7b4d36',
};

const ACTION_DURATION_MS: Partial<Record<ToonPose, number>> = {
  RECEIVE: 360,
  SET: 320,
  SPIKE: 360,
  BLOCK: 330,
  SERVE: 420,
  CELEBRATE: 650,
};

interface PoseRig {
  hip: [number, number];
  shoulder: [number, number];
  head: [number, number];
  leftHand: [number, number];
  rightHand: [number, number];
  leftFoot: [number, number];
  rightFoot: [number, number];
  lean: number;
}

function rigForPose(pose: ToonPose): PoseRig {
  if (pose === 'RECEIVE') {
    return {
      hip: [256, 330], shoulder: [246, 240], head: [230, 164],
      leftHand: [212, 342], rightHand: [270, 346],
      leftFoot: [190, 454], rightFoot: [314, 450], lean: -0.18,
    };
  }
  if (pose === 'SET') {
    return {
      hip: [256, 330], shoulder: [256, 236], head: [256, 158],
      leftHand: [210, 126], rightHand: [304, 126],
      leftFoot: [218, 454], rightFoot: [294, 454], lean: 0,
    };
  }
  if (pose === 'SPIKE') {
    return {
      hip: [246, 326], shoulder: [258, 228], head: [242, 150],
      leftHand: [188, 250], rightHand: [325, 94],
      leftFoot: [218, 450], rightFoot: [292, 434], lean: 0.1,
    };
  }
  if (pose === 'BLOCK') {
    return {
      hip: [256, 326], shoulder: [256, 228], head: [256, 150],
      leftHand: [214, 78], rightHand: [298, 78],
      leftFoot: [226, 454], rightFoot: [286, 454], lean: 0,
    };
  }
  if (pose === 'SERVE') {
    return {
      hip: [246, 330], shoulder: [252, 236], head: [238, 160],
      leftHand: [188, 158], rightHand: [322, 122],
      leftFoot: [208, 454], rightFoot: [302, 446], lean: 0.08,
    };
  }
  if (pose === 'JUMP') {
    return {
      hip: [250, 318], shoulder: [255, 220], head: [248, 144],
      leftHand: [202, 152], rightHand: [308, 126],
      leftFoot: [222, 436], rightFoot: [300, 418], lean: 0.04,
    };
  }
  if (pose === 'MOVE') {
    return {
      hip: [252, 328], shoulder: [258, 236], head: [250, 158],
      leftHand: [190, 286], rightHand: [320, 246],
      leftFoot: [202, 454], rightFoot: [316, 430], lean: 0.06,
    };
  }
  if (pose === 'CELEBRATE') {
    return {
      hip: [256, 326], shoulder: [256, 232], head: [256, 154],
      leftHand: [182, 112], rightHand: [330, 112],
      leftFoot: [222, 454], rightFoot: [292, 454], lean: 0,
    };
  }
  return {
    hip: [256, 332], shoulder: [256, 240], head: [256, 162],
    leftHand: [202, 312], rightHand: [310, 312],
    leftFoot: [220, 454], rightFoot: [292, 454], lean: 0,
  };
}

function line(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  width: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  id: CharacterId,
  x: number,
  y: number,
): void {
  const hair = HAIR_BY_CHARACTER[id];
  ctx.fillStyle = hair;
  ctx.beginPath();
  if (id === 'hina') {
    ctx.moveTo(x - 42, y - 26); ctx.lineTo(x - 20, y - 60); ctx.lineTo(x - 3, y - 40);
    ctx.lineTo(x + 16, y - 66); ctx.lineTo(x + 40, y - 30); ctx.lineTo(x + 42, y + 2);
  } else if (id === 'gou') {
    ctx.roundRect(x - 44, y - 52, 88, 62, 22);
  } else if (id === 'ren' || id === 'yu') {
    ctx.moveTo(x - 43, y - 20); ctx.lineTo(x - 16, y - 63); ctx.lineTo(x + 2, y - 42);
    ctx.lineTo(x + 26, y - 65); ctx.lineTo(x + 44, y - 16); ctx.lineTo(x + 38, y + 10);
  } else {
    ctx.moveTo(x - 44, y - 14); ctx.lineTo(x - 27, y - 58); ctx.lineTo(x - 10, y - 36);
    ctx.lineTo(x + 4, y - 70); ctx.lineTo(x + 20, y - 38); ctx.lineTo(x + 43, y - 58);
    ctx.lineTo(x + 45, y + 8);
  }
  ctx.closePath();
  ctx.fill();
}

function makeTexture(
  character: CharacterDefinition,
  side: TeamSide,
  pose: ToonPose,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.clearRect(0, 0, 512, 512);

  const rig = rigForPose(pose);
  const skin = '#f2c8a8';
  const outline = '#0a1220';
  const jersey = side === 'home' ? '#123a62' : '#6f2431';
  const shorts = side === 'home' ? '#071725' : '#2a1018';
  const accent = character.accent;

  ctx.save();
  ctx.translate(256, 300);
  ctx.rotate(rig.lean);
  ctx.translate(-256, -300);

  line(ctx, rig.hip, rig.leftFoot, 34, outline);
  line(ctx, rig.hip, rig.rightFoot, 34, outline);
  line(ctx, rig.hip, rig.leftFoot, 23, shorts);
  line(ctx, rig.hip, rig.rightFoot, 23, shorts);

  const leftShoulder: [number, number] = [rig.shoulder[0] - 40, rig.shoulder[1] + 6];
  const rightShoulder: [number, number] = [rig.shoulder[0] + 40, rig.shoulder[1] + 6];
  line(ctx, leftShoulder, rig.leftHand, 27, outline);
  line(ctx, rightShoulder, rig.rightHand, 27, outline);
  line(ctx, leftShoulder, rig.leftHand, 17, skin);
  line(ctx, rightShoulder, rig.rightHand, 17, skin);

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.roundRect(rig.shoulder[0] - 62, rig.shoulder[1] - 14, 124, 124, 34);
  ctx.fill();
  ctx.fillStyle = jersey;
  ctx.beginPath();
  ctx.roundRect(rig.shoulder[0] - 53, rig.shoulder[1] - 5, 106, 105, 28);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(rig.shoulder[0] - 48, rig.shoulder[1] + 8, 96, 10);

  ctx.fillStyle = '#f7fbff';
  ctx.font = '700 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(NUMBER_BY_CHARACTER[character.id], rig.shoulder[0], rig.shoulder[1] + 67);

  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(rig.head[0], rig.head[1], 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(rig.head[0], rig.head[1], 45, 0, Math.PI * 2);
  ctx.fill();
  drawHair(ctx, character.id, rig.head[0], rig.head[1]);

  ctx.strokeStyle = outline;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rig.head[0] - 24, rig.head[1] + 5);
  ctx.lineTo(rig.head[0] - 8, rig.head[1] + 1);
  ctx.moveTo(rig.head[0] + 8, rig.head[1] + 1);
  ctx.lineTo(rig.head[0] + 24, rig.head[1] + 5);
  ctx.stroke();

  ctx.fillStyle = '#f3f6fa';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 7;
  for (const foot of [rig.leftFoot, rig.rightFoot]) {
    ctx.beginPath();
    ctx.ellipse(foot[0], foot[1], 30, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export class ToonPlayerProxy {
  readonly group = new THREE.Group();
  private readonly sprite: THREE.Sprite;
  private readonly selectionRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly textures = new Map<ToonPose, THREE.CanvasTexture>();
  private actionPose: ToonPose | null = null;
  private actionUntil = 0;
  private currentPose: ToonPose = 'IDLE';
  private readonly height: number;
  private lastGroundPosition: { x: number; z: number } | null = null;

  constructor(
    private readonly character: CharacterDefinition,
    private readonly side: TeamSide,
  ) {
    this.height = HEIGHT_BY_CLASS[character.heightClass];
    for (const pose of ['IDLE', 'MOVE', 'RECEIVE', 'SET', 'JUMP', 'SPIKE', 'BLOCK', 'SERVE', 'CELEBRATE'] as const) {
      this.textures.set(pose, makeTexture(character, side, pose));
    }

    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.textures.get('IDLE'),
      transparent: true,
      depthWrite: false,
      alphaTest: 0.08,
    }));
    this.sprite.scale.set(this.height * 0.9, this.height, 1);
    this.sprite.position.y = this.height / 2;
    this.group.add(this.sprite);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.54, 28),
      new THREE.MeshBasicMaterial({ color: 0x02060a, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.018;
    this.shadow.scale.set(1.2, 0.72, 1);
    this.group.add(this.shadow);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.76, 32),
      new THREE.MeshBasicMaterial({ color: 0x59f4df, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.026;
    this.selectionRing.visible = false;
    this.group.add(this.selectionRing);
  }

  setFocused(focused: boolean): void {
    this.selectionRing.visible = focused;
  }

  playEvent(event: ReworkEvent): void {
    const pose = poseForEvent(event);
    if (!pose) return;
    this.actionPose = pose;
    this.actionUntil = performance.now() + (ACTION_DURATION_MS[pose] ?? 230);
  }

  update(player: PlayerState): void {
    const now = performance.now();
    if (this.actionPose && now >= this.actionUntil) {
      this.actionPose = null;
    }

    let moved = false;
    if (this.lastGroundPosition && !player.isAirborne) {
      const distance = Math.hypot(
        player.position.x - this.lastGroundPosition.x,
        player.position.z - this.lastGroundPosition.z,
      );
      moved = distance > 0.006 && distance < 0.75;
    }
    this.lastGroundPosition = { x: player.position.x, z: player.position.z };

    const statePose = player.isAirborne
      ? 'JUMP'
      : moved
        ? 'MOVE'
        : poseForPlayerState(player);
    const pose = this.actionPose ?? statePose;
    if (pose !== this.currentPose) {
      this.currentPose = pose;
      this.sprite.material.map = this.textures.get(pose) ?? this.textures.get('IDLE')!;
      this.sprite.material.needsUpdate = true;
    }

    this.group.position.set(player.position.x, 0, player.position.z);
    this.sprite.position.y = player.position.y + this.height / 2;
    const airborne = Math.max(0, player.position.y);
    const shadowScale = Math.max(0.62, 1 - airborne * 0.16);
    this.shadow.scale.set(1.2 * shadowScale, 0.72 * shadowScale, 1);
    this.shadow.material.opacity = Math.max(0.12, 0.32 - airborne * 0.08);
  }

  dispose(): void {
    for (const texture of this.textures.values()) texture.dispose();
    this.sprite.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
    this.selectionRing.geometry.dispose();
    this.selectionRing.material.dispose();
  }
}
