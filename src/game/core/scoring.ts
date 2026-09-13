import {
  MATCH_HARD_CAP,
  MATCH_TARGET_SCORE,
  REQUIRED_WIN_MARGIN,
} from './constants';
import type { MatchState, ScoreState, TeamSide } from './types';

export function isScoreFinished(score: ScoreState): boolean {
  if (score.home >= MATCH_HARD_CAP || score.away >= MATCH_HARD_CAP) {
    return true;
  }

  const leader = Math.max(score.home, score.away);
  const margin = Math.abs(score.home - score.away);
  return leader >= MATCH_TARGET_SCORE && margin >= REQUIRED_WIN_MARGIN;
}

export function isMatchOver(state: Pick<MatchState, 'score' | 'winner'>): boolean {
  return state.winner !== null || isScoreFinished(state.score);
}

export function getScoreWinner(score: ScoreState): TeamSide | null {
  if (!isScoreFinished(score)) {
    return null;
  }

  return score.home > score.away ? 'home' : 'away';
}

export function awardPoint(state: MatchState, side: TeamSide): MatchState {
  if (isMatchOver(state)) {
    return state;
  }

  const score: ScoreState = {
    ...state.score,
    [side]: state.score[side] + 1,
  };
  const winner = getScoreWinner(score);
  const wonServe = state.rally.servingSide !== side;
  const nextServerIndex = wonServe
    ? (state.rally.serverIndex[side] + 1) % 3
    : state.rally.serverIndex[side];

  return {
    ...state,
    score,
    winner,
    ball: {
      ...state.ball,
      inPlay: false,
      velocity: { x: 0, y: 0, z: 0 },
      spin: { x: 0, y: 0, z: 0 },
    },
    rally: {
      ...state.rally,
      phase: winner ? 'MATCH_OVER' : 'POINT',
      servingSide: side,
      serverIndex: {
        ...state.rally.serverIndex,
        [side]: nextServerIndex,
      },
      lastPointWinner: side,
      pointResolvedAt: state.time,
    },
  };
}
