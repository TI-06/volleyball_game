import { integrateBall } from '../ball/ballPhysics';
import { COURT } from './constants';
import { prepareNextRally, sideFromPlayerId } from './rally';
import { awardPoint } from './scoring';
import type { MatchInput, MatchState, TeamSide } from './types';

const POINT_PAUSE_SECONDS = 0.85;

function opposite(side: TeamSide): TeamSide {
  return side === 'home' ? 'away' : 'home';
}

function resolveDeadBall(state: MatchState): MatchState {
  const ball = state.ball;
  if (!ball.inPlay) return state;

  const hitFloor = ball.position.y <= 0;
  if (!hitFloor) {
    return state;
  }

  const outsideWidth = Math.abs(ball.position.x) > COURT.width / 2;
  const outsideLength = Math.abs(ball.position.z) > COURT.length / 2;
  const lastTouchSide = sideFromPlayerId(ball.lastTouchedBy);
  let winner: TeamSide;

  if (outsideWidth || outsideLength) {
    winner = lastTouchSide ? opposite(lastTouchSide) : opposite(state.rally.servingSide);
  } else {
    winner = ball.position.z < 0 ? 'away' : 'home';
  }

  return awardPoint(state, winner);
}

export function stepMatch(
  state: MatchState,
  _input: MatchInput,
  dt: number,
): MatchState {
  if (!Number.isFinite(dt) || dt <= 0 || state.winner) {
    return state;
  }

  if (
    state.rally.phase === 'POINT' &&
    state.rally.pointResolvedAt !== null &&
    state.time - state.rally.pointResolvedAt >= POINT_PAUSE_SECONDS
  ) {
    const prepared = prepareNextRally(state);
    return { ...prepared, time: state.time + dt };
  }

  let next: MatchState = {
    ...state,
    time: state.time + dt,
  };

  if (next.rally.phase === 'RALLY' || next.rally.phase === 'SERVING') {
    next = { ...next, ball: integrateBall(next.ball, dt) };
    next = resolveDeadBall(next);
  }

  return next;
}
