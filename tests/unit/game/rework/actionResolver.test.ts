import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { resolveReworkActions } from '../../../../src/game/rework/actionResolver';

function rallyState() {
  const base = createMatch(10);
  return {
    ...base,
    rally: { ...base.rally, phase: 'RALLY' as const },
  };
}

describe('rework fixed action mapping', () => {
  it('keeps receive on PLAY for an incoming opponent ball', () => {
    const base = rallyState();
    const state = {
      ...base,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SPIKE' as const,
        position: { x: -2.6, y: 1.6, z: -5.2 },
        velocity: { x: 0, y: -2, z: -5 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'RECEIVE', power: 'NONE' });
  });

  it('does not light PLAY when a nearby ball is predicted to land out', () => {
    const base = rallyState();
    const state = {
      ...base,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SPIKE' as const,
        position: { x: -2.5, y: 1.2, z: -5.0 },
        velocity: { x: -8, y: -1.0, z: -1.0 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'NONE' });
  });

  it('keeps approach jump on POWER after a teammate set', () => {
    const base = rallyState();
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -2.5, y: 0, z: -1.2 }, isAirborne: false }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -2.5, y: 3.1, z: -0.9 },
        velocity: { x: 0, y: 0.4, z: 0.1 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'JUMP' });
  });

  it('does not offer attack jump when KAI is still too far from the set', () => {
    const base = rallyState();
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -3.8, y: 0, z: -2.0 }, isAirborne: false }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -1.6, y: 3.0, z: -0.8 },
        velocity: { x: 0, y: 0.2, z: 0.1 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'NONE' });
  });

  it('keeps airborne spike on the same POWER zone', () => {
    const base = rallyState();
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -2.5, y: 0.8, z: -1.0 }, isAirborne: true }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -2.5, y: 3.0, z: -0.75 },
        velocity: { x: 0, y: -0.2, z: 0.1 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'SPIKE' });
  });

  it('does not allow a remote spike from outside the real contact radius', () => {
    const base = rallyState();
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -3.2, y: 0.8, z: -1.9 }, isAirborne: true }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -1.5, y: 3.0, z: -0.75 },
        velocity: { x: 0, y: -0.2, z: 0.1 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'NONE' });
  });

  it('uses POWER as block-ready during an opponent set', () => {
    const base = rallyState();
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -2.2, y: 0, z: -0.9 }, isAirborne: false }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET' as const,
        position: { x: -2.1, y: 3.0, z: 0.8 },
        velocity: { x: 0, y: 0.5, z: 0 },
      },
    };

    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'BLOCK_READY' });
  });

  it('puts KAI serve on POWER and never exposes switching', () => {
    const state = createMatch(10);
    expect(resolveReworkActions(state)).toEqual({ play: 'NONE', power: 'SERVE' });
    expect(Object.values(resolveReworkActions(state))).not.toContain('SWITCH');
  });
});
