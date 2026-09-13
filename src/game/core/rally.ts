import type { BallState, MatchState, TeamSide } from './types';

export function startRallyWithBall(state: MatchState, ball: BallState): MatchState {
  return {
    ...state,
    ball: { ...ball, inPlay: true },
    rally: {
      ...state.rally,
      phase: 'RALLY',
      pointResolvedAt: null,
    },
  };
}

export function prepareNextRally(state: MatchState): MatchState {
  if (state.winner) {
    return {
      ...state,
      rally: { ...state.rally, phase: 'MATCH_OVER' },
    };
  }

  return {
    ...state,
    ball: {
      position: {
        x: 0,
        y: 1.2,
        z: state.rally.servingSide === 'home' ? -7.5 : 7.5,
      },
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
      inPlay: false,
      lastTouchedBy: null,
    },
    rally: {
      ...state.rally,
      phase: 'SERVE_READY',
      pointResolvedAt: null,
    },
  };
}

export function sideFromPlayerId(playerId: string | null): TeamSide | null {
  if (playerId?.startsWith('home-')) return 'home';
  if (playerId?.startsWith('away-')) return 'away';
  return null;
}
