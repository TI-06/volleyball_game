import { describe, expect, it } from 'vitest';
import { correctReceiveTrajectory } from '../../../src/game/ball/ballCorrection';
import { BALL_GRAVITY } from '../../../src/game/ball/ballPhysics';
import type { BallState, Vec3 } from '../../../src/game/core/types';

const FLIGHT_TIME = 0.85;

function sampleBall(): BallState {
  return {
    position: { x: -2, y: 0.7, z: -5 },
    velocity: { x: -1.5, y: 1.2, z: 0.5 },
    spin: { x: 5, y: 1, z: 0 },
    inPlay: true,
    lastTouchedBy: 'home-2',
  };
}

function positionAt(ball: BallState, seconds: number): Vec3 {
  return {
    x: ball.position.x + ball.velocity.x * seconds,
    y: ball.position.y + ball.velocity.y * seconds - 0.5 * BALL_GRAVITY * seconds * seconds,
    z: ball.position.z + ball.velocity.z * seconds,
  };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe('receive trajectory correction', () => {
  it('moves a perfect receive closer to the setter target than a good receive', () => {
    const target = { x: 0.2, y: 2.25, z: -0.8 };
    const perfect = correctReceiveTrajectory(sampleBall(), target, 'PERFECT');
    const good = correctReceiveTrajectory(sampleBall(), target, 'GOOD');

    expect(distance(positionAt(perfect, FLIGHT_TIME), target)).toBeLessThan(
      distance(positionAt(good, FLIGHT_TIME), target),
    );
  });

  it('keeps bad receives only lightly corrected', () => {
    const target = { x: 0, y: 2.2, z: -1 };
    const source = sampleBall();
    const bad = correctReceiveTrajectory(source, target, 'BAD');
    const perfect = correctReceiveTrajectory(source, target, 'PERFECT');

    expect(Math.abs(bad.velocity.x - source.velocity.x)).toBeLessThan(
      Math.abs(perfect.velocity.x - source.velocity.x),
    );
  });

  it('does not correct a missed contact', () => {
    const source = sampleBall();
    expect(correctReceiveTrajectory(source, { x: 0, y: 2, z: 0 }, 'MISS')).toBe(source);
  });
});
