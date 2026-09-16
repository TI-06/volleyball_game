import type { V3Vec2 } from '../types';

export const V3_HOME_COURT_BOUNDS = {
  minX: -4.25,
  maxX: 4.25,
  minZ: -8.55,
  maxZ: -0.45,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function normalizeMoveInput(input: V3Vec2): V3Vec2 {
  const x = finiteOrZero(input.x);
  const z = finiteOrZero(input.z);
  const magnitude = Math.hypot(x, z);
  if (magnitude <= 1 || magnitude === 0) return { x, z };
  return { x: x / magnitude, z: z / magnitude };
}

export function moveControlledPlayer(
  position: V3Vec2,
  input: V3Vec2,
  speed: number,
  dt: number,
): V3Vec2 {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 0;
  const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const move = normalizeMoveInput(input);
  return {
    x: clamp(
      finiteOrZero(position.x) + move.x * safeSpeed * safeDt,
      V3_HOME_COURT_BOUNDS.minX,
      V3_HOME_COURT_BOUNDS.maxX,
    ),
    z: clamp(
      finiteOrZero(position.z) + move.z * safeSpeed * safeDt,
      V3_HOME_COURT_BOUNDS.minZ,
      V3_HOME_COURT_BOUNDS.maxZ,
    ),
  };
}
