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
  const extraFov = Math.max(0, Math.min(4, (spread - 7.2) * 1.05));
  const impactZoom = Math.max(0, Math.min(0.04, impactStrength));

  return {
    mode: REWORK_CAMERA_MODE,
    // From the negative-X sideline, home depth +Z projects screen-right.
    // Keep the whole serve runway visible, but frame rallies much closer so
    // articulated poses are readable on a phone rather than tiny silhouettes.
    position: { x: -17.8, y: 6.2, z: -5.3 },
    lookAt: { x: 0, y: 0.72, z: 0.15 },
    fov: 32 + extraFov - impactZoom * 24,
    impactZoom,
  };
}
