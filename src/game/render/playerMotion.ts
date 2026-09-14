import type { RuntimeEventType } from '../runtime/matchRuntime';

export type PlayerMotion =
  | 'SERVE'
  | 'RECEIVE'
  | 'DIVE'
  | 'SET'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK';

export interface PlayerMotionPose {
  leftArmY: number;
  rightArmY: number;
  armSpread: number;
  leftArmRotationX: number;
  rightArmRotationX: number;
  leftArmRotationZ: number;
  rightArmRotationZ: number;
  leftLegRotationX: number;
  rightLegRotationX: number;
  bodyPitch: number;
  durationMs: number;
}

const POSES: Record<PlayerMotion, PlayerMotionPose> = {
  SERVE: {
    leftArmY: 1.58,
    rightArmY: 1.92,
    armSpread: 0.31,
    leftArmRotationX: -0.78,
    rightArmRotationX: -0.16,
    leftArmRotationZ: -0.18,
    rightArmRotationZ: 0.08,
    leftLegRotationX: 0.08,
    rightLegRotationX: -0.18,
    bodyPitch: 0.06,
    durationMs: 420,
  },
  RECEIVE: {
    leftArmY: 1.02,
    rightArmY: 1.02,
    armSpread: 0.14,
    leftArmRotationX: -1.28,
    rightArmRotationX: -1.28,
    leftArmRotationZ: -0.12,
    rightArmRotationZ: 0.12,
    leftLegRotationX: 0.22,
    rightLegRotationX: 0.22,
    bodyPitch: -0.14,
    durationMs: 300,
  },
  DIVE: {
    leftArmY: 0.96,
    rightArmY: 0.96,
    armSpread: 0.18,
    leftArmRotationX: -1.52,
    rightArmRotationX: -1.52,
    leftArmRotationZ: -0.08,
    rightArmRotationZ: 0.08,
    leftLegRotationX: -0.16,
    rightLegRotationX: 0.28,
    bodyPitch: -0.34,
    durationMs: 500,
  },
  SET: {
    leftArmY: 1.76,
    rightArmY: 1.76,
    armSpread: 0.25,
    leftArmRotationX: -0.18,
    rightArmRotationX: -0.18,
    leftArmRotationZ: -0.08,
    rightArmRotationZ: 0.08,
    leftLegRotationX: 0.08,
    rightLegRotationX: -0.08,
    bodyPitch: 0,
    durationMs: 280,
  },
  JUMP: {
    leftArmY: 1.48,
    rightArmY: 1.48,
    armSpread: 0.37,
    leftArmRotationX: -1,
    rightArmRotationX: -1,
    leftArmRotationZ: -0.1,
    rightArmRotationZ: 0.1,
    leftLegRotationX: 0.18,
    rightLegRotationX: -0.18,
    bodyPitch: 0.04,
    durationMs: 220,
  },
  SPIKE: {
    leftArmY: 1.58,
    rightArmY: 1.98,
    armSpread: 0.32,
    leftArmRotationX: -0.94,
    rightArmRotationX: -0.08,
    leftArmRotationZ: -0.18,
    rightArmRotationZ: 0.04,
    leftLegRotationX: 0.24,
    rightLegRotationX: -0.24,
    bodyPitch: 0.12,
    durationMs: 380,
  },
  BLOCK: {
    leftArmY: 1.98,
    rightArmY: 1.98,
    armSpread: 0.19,
    leftArmRotationX: 0,
    rightArmRotationX: 0,
    leftArmRotationZ: -0.04,
    rightArmRotationZ: 0.04,
    leftLegRotationX: 0.12,
    rightLegRotationX: -0.12,
    bodyPitch: -0.02,
    durationMs: 360,
  },
};

export function motionFromRuntimeEvent(type: RuntimeEventType): PlayerMotion | null {
  return type === 'POINT' ? null : type;
}

export function getPlayerMotionPose(motion: PlayerMotion): PlayerMotionPose {
  return POSES[motion];
}
