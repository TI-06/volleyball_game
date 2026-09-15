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
  const extraFov = Math.max(0, Math.min(2.8, (spread - 7.1) * 0.72));
  const impactZoom = Math.max(0, Math.min(0.04, impactStrength));

  return {
    mode: REWORK_CAMERA_MODE,
    // Deeper home-corner framing keeps the service-line player fully visible
    // above the touch controls while preserving a single fixed rally view.
    position: { x: -7.8, y: 5.4, z: -16.5 },
    lookAt: { x: 0, y: -1.5, z: 0.8 },
    fov: 38 + extraFov - impactZoom * 16,
    impactZoom,
  };
}
