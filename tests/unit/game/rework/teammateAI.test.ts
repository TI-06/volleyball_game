import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { decideTeammateRoles } from '../../../../src/game/rework/teammateAI';

function afterFirstTouch(playerId: 'home-0' | 'home-1' | 'home-2') {
  const base = createMatch(21);
  return {
    ...base,
    rally: { ...base.rally, phase: 'RALLY' as const },
    ball: {
      ...base.ball,
      inPlay: true,
      lastTouchedBy: playerId,
      lastContact: 'RECEIVE' as const,
      position: { x: 0, y: 2.1, z: -2.0 },
      velocity: { x: 0, y: 1.2, z: 0.2 },
    },
  };
}

describe('rework teammate roles', () => {
  it('uses REN as setter after KAI first touch', () => {
    const decisions = decideTeammateRoles(afterFirstTouch('home-0'));
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-1', role: 'SET' }));
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-2', role: 'COVER' }));
  });

  it('uses HINA as emergency setter after REN first touch', () => {
    const decisions = decideTeammateRoles(afterFirstTouch('home-1'));
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-2', role: 'SET' }));
  });

  it('uses REN as setter after HINA first touch', () => {
    const decisions = decideTeammateRoles(afterFirstTouch('home-2'));
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-1', role: 'SET' }));
  });

  it('sends HINA to rear receive coverage on opponent attack', () => {
    const base = createMatch(22);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SPIKE' as const,
        position: { x: 1.8, y: 2.7, z: 0.8 },
        velocity: { x: 0, y: -2.2, z: -8 },
      },
    };

    const decisions = decideTeammateRoles(state);
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-2', role: 'RECEIVE' }));
    expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-1', role: 'COVER' }));
  });
});
