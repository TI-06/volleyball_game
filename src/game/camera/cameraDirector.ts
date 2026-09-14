import type { MatchState, Vec3 } from '../core/types';

export type CameraMode = 'COURT' | 'PLAYER' | 'ACTION';
export type CameraSetting = 'STANDARD' | 'LOW' | 'OFF';

export interface CameraIntent {
  mode: CameraMode;
  position: Vec3;
  target: Vec3;
  transitionSeconds: number;
  fov: number;
}

interface CameraContext {
  controlledPlayerId?: string | null;
  setting?: CameraSetting;
}

const COURT_INTENT: CameraIntent = {
  mode: 'COURT',
  position: { x: 0, y: 10.4, z: -15.5 },
  target: { x: 0, y: 1.4, z: 0 },
  transitionSeconds: 0.28,
  fov: 48,
};

export function getCameraIntent(
  state: MatchState,
  context: CameraContext = {},
): CameraIntent {
  const setting = context.setting ?? 'STANDARD';
  if (setting === 'OFF' || state.rally.phase === 'SERVE_READY' || state.rally.phase === 'POINT') {
    return COURT_INTENT;
  }

  const controlled = state.players.find((player) => player.id === context.controlledPlayerId);
  const ballNearNet = Math.abs(state.ball.position.z) <= 2.4;
  const ballHigh = state.ball.position.y >= 2.25;
  const fastBall = Math.hypot(
    state.ball.velocity.x,
    state.ball.velocity.y,
    state.ball.velocity.z,
  ) >= 12;

  if (
    setting === 'STANDARD' &&
    controlled?.isAirborne &&
    ballNearNet &&
    ballHigh
  ) {
    const sideSign = controlled.side === 'home' ? -1 : 1;
    return {
      mode: 'ACTION',
      position: {
        x: controlled.position.x * 0.72,
        y: Math.max(3.4, controlled.position.y + 2.6),
        z: controlled.position.z + sideSign * 4.2,
      },
      target: {
        x: state.ball.position.x,
        y: Math.max(1.7, state.ball.position.y - 0.25),
        z: state.ball.position.z + -sideSign * 3.4,
      },
      transitionSeconds: 0.22,
      fov: 54,
    };
  }

  const ballOnHomeSide = state.ball.position.z <= 0;
  const receiveOrSetMoment =
    controlled?.side === 'home' &&
    ballOnHomeSide &&
    (state.ball.velocity.y < 0 || state.ball.lastTouchedBy?.startsWith('home-'));

  if (receiveOrSetMoment && !fastBall) {
    return {
      mode: 'PLAYER',
      position: {
        x: controlled.position.x * 0.55,
        y: 6.2,
        z: Math.min(-7.2, controlled.position.z - 5.2),
      },
      target: {
        x: (controlled.position.x + state.ball.position.x) / 2,
        y: Math.max(1.1, state.ball.position.y * 0.72),
        z: (controlled.position.z + state.ball.position.z) / 2,
      },
      transitionSeconds: 0.3,
      fov: 50,
    };
  }

  return COURT_INTENT;
}
