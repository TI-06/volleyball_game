import type { MatchState } from './types';

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
