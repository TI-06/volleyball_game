import type { V3Vec2 } from '../types';

export const STANDING_RECEIVE_REACH_METERS = 1.35;
export const DIVE_REACH_METERS = 2.55;
export const DIVE_RECOVERY_SECONDS = 0.85;

export interface V3DiveState {
  direction: V3Vec2;
  reachMeters: number;
  startedAt: number;
  recoveryUntil: number;
}

function normalize(direction: V3Vec2): V3Vec2 {
  const x = Number.isFinite(direction.x) ? direction.x : 0;
  const z = Number.isFinite(direction.z) ? direction.z : 0;
  const length = Math.hypot(x, z);
  if (length <= 0.0001) return { x: 0, z: -1 };
  return { x: x / length, z: z / length };
}

export function createDiveState(direction: V3Vec2, now: number): V3DiveState {
  const startedAt = Number.isFinite(now) ? now : 0;
  return {
    direction: normalize(direction),
    reachMeters: DIVE_REACH_METERS,
    startedAt,
    recoveryUntil: startedAt + DIVE_RECOVERY_SECONDS,
  };
}

export function canStartDive(previous: V3DiveState | null, now: number): boolean {
  if (!previous) return true;
  if (!Number.isFinite(now)) return false;
  return now >= previous.recoveryUntil;
}
