import { describe, expect, it } from 'vitest';
import { performBlock } from '../../../src/game/actions/block';
import { performReceive } from '../../../src/game/actions/receive';
import { performSet } from '../../../src/game/actions/set';
import { performSpike } from '../../../src/game/actions/spike';
import { classifyContactTiming } from '../../../src/game/actions/timing';
import { STARTER_ROSTER } from '../../../src/game/characters/roster';
import type { BallState } from '../../../src/game/core/types';

const ball: BallState = {
  position: { x: 0, y: 2.4, z: -1 },
  velocity: { x: 0, y: -2, z: 2 },
  spin: { x: 0, y: 0, z: 0 },
  inPlay: true,
  lastTouchedBy: 'away-0',
};

describe('volleyball action calculations', () => {
  it('classifies the five timing bands deterministically', () => {
    const window = 0.1;
    expect(classifyContactTiming(0.05, window)).toBe('PERFECT');
    expect(classifyContactTiming(0.14, window)).toBe('GREAT');
    expect(classifyContactTiming(0.23, window)).toBe('GOOD');
    expect(classifyContactTiming(0.33, window)).toBe('BAD');
    expect(classifyContactTiming(0.5, window)).toBe('MISS');
  });

  it('lets HINA produce a controlled perfect receive', () => {
    const result = performReceive(
      ball,
      STARTER_ROSTER.hina,
      'home-2',
      { x: 0, y: 2.2, z: -1.2 },
      0,
    );
    expect(result.quality).toBe('PERFECT');
    expect(result.ball.lastTouchedBy).toBe('home-2');
  });

  it('lets REN create a quick set toward an attack target', () => {
    const result = performSet(
      ball,
      STARTER_ROSTER.ren,
      'home-1',
      { x: -2.4, y: 3.2, z: -0.7 },
      0,
      'QUICK',
    );
    expect(result.quality).toBe('PERFECT');
    expect(result.ball.lastTouchedBy).toBe('home-1');
    expect(result.ball.velocity.y).toBeGreaterThan(0);
  });

  it('turns KAI perfect power contact into a fast attack', () => {
    const result = performSpike(
      ball,
      STARTER_ROSTER.kai,
      'home-0',
      { x: 1.5, y: 0, z: 7 },
      0,
      'POWER',
    );
    expect(result.quality).toBe('PERFECT');
    expect(result.speedMetersPerSecond).toBeGreaterThan(30);
    expect(result.ball.velocity.z).toBeGreaterThan(0);
  });

  it('gives GOU a valid perfect block inside his reach', () => {
    const result = performBlock(ball, STARTER_ROSTER.gou, 'away-1', 0, 0.2);
    expect(result.touched).toBe(true);
    expect(result.quality).toBe('PERFECT');
  });
});
