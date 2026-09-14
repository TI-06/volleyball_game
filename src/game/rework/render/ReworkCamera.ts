import { COURT } from '../../core/constants';
import type { MatchState, Vec3 } from '../../core/types';

export const REWORK_CAMERA_MODE = 'FIXED_2_5D' as const;

export interface ReworkCameraFrame {
  mode: typeof REWORK_CAMERA_MODE;
  position: Vec3;
  lookAt: Vec3;
  fov: number;
  impactZoom: number;
}

function maxRallySpread(state: MatchState): number {
  const focus = state.players.find((player) => player.id === 'home-0');
  const liveSpread = focus
    ? Math.max(Math.abs(state.ball.position.z), Math.abs(focus.position.z))
    : Math.abs(state.ball.position.z);
  if (state.rally.phase !== 'SERVE_READY') return liveSpread;
  return Math.max(liveSpread, COURT.length / 2 + 0.35);
}

export function getReworkCameraFrame(
  state: MatchState,
  impactStrength = 0,
): ReworkCameraFrame {
  const spread = maxRallySpread(state);
  const extraFov = Math.max(0, Math.min(3.2, (spread - 7.1) * 0.92));
  const impactZoom = Math.max(0, Math.min(0.04, impactStrength));

  return {
    mode: REWORK_CAMERA_MODE,
    // Low home-corner framing: the controlled side reads large in the foreground,
    // the net stays central, and the away side remains visible for return timing.
    position: { x: -8.8, y: 4.65, z: -12.65 },
    lookAt: { x: 0.25, y: 1.08, z: 0.72 },
    fov: 36 + extraFov - impactZoom * 18,
    impactZoom,
  };
}
