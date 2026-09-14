import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { decideCpuRoles } from '../../../../src/game/rework/cpuAI';

function rallyState() {
  const base = createMatch(71);
  return {
    ...base,
    rally: { ...base.rally, phase: 'RALLY' as const, servingSide: 'home' as const },
  };
}

describe('rework cpu roles', () => {
  it('assigns one receiver to an incoming home attack', () => {
    const base = rallyState();
    const state = {
      ...base,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 0.4, y: 2.4, z: 2.2 },
        velocity: { x: 0, y: -1.4, z: 8 },
      },
    };

    const decisions = decideCpuRoles(state, 'NORMAL');
    expect(decisions.filter((decision) => decision.role === 'RECEIVE')).toHaveLength(1);
  });

  it('does not assign a receiver to a home attack predicted to land out', () => {
    const base = rallyState();
    const state = {
      ...base,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 4.0, y: 2.2, z: 2.0 },
        velocity: { x: 6.5, y: -1.3, z: 7.0 },
      },
    };

    const decisions = decideCpuRoles(state, 'MASTER');
    expect(decisions.some((decision) => decision.role === 'RECEIVE')).toBe(false);
  });

  it('assigns YU to set after SHIN first touch', () => {
    const base = rallyState();
    const state = {
      ...base,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'RECEIVE' as const,
        position: { x: 0.2, y: 2.0, z: 3.0 },
        velocity: { x: 0, y: 1.1, z: -0.1 },
      },
    };

    const decisions = decideCpuRoles(state, 'HARD');
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'away-2', role: 'SET' }));
  });

  it('assigns attackers to approach after YU set', () => {
    const base = rallyState();
    const state = {
      ...base,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET' as const,
        position: { x: -1.2, y: 3.0, z: 1.0 },
        velocity: { x: 0, y: 0.4, z: 0 },
      },
    };

    const decisions = decideCpuRoles(state, 'EXPERT');
    expect(decisions.some((decision) => decision.role === 'APPROACH')).toBe(true);
  });

  it('does not assign BLOCK to a defender still deep in the backcourt', () => {
    const base = rallyState();
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'away-1'
          ? { ...player, position: { ...player.position, x: 0, z: 5.0 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 0, y: 2.6, z: 0.7 },
        velocity: { x: 0, y: -1.1, z: 12.5 },
      },
    };

    const gou = decideCpuRoles(state, 'MASTER').find((decision) => decision.playerId === 'away-1');
    expect(gou?.role).not.toBe('BLOCK');
  });
});
