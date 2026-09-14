import type { TeamSide, Vec3 } from '../../../core/types';

const TEAM_YAW_BIAS = 0.045;

export function getArticulatedFacingYaw(
  cameraPosition: Vec3,
  playerPosition: Vec3,
  side: TeamSide,
): number {
  const dx = cameraPosition.x - playerPosition.x;
  const dz = cameraPosition.z - playerPosition.z;
  const cameraYaw = Math.atan2(dx, dz);
  return cameraYaw + (side === 'home' ? TEAM_YAW_BIAS : -TEAM_YAW_BIAS);
}
