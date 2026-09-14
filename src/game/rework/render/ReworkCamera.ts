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
  const impactZoom = Math.max(0, Math.min(0.04, impactStrength));

  return {
    mode: REWORK_CAMERA_MODE,
    // From the negative-X sideline, home depth +Z projects screen-right.
    // That keeps the MovementStrip contract intuitive: BACK <- -> NET.
    position: { x: -20.5, y: 8.0, z: -6.2 },
    lookAt: { x: 0, y: 1.55, z: 0 },
    fov: 37 + extraFov - impactZoom * 30,
    impactZoom,
  };
}
