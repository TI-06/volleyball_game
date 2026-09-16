import type { V3TeamSide } from '../../types';

/**
 * V3 character rigs define positive local Z as their visual forward axis.
 * Home players therefore face +Z toward the net, while away players rotate
 * 180 degrees to face -Z back toward the net.
 */
export function getV3PlayerFacingRotation(side: V3TeamSide): number {
  return side === 'home' ? 0 : Math.PI;
}
