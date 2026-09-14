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
  if (!focus) return Math.abs(state.ball.position.z);
  return Math.max(Math.abs(state.ball.position.z), Math.abs(focus.position.z));
}

export function getReworkCameraFrame(
  state: MatchState,
  impactStrength = 0,
): ReworkCameraFrame {
  const spread = maxRallySpread(state);
  const extraFov = Math.max(0, Math.min(5, (spread - 6.5) * 1.15));
  const impactZoom = Math.max(0, Math.min(0.05, impactStrength));

  return {
    mode: REWORK_CAMERA_MODE,
    position: { x: 19.5, y: 7.4, z: -0.65 },
    lookAt: { x: 0, y: 1.65, z: 0 },
    fov: 36 + extraFov - impactZoom * 35,
    impactZoom,
  };
}
