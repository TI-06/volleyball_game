import type { PlayerState } from '../../core/types';
import type { ReworkEvent } from '../types';

export type ToonPose =
  | 'IDLE'
  | 'MOVE'
  | 'RECEIVE'
  | 'SET'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK'
  | 'SERVE'
  | 'CELEBRATE';

export function poseForEvent(event: ReworkEvent): ToonPose | null {
  if (event.type === 'RECEIVE') return 'RECEIVE';
  if (event.type === 'SET') return 'SET';
  if (event.type === 'JUMP') return 'JUMP';
  if (event.type === 'SPIKE') return 'SPIKE';
  if (event.type === 'BLOCK') return 'BLOCK';
  if (event.type === 'SERVE') return 'SERVE';
  if (event.type === 'POINT') return 'CELEBRATE';
  return null;
}

export function poseForPlayerState(player: PlayerState): ToonPose {
  if (player.isAirborne) return 'JUMP';
  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  return horizontalSpeed > 0.25 ? 'MOVE' : 'IDLE';
}
