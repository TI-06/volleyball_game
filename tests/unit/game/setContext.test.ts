import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../src/game/core/createMatch';
import { resolveAction } from '../../../src/game/input/actionResolver';

describe('setter action context', () => {
  it('does not allow the setter to set their own immediately previous touch again', () => {
    const base = createMatch(150);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-1'
          ? { ...player, position: { x: 0, y: 0, z: -1.2 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        position: { x: 0.1, y: 2.2, z: -1 },
        velocity: { x: 0, y: 1.4, z: 0.4 },
      },
    };

    expect(resolveAction(state, 'home-1')).not.toBe('SET');
  });
});
