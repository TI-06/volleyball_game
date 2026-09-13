import type { MatchInput, MatchState } from './types';

export function stepMatch(
  state: MatchState,
  _input: MatchInput,
  dt: number,
): MatchState {
  if (!Number.isFinite(dt) || dt <= 0) {
    return state;
  }

  return {
    ...state,
    time: state.time + dt,
  };
}
