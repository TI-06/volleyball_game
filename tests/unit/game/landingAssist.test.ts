import { describe, expect, it } from 'vitest';
import { getLandingAssist } from '../../../src/game/ball/landingAssist';
import { createMatch } from '../../../src/game/core/createMatch';

function incomingState() {
  const base = createMatch(130);
  return {
    ...base,
    rally: { ...base.rally, phase: 'RALLY' as const },
    ball: {
      ...base.ball,
      inPlay: true,
      lastTouchedBy: 'away-0',
      position: { x: 1.2, y: 5.2, z: 2.8 },
      velocity: { x: 0.25, y: -1.1, z: -7.4 },
    },
  };
}

describe('receive landing assist', () => {
  it('gives a stronger receiver a tighter and clearer landing marker', () => {
    const state = incomingState();
    const kai = getLandingAssist(state, 'home-0');
    const hina = getLandingAssist(state, 'home-2');

    expect(kai).not.toBeNull();
    expect(hina).not.toBeNull();
    expect(hina!.radius).toBeLessThan(kai!.radius);
    expect(hina!.opacity).toBeGreaterThan(kai!.opacity);
  });

  it('hides the marker when the ball is not traveling toward the home court', () => {
    const state = incomingState();
    const outgoing = {
      ...state,
      ball: { ...state.ball, velocity: { ...state.ball.velocity, z: 6 } },
    };

    expect(getLandingAssist(outgoing, 'home-2')).toBeNull();
  });
});
