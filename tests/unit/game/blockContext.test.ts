import { describe, expect, it } from 'vitest';
import { decideCpuIntent } from '../../../src/game/ai/cpuAI';
import { DIFFICULTY_PROFILES } from '../../../src/game/ai/difficulty';
import { createTendencyHistory } from '../../../src/game/ai/tendencyTracker';
import { createMatch } from '../../../src/game/core/createMatch';
import { resolveAction } from '../../../src/game/input/actionResolver';

describe('block context', () => {
  it('lets the player jump during an opponent set but not contact the set itself', () => {
    const base = createMatch(170);
    const ground = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -1.1, y: 0, z: -0.7 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET' as const,
        position: { x: -1, y: 2.8, z: 0.7 },
        velocity: { x: 0, y: 2, z: -1.2 },
      },
    };

    expect(resolveAction(ground, 'home-0')).toBe('JUMP');

    const airborne = {
      ...ground,
      players: ground.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, isAirborne: true, position: { ...player.position, y: 0.75 } }
          : player,
      ),
    };

    expect(resolveAction(airborne, 'home-0')).not.toBe('BLOCK');
  });

  it('does not allow a serve to be blocked', () => {
    const base = createMatch(174);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, isAirborne: true, position: { x: 0, y: 0.75, z: -0.7 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SERVE' as const,
        position: { x: 0, y: 2.7, z: 0.65 },
        velocity: { x: 0, y: -0.6, z: -14 },
      },
    };

    expect(resolveAction(state, 'home-0')).not.toBe('BLOCK');
  });

  it('allows an airborne block after the opponent attacker touches the ball', () => {
    const base = createMatch(171);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, isAirborne: true, position: { x: -1.1, y: 0.75, z: -0.7 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SPIKE' as const,
        position: { x: -1, y: 2.8, z: 0.7 },
        velocity: { x: 0, y: -1.5, z: -8 },
      },
    };

    expect(resolveAction(state, 'home-0')).toBe('BLOCK');
  });

  it('keeps a front-zone CPU blocker in APPROACH while the home setter owns the last touch', () => {
    const base = createMatch(172);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'away-1'
          ? { ...player, position: { x: 0.4, y: 0, z: 1.1 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET' as const,
        position: { x: 0.5, y: 2.9, z: -0.6 },
        velocity: { x: 0, y: 2, z: 1.2 },
      },
    };

    expect(
      decideCpuIntent(state, 'away-1', DIFFICULTY_PROFILES.HARD, createTendencyHistory()).state,
    ).toBe('APPROACH');
  });

  it('lets the same CPU blocker enter BLOCK after the home attacker touches', () => {
    const base = createMatch(173);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'away-1'
          ? { ...player, position: { x: 0.4, y: 0, z: 1.1 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 0.5, y: 2.9, z: -0.6 },
        velocity: { x: 0, y: -1.2, z: 8 },
      },
    };

    expect(
      decideCpuIntent(state, 'away-1', DIFFICULTY_PROFILES.HARD, createTendencyHistory()).state,
    ).toBe('BLOCK');
  });
});
