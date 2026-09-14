import type { CpuDifficulty } from './difficulty';
import type { Vec3 } from '../core/types';

export interface ServeTargetReceiver {
  id: string;
  x: number;
  z: number;
  receive: number;
}

const TUTORIAL_SEED = 1;

const DIFFICULTY_SALT: Record<CpuDifficulty, number> = {
  BEGINNER: 0x101,
  NORMAL: 0x202,
  HARD: 0x303,
  EXPERT: 0x404,
  MASTER: 0x505,
};

const OPEN_COURT_TARGETS: readonly Vec3[] = [
  { x: 0, y: 0, z: -7.4 },
  { x: -3.5, y: 0, z: -7.0 },
  { x: 3.5, y: 0, z: -7.0 },
  { x: -1.3, y: 0, z: -6.4 },
  { x: 1.3, y: 0, z: -6.4 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed = (mixed ^ (mixed >>> 15)) >>> 0;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function random01(seed: number, rallyIndex: number, salt: number): number {
  const mixedInput =
    (seed >>> 0) ^
    Math.imul((rallyIndex + 1) >>> 0, 0x9e3779b9) ^
    (salt >>> 0);
  return mix32(mixedInput) / 0x100000000;
}

function nearestReceiverDistance(
  target: Vec3,
  receivers: readonly ServeTargetReceiver[],
): number {
  return Math.min(
    ...receivers.map((receiver) => Math.hypot(receiver.x - target.x, receiver.z - target.z)),
  );
}

function chooseOpenCourtTarget(
  receivers: readonly ServeTargetReceiver[],
  seed: number,
  rallyIndex: number,
): Vec3 {
  const ranked = OPEN_COURT_TARGETS.map((target, index) => ({
    target,
    score:
      nearestReceiverDistance(target, receivers) +
      random01(seed, rallyIndex, 0x5000 + index) * 0.32,
  })).sort((a, b) => b.score - a.score);

  const topCount = Math.min(3, ranked.length);
  const choice = Math.floor(random01(seed, rallyIndex, 0x5f17) * topCount);
  return ranked[choice]?.target ?? OPEN_COURT_TARGETS[0];
}

function weakestReceiver(receivers: readonly ServeTargetReceiver[]): ServeTargetReceiver {
  return [...receivers].sort((a, b) => a.receive - b.receive)[0]!;
}

function strongestReceiver(receivers: readonly ServeTargetReceiver[]): ServeTargetReceiver {
  return [...receivers].sort((a, b) => b.receive - a.receive)[0]!;
}

function clampTarget(target: Vec3): Vec3 {
  return {
    x: clamp(target.x, -4.2, 4.2),
    y: 0,
    z: clamp(target.z, -8.2, -3.8),
  };
}

export function chooseCpuServeTarget(
  difficulty: CpuDifficulty,
  matchSeed: number,
  rallyIndex: number,
  receivers: readonly ServeTargetReceiver[],
): Vec3 {
  if (receivers.length === 0) {
    return { x: 0, y: 0, z: -5.6 };
  }

  if (matchSeed === TUTORIAL_SEED && rallyIndex === 0) {
    const tutorialReceiver = strongestReceiver(receivers);
    return clampTarget({
      x: tutorialReceiver.x,
      y: 0,
      z: tutorialReceiver.z - 0.3,
    });
  }

  const seeded = (matchSeed >>> 0) ^ DIFFICULTY_SALT[difficulty];
  const modeRoll = random01(seeded, rallyIndex, 0x1111);
  const jitterX = random01(seeded, rallyIndex, 0x2222) - 0.5;
  const jitterZ = random01(seeded, rallyIndex, 0x3333) - 0.5;
  const weak = weakestReceiver(receivers);

  if (difficulty === 'BEGINNER') {
    return clampTarget({
      x: (modeRoll - 0.5) * 3.2,
      y: 0,
      z: -5.45 + jitterZ * 0.8,
    });
  }

  if (difficulty === 'NORMAL') {
    if (modeRoll < 0.3) {
      return clampTarget({
        x: weak.x + jitterX * 0.8,
        y: 0,
        z: weak.z - 0.35 + jitterZ * 0.5,
      });
    }

    const receiverIndex = Math.min(
      receivers.length - 1,
      Math.floor(random01(seeded, rallyIndex, 0x4444) * receivers.length),
    );
    const receiver = receivers[receiverIndex] ?? weak;
    return clampTarget({
      x: receiver.x + jitterX,
      y: 0,
      z: receiver.z - 0.3 + jitterZ * 0.6,
    });
  }

  const weakChance = difficulty === 'HARD' ? 0.55 : difficulty === 'EXPERT' ? 0.62 : 0.5;
  if (modeRoll < weakChance) {
    return clampTarget({
      x: weak.x + jitterX * 0.9,
      y: 0,
      z: weak.z - 0.55 + jitterZ * 0.5,
    });
  }

  const openTarget = chooseOpenCourtTarget(receivers, seeded, rallyIndex);
  return clampTarget({
    x: openTarget.x + jitterX * 0.55,
    y: 0,
    z: openTarget.z + jitterZ * 0.35,
  });
}
