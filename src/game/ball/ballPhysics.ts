import type { BallState, Vec3 } from '../core/types';

export const BALL_GRAVITY = 9.81;
const BALL_DRAG = 0.012;
const MAGNUS_COEFFICIENT = 0.0042;

function scale(value: Vec3, amount: number): Vec3 {
  return {
    x: value.x * amount,
    y: value.y * amount,
    z: value.z * amount,
  };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function applySpin(ball: BallState, dt: number): BallState {
  if (!Number.isFinite(dt) || dt <= 0) {
    return ball;
  }

  const magnus = scale(cross(ball.spin, ball.velocity), MAGNUS_COEFFICIENT * dt);

  return {
    ...ball,
    velocity: {
      x: ball.velocity.x + magnus.x,
      y: ball.velocity.y + magnus.y,
      z: ball.velocity.z + magnus.z,
    },
  };
}

export function integrateBall(ball: BallState, dt: number): BallState {
  if (!Number.isFinite(dt) || dt <= 0 || !ball.inPlay) {
    return ball;
  }

  const spun = applySpin(ball, dt);
  const damping = Math.max(0, 1 - BALL_DRAG * dt);
  const velocity = {
    x: spun.velocity.x * damping,
    y: (spun.velocity.y - BALL_GRAVITY * dt) * damping,
    z: spun.velocity.z * damping,
  };

  return {
    ...spun,
    position: {
      x: spun.position.x + velocity.x * dt,
      y: spun.position.y + velocity.y * dt,
      z: spun.position.z + velocity.z * dt,
    },
    velocity,
  };
}

export function predictLanding(ball: BallState): Vec3 {
  if (ball.position.y <= 0 && ball.velocity.y <= 0) {
    return { x: ball.position.x, y: 0, z: ball.position.z };
  }

  const discriminant =
    ball.velocity.y * ball.velocity.y + 2 * BALL_GRAVITY * Math.max(0, ball.position.y);
  const timeToFloor = (ball.velocity.y + Math.sqrt(discriminant)) / BALL_GRAVITY;
  const safeTime = Math.max(0, timeToFloor);

  return {
    x: ball.position.x + ball.velocity.x * safeTime,
    y: 0,
    z: ball.position.z + ball.velocity.z * safeTime,
  };
}
