import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../src/game/core/createMatch';
import { resolveAction } from '../../../src/game/input/actionResolver';

describe('resolveAction', () => {
  it('offers serve only to the current server in serve-ready phase', () => {
    const state = createMatch(1);
    expect(resolveAction(state, 'home-0')).toBe('SERVE');
    expect(resolveAction(state, 'home-1')).toBeNull();
  });

  it('offers receive and dive based on defensive distance', () => {
    const base = createMatch(1);
    const receiveState = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        position: { x: -2.6, y: 2.2, z: -5.4 },
        velocity: { x: 0, y: -3, z: -1 },
      },
    };
    expect(resolveAction(receiveState, 'home-0')).toBe('RECEIVE');

    const diveState = {
      ...receiveState,
      ball: { ...receiveState.ball, position: { x: 0, y: 1.5, z: -5.4 } },
    };
    expect(resolveAction(diveState, 'home-0')).toBe('DIVE');
  });

  it('offers set to the setter after a teammate first touch', () => {
    const base = createMatch(1);
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
        lastTouchedBy: 'home-2',
        lastContact: 'RECEIVE' as const,
        position: { x: 0, y: 1.6, z: -1.2 },
        velocity: { x: 0, y: 1, z: 0 },
      },
    };
    expect(resolveAction(state, 'home-1')).toBe('SET');
  });

  it('offers an emergency set to a non-setter when REN made the first touch', () => {
    const base = createMatch(1);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-2'
          ? { ...player, position: { x: 0.4, y: 0, z: -1.4 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'RECEIVE' as const,
        position: { x: 0.45, y: 1.7, z: -1.35 },
        velocity: { x: 0, y: 1.2, z: 0.1 },
      },
    };

    expect(resolveAction(state, 'home-2')).toBe('SET');
  });

  it('keeps a descending teammate set in jump context instead of receive', () => {
    const base = createMatch(1);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -2.6, y: 0, z: -1.1 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: -2.5, y: 2.7, z: -0.9 },
        velocity: { x: 0, y: -1.1, z: 0.2 },
      },
    };

    expect(resolveAction(state, 'home-0')).toBe('JUMP');
  });

  it('uses jump on the ground and block only after the defender is airborne', () => {
    const base = createMatch(1);
    const groundState = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -2.2, y: 0, z: -0.7 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SPIKE' as const,
        position: { x: -2.1, y: 2.8, z: 0.55 },
        velocity: { x: 0, y: -1, z: -7 },
      },
    };

    expect(resolveAction(groundState, 'home-0')).toBe('JUMP');

    const airborneState = {
      ...groundState,
      players: groundState.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, isAirborne: true, position: { ...player.position, y: 0.7 } }
          : player,
      ),
    };
    expect(resolveAction(airborneState, 'home-0')).toBe('BLOCK');
  });

  it('returns no action after the match is over', () => {
    const base = createMatch(1);
    expect(resolveAction({ ...base, winner: 'home' }, 'home-0')).toBeNull();
  });
});
