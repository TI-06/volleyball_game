import { getServeOrigin } from '../../actions/serve';
import type { PlayerState, Vec3 } from '../../core/types';

export function getReworkServeStagePosition(server: PlayerState): Vec3 {
  return getServeOrigin(server, 'FLOAT');
}
