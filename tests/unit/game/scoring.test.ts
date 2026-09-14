import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../src/game/core/createMatch';
import { awardPoint, isMatchOver } from '../../../src/game/core/scoring';
import type { MatchState } from '../../../src/game/core/types';

function stateAt(home: number, away: number): MatchState {
  return {
    ...createMatch(7),
    score: { home, away },
  };
}

describe('match scoring', () => {
  it('ends at 15 when there is a two-point lead', () => {
    const next = awardPoint(stateAt(14, 13), 'home');
    expect(next.score).toEqual({ home: 15, away: 13 });
    expect(isMatchOver(next)).toBe(true);
    expect(next.winner).toBe('home');
  });

  it('does not end with only a one-point lead after 14-14', () => {
    expect(isMatchOver(stateAt(15, 14))).toBe(false);
    expect(isMatchOver(stateAt(19, 19))).toBe(false);
  });

  it('uses 20 as a hard cap', () => {
    expect(isMatchOver(stateAt(20, 19))).toBe(true);
  });

  it('rotates the three-person server only when serve is regained', () => {
    const servingHome = stateAt(3, 2);
    const homeScoresAgain = awardPoint(servingHome, 'home');
    expect(homeScoresAgain.rally.serverIndex.home).toBe(0);

    const awayRegainsServe = awardPoint(servingHome, 'away');
    expect(awayRegainsServe.rally.serverIndex.away).toBe(1);
    expect(awayRegainsServe.rally.servingSide).toBe('away');
  });
});
