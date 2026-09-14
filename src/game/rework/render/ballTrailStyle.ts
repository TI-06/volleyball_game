import type { Vec3 } from '../../core/types';

const TRAIL_START_SPEED = 10;
const TRAIL_FULL_SPEED = 22;

export function getReworkBallTrailStrength(velocity: Vec3): number {
  const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
  if (!Number.isFinite(speed) || speed <= TRAIL_START_SPEED) return 0;
  return Math.max(0, Math.min(1, (speed - TRAIL_START_SPEED) / (TRAIL_FULL_SPEED - TRAIL_START_SPEED)));
}
