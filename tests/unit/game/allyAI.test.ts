import { describe, expect, it } from 'vitest';
import { decideAllyIntent } from '../../../src/game/ai/allyAI';
import { createMatch } from '../../../src/game/core/createMatch';

describe('ally AI', () => {
  it('sends the most relevant defender to a descending ball', () => {
    const base = createMatch(10);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        position: { x: 2.5, y: 3, z: -5 },
        velocity: { x: 0, y: -2, z: -0.2 },
      },
    };

    expect(decideAllyIntent(state, 'home-2').state).toBe('RECEIVE');
  });

  it('moves the setter to the set zone after a teammate touch', () => {
    const base = createMatch(11);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-2',
        position: { x: 1.5, y: 1.8, z: -3 },
        velocity: { x: -0.4, y: 4, z: 1 },
      },
    };

    const intent = decideAllyIntent(state, 'home-1');
    expect(intent.state).toBe('SET');
    expect(intent.target.z).toBeGreaterThan(-1.5);
  });

  it('sends an ace into approach instead of chasing a rising pass', () => {
    const base = createMatch(12);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-2',
        position: { x: 0, y: 2, z: -3 },
        velocity: { x: 0, y: 4, z: 1 },
      },
    };

    expect(decideAllyIntent(state, 'home-0').state).toBe('APPROACH');
  });
});
