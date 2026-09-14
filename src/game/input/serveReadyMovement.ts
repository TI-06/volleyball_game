import type { RallyPhase } from '../core/types';

export function constrainServeReadyMove(
  phase: RallyPhase,
  move: { x: number; z: number },
): { x: number; z: number } {
  return phase === 'SERVE_READY' ? { x: move.x, z: 0 } : move;
}
