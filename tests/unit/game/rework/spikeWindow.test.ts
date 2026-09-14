import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { resolveReworkActions } from '../../../../src/game/rework/actionResolver';

describe('rework spike input window', () => {
  it('does not expose SPIKE immediately after takeoff', () => {
    const base = createMatch(31);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? {
              ...player,
              isAirborne: true,
              position: { x: -2.5, y: 0.08, z: -1.0 },
              velocity: { ...player.velocity, y: 6 },
            }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -2.5, y: 3.05, z: -0.8 },
        velocity: { x: 0, y: -0.2, z: 0.1 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'NONE' });
  });

  it('exposes SPIKE after KAI reaches a playable attack height', () => {
    const base = createMatch(31);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? {
              ...player,
              isAirborne: true,
              position: { x: -2.5, y: 0.45, z: -1.0 },
              velocity: { ...player.velocity, y: 4.5 },
            }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -2.5, y: 3.05, z: -0.8 },
        velocity: { x: 0, y: -0.2, z: 0.1 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'SPIKE' });
  });
});
