import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { chooseHomeReceiveOwner } from '../../../../src/game/rework/receiveOwnership';

function incomingAt(x: number, z: number) {
  const base = createMatch(44);
  return {
    ...base,
    rally: { ...base.rally, phase: 'RALLY' as const, servingSide: 'away' as const },
    ball: {
      ...base.ball,
      inPlay: true,
      lastTouchedBy: 'away-0',
      lastContact: 'SPIKE' as const,
      position: { x, y: 0.9, z },
      velocity: { x: 0, y: -1.4, z: -0.8 },
    },
  };
}

describe('rework receive ownership', () => {
  it('keeps a nearby ball with KAI so the player gets the PLAY timing', () => {
    expect(chooseHomeReceiveOwner(incomingAt(-2.5, -5.0))).toBe('home-0');
  });

  it('gives a ball near REN to REN instead of lighting KAI PLAY', () => {
    expect(chooseHomeReceiveOwner(incomingAt(0.1, -5.0))).toBe('home-1');
  });

  it('gives a ball near HINA to HINA', () => {
    expect(chooseHomeReceiveOwner(incomingAt(2.5, -5.0))).toBe('home-2');
  });
});
