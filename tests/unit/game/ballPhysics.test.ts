import { describe, expect, it } from 'vitest';
import { applySpin, integrateBall, predictLanding } from '../../../src/game/ball/ballPhysics';
import type { BallState } from '../../../src/game/core/types';

function ball(overrides: Partial<BallState> = {}): BallState {
  return {
    position: { x: 0, y: 2, z: 0 },
    velocity: { x: 1, y: 4, z: 7 },
    spin: { x: 0, y: 0, z: 0 },
    inPlay: true,
    lastTouchedBy: null,
    ...overrides,
  };
}

describe('ball physics', () => {
  it('is deterministic for identical state and timestep', () => {
    const source = ball();
    expect(integrateBall(source, 1 / 60)).toEqual(integrateBall(source, 1 / 60));
  });

  it('reduces upward vertical velocity under gravity', () => {
    const source = ball();
    expect(integrateBall(source, 1 / 60).velocity.y).toBeLessThan(source.velocity.y);
  });

  it('predicts a forward landing position on the floor', () => {
    const landing = predictLanding(ball());
    expect(landing.y).toBe(0);
    expect(landing.z).toBeGreaterThan(0);
    expect(Number.isFinite(landing.x)).toBe(true);
  });

  it('makes topspin pull a forward-moving ball downward', () => {
    const source = ball({ spin: { x: 20, y: 0, z: 0 } });
    expect(applySpin(source, 1 / 60).velocity.y).toBeLessThan(source.velocity.y);
  });

  it('bounces a low ball back when it crosses the net plane', () => {
    const source = ball({
      position: { x: 0, y: 1.55, z: -0.08 },
      velocity: { x: 0, y: 0, z: 8 },
    });
    const next = integrateBall(source, 1 / 60);

    expect(next.position.z).toBeLessThan(0);
    expect(next.velocity.z).toBeLessThan(0);
  });

  it('allows a ball above the net to cross normally', () => {
    const source = ball({
      position: { x: 0, y: 3.1, z: -0.08 },
      velocity: { x: 0, y: 0, z: 8 },
    });
    const next = integrateBall(source, 1 / 60);

    expect(next.position.z).toBeGreaterThan(0);
    expect(next.velocity.z).toBeGreaterThan(0);
  });
});
