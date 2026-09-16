import type { V3ContactQuality } from '../types';

export type V3SetLane = 'LEFT' | 'MIDDLE' | 'RIGHT';
export type V3SetTrajectory = 'LOW' | 'NORMAL' | 'HIGH';

export interface V3SetPlan {
  lane: V3SetLane;
  trajectory: V3SetTrajectory;
}

export interface SetPlanInput {
  directionX: number;
  holdSeconds: number;
  receiveQuality: V3ContactQuality;
}

function laneFromDirection(directionX: number): V3SetLane {
  const x = Number.isFinite(directionX) ? directionX : 0;
  if (x <= -0.35) return 'LEFT';
  if (x >= 0.35) return 'RIGHT';
  return 'MIDDLE';
}

function trajectoryFromHold(holdSeconds: number): V3SetTrajectory {
  const hold = Number.isFinite(holdSeconds) ? Math.max(0, holdSeconds) : 0;
  if (hold <= 0.18) return 'LOW';
  if (hold <= 0.55) return 'NORMAL';
  return 'HIGH';
}

export function selectSetPlan(input: SetPlanInput): V3SetPlan | null {
  if (input.receiveQuality === 'MISS') return null;
  let trajectory = trajectoryFromHold(input.holdSeconds);
  if (input.receiveQuality === 'BAD' && trajectory === 'LOW') trajectory = 'NORMAL';
  return {
    lane: laneFromDirection(input.directionX),
    trajectory,
  };
}
