import { describe, expect, it } from 'vitest';
import { performBlock } from '../../../src/game/actions/block';
import { performDive } from '../../../src/game/actions/dive';
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

  it('gives HINA a faster dive recovery through Never Down', () => {
    const hina = performDive(
      ball,
      STARTER_ROSTER.hina,
      'home-2',
      { x: 0, y: 2.2, z: -1.2 },
      0,
    );
    const kai = performDive(
      ball,
      STARTER_ROSTER.kai,
      'home-0',
      { x: 0, y: 2.2, z: -1.2 },
      0,
    );
    expect(hina.recoverySeconds).toBeLessThan(kai.recoverySeconds);
  });

  it('lets REN create a quick set and grants a larger next-hit timing assist', () => {
    const ren = performSet(
      ball,
      STARTER_ROSTER.ren,
      'home-1',
      { x: -2.4, y: 3.2, z: -0.7 },
      0,
      'QUICK',
    );
    const ordinarySetter = {
      ...STARTER_ROSTER.ren,
      trait: 'FAST_TEMPO' as const,
    };
    const ordinary = performSet(
      ball,
      ordinarySetter,
      'home-1',
      { x: -2.4, y: 3.2, z: -0.7 },
      0,
      'NORMAL',
    );

    expect(ren.quality).toBe('PERFECT');
    expect(ren.ball.lastTouchedBy).toBe('home-1');
    expect(ren.ball.velocity.y).toBeGreaterThan(0);
    expect(ren.ball.attackTimingBonus ?? 0).toBeGreaterThan(
      ordinary.ball.attackTimingBonus ?? 0,
    );
  });

  it('makes YU Fast Tempo quick sets travel faster than the same setter without the trait', () => {
    const target = { x: 2.4, y: 3.2, z: -0.7 };
    const yu = performSet(ball, STARTER_ROSTER.yu, 'away-2', target, 0, 'QUICK');
    const noFastTempo = {
      ...STARTER_ROSTER.yu,
      trait: 'CLEAN_CONNECTION' as const,
    };
    const normal = performSet(ball, noFastTempo, 'away-2', target, 0, 'QUICK');

    expect(Math.abs(yu.ball.velocity.x)).toBeGreaterThan(Math.abs(normal.ball.velocity.x));
  });

  it('turns KAI Heavy Finish perfect contact into a stronger power attack', () => {
    const kai = performSpike(
      ball,
      STARTER_ROSTER.kai,
      'home-0',
      { x: 1.5, y: 0, z: 7 },
      0,
      'POWER',
    );
    const noHeavyFinish = {
      ...STARTER_ROSTER.kai,
      trait: 'CLEAN_CONNECTION' as const,
    };
    const baseline = performSpike(
      ball,
      noHeavyFinish,
      'home-0',
      { x: 1.5, y: 0, z: 7 },
      0,
      'POWER',
    );

    expect(kai.quality).toBe('PERFECT');
    expect(kai.speedMetersPerSecond).toBeGreaterThan(baseline.speedMetersPerSecond);
    expect(kai.ball.velocity.z).toBeGreaterThan(0);
  });

  it('gives SHIN extra forgiveness when deliberately tooling the block', () => {
    const offset = 0.19;
    const shin = performSpike(
      ball,
      STARTER_ROSTER.shin,
      'away-0',
      { x: 3.6, y: 0, z: -7 },
      offset,
      'BLOCK_OUT',
    );
    const noToolTrait = {
      ...STARTER_ROSTER.shin,
      trait: 'HEAVY_FINISH' as const,
    };
    const baseline = performSpike(
      ball,
      noToolTrait,
      'away-0',
      { x: 3.6, y: 0, z: -7 },
      offset,
      'BLOCK_OUT',
    );

    expect(shin.quality === 'MISS').toBe(false);
    expect(shin.speedMetersPerSecond).toBeGreaterThanOrEqual(baseline.speedMetersPerSecond);
  });

  it('gives GOU a valid perfect block inside his extended Wall reach', () => {
    const result = performBlock(ball, STARTER_ROSTER.gou, 'away-1', 0, 0.66);
    expect(result.touched).toBe(true);
    expect(result.quality).toBe('PERFECT');
  });
});
