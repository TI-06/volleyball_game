import { BALL_GRAVITY } from './ballPhysics';
import type { BallState, ContactQuality, Vec3 } from '../core/types';

const RECEIVE_FLIGHT_TIME = 0.85;

const CORRECTION_WEIGHT: Record<ContactQuality, number> = {
  PERFECT: 0.94,
  GREAT: 0.78,
  GOOD: 0.55,
  BAD: 0.24,
  MISS: 0,
};

function mix(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function correctReceiveTrajectory(
  ball: BallState,
  target: Vec3,
  quality: ContactQuality,
): BallState {
  const weight = CORRECTION_WEIGHT[quality];
  if (weight === 0) {
    return ball;
  }

  const t = RECEIVE_FLIGHT_TIME;
  const desiredVelocity = {
    x: (target.x - ball.position.x) / t,
    y: (target.y - ball.position.y + 0.5 * BALL_GRAVITY * t * t) / t,
    z: (target.z - ball.position.z) / t,
  };

  return {
    ...ball,
    inPlay: true,
    velocity: {
      x: mix(ball.velocity.x, desiredVelocity.x, weight),
      y: mix(ball.velocity.y, desiredVelocity.y, weight),
      z: mix(ball.velocity.z, desiredVelocity.z, weight),
    },
    spin: {
      x: ball.spin.x * (1 - weight * 0.7),
      y: ball.spin.y * (1 - weight * 0.7),
      z: ball.spin.z * (1 - weight * 0.7),
    },
  };
}
