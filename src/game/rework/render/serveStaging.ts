import { COURT } from '../../core/constants';
import type { PlayerState, Vec3 } from '../../core/types';

export function getReworkServeStagePosition(server: PlayerState): Vec3 {
  const sideSign = server.side === 'home' ? -1 : 1;
  const towardNet = -sideSign;
  const handSide = server.side === 'home' ? -1 : 1;
  return {
    x: server.position.x + handSide * 0.3,
    y: 1.46,
    z: sideSign * (COURT.length / 2 + 0.35) + towardNet * 0.22,
  };
}
