import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../src/game/core/createMatch';
import { stepMatch } from '../../../src/game/core/stepMatch';

describe('createMatch', () => {
  it('creates a deterministic three-versus-three serve-ready match', () => {
    const first = createMatch(123);
    const second = createMatch(123);

    expect(first).toEqual(second);
    expect(first.players.filter((player) => player.side === 'home')).toHaveLength(3);
    expect(first.players.filter((player) => player.side === 'away')).toHaveLength(3);
    expect(first.score).toEqual({ home: 0, away: 0 });
    expect(first.rally.phase).toBe('SERVE_READY');
    expect(first.winner).toBeNull();
  });

  it('advances simulation time without mutating the source state', () => {
    const initial = createMatch(9);
    const next = stepMatch(
      initial,
      {
        move: { x: 0, z: 0 },
        actionPressed: false,
        actionReleased: false,
        requestedPlayerId: null,
      },
      1 / 60,
    );

    expect(next).not.toBe(initial);
    expect(next.time).toBeCloseTo(1 / 60);
    expect(initial.time).toBe(0);
  });
});
