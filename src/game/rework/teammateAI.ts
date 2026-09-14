import { predictLanding } from '../ball/ballPhysics';
import type { MatchState, Vec3 } from '../core/types';

export type ReworkTeammateRole = 'RECEIVE' | 'SET' | 'COVER' | 'APPROACH' | 'BASE';

export interface ReworkTeammateDecision {
  playerId: 'home-1' | 'home-2';
  role: ReworkTeammateRole;
  target: Vec3;
}

const REN_BASE: Vec3 = { x: 0, y: 0, z: -2.0 };
const HINA_BASE: Vec3 = { x: 2.6, y: 0, z: -5.4 };
const COVER_TARGET: Vec3 = { x: 0, y: 0, z: -3.3 };

function firstTouchByHome(state: MatchState): boolean {
  return (
    (state.ball.lastContact === 'RECEIVE' ||
      state.ball.lastContact === 'DIVE' ||
      state.ball.lastContact === 'BLOCK') &&
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false)
  );
}

function setTarget(state: MatchState): Vec3 {
  return {
    x: state.ball.position.x,
    y: 0,
    z: Math.min(-0.8, state.ball.position.z),
  };
}

function decision(
  playerId: 'home-1' | 'home-2',
  role: ReworkTeammateRole,
  target: Vec3,
): ReworkTeammateDecision {
  return { playerId, role, target };
}

export function decideTeammateRoles(state: MatchState): ReworkTeammateDecision[] {
  if (firstTouchByHome(state)) {
    if (state.ball.lastTouchedBy === 'home-0') {
      return [
        decision('home-1', 'SET', setTarget(state)),
        decision('home-2', 'COVER', COVER_TARGET),
      ];
    }

    if (state.ball.lastTouchedBy === 'home-1') {
      return [
        decision('home-1', 'COVER', COVER_TARGET),
        decision('home-2', 'SET', setTarget(state)),
      ];
    }

    if (state.ball.lastTouchedBy === 'home-2') {
      return [
        decision('home-1', 'SET', setTarget(state)),
        decision('home-2', 'COVER', COVER_TARGET),
      ];
    }
  }

  const opponentAttack =
    (state.ball.lastTouchedBy?.startsWith('away-') ?? false) &&
    (state.ball.lastContact === 'SERVE' || state.ball.lastContact === 'SPIKE');

  if (opponentAttack) {
    const landing = predictLanding(state.ball);
    return [
      decision('home-1', 'COVER', COVER_TARGET),
      decision('home-2', 'RECEIVE', {
        x: landing.x,
        y: 0,
        z: Math.min(-0.6, landing.z),
      }),
    ];
  }

  return [
    decision('home-1', 'BASE', REN_BASE),
    decision('home-2', 'BASE', HINA_BASE),
  ];
}
