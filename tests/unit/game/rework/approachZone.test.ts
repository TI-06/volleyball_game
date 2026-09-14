import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { resolveReworkActions } from '../../../../src/game/rework/actionResolver';

function teammateSet(kaiZ: number, ballZ: number) {
  const base = createMatch(41);
  return {
    ...base,
    rally: { ...base.rally, phase: 'RALLY' as const },
    players: base.players.map((player) =>
      player.id === 'home-0'
        ? { ...player, position: { x: -2.5, y: 0, z: kaiZ }, isAirborne: false }
        : player,
    ),
    ball: {
      ...base.ball,
      inPlay: true,
      lastTouchedBy: 'home-1',
      lastContact: 'SET' as const,
      position: { x: -2.5, y: 3.0, z: ballZ },
      velocity: { x: 0, y: 1.0, z: 5.0 },
    },
  };
}

describe('rework approach zone', () => {
  it('does not offer JUMP while KAI is still in the back court', () => {
    expect(resolveReworkActions(teammateSet(-4.4, -4.0))).toEqual({
      play: 'NONE',
      power: 'NONE',
    });
  });

  it('offers JUMP after KAI and the set enter the attack zone', () => {
    expect(resolveReworkActions(teammateSet(-1.8, -2.2))).toEqual({
      play: 'NONE',
      power: 'JUMP',
    });
  });
});
