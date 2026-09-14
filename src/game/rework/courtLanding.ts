import { COURT } from '../core/constants';
import type { TeamSide } from '../core/types';

export function isLandingInsideSide(
  x: number,
  z: number,
  side: TeamSide,
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (Math.abs(x) > COURT.width / 2) return false;

  return side === 'home'
    ? z <= 0 && z >= -COURT.length / 2
    : z >= 0 && z <= COURT.length / 2;
}
