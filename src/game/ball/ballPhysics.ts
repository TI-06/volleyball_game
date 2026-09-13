import type { BallState, Vec3 } from '../core/types';
import { COURT } from '../core/constants';

export const BALL_GRAVITY = 9.81;
export const BALL_RADIUS = 0.105;
const BALL_DRAG = 0.012;
const MAGNUS_COEFFICIENT = 0.0042;
const NET_RESTITUTION = 0.28;
const NET_DAMPING = 0.58;
const NET_PLANE_OFFSET = 0.025;

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

function resolveNetCollision(
  previous: BallState,
  nextPosition: Vec3,
  nextVelocity: Vec3,
): { position: Vec3; velocity: Vec3 } {
  const previousZ = previous.position.z;
  const nextZ = nextPosition.z;
  if (previousZ === nextZ || previousZ * nextZ > 0) {
    return { position: nextPosition, velocity: nextVelocity };
  }

  const travelZ = nextZ - previousZ;
  const crossingT = travelZ === 0 ? 0 : Math.max(0, Math.min(1, -previousZ / travelZ));
  const crossingX = previous.position.x + (nextPosition.x - previous.position.x) * crossingT;
  const crossingY = previous.position.y + (nextPosition.y - previous.position.y) * crossingT;
  const withinNetWidth = Math.abs(crossingX) <= COURT.width / 2 + BALL_RADIUS;
  const belowNetTop = crossingY <= COURT.netHeight + BALL_RADIUS;

  if (!withinNetWidth || !belowNetTop) {
    return { position: nextPosition, velocity: nextVelocity };
  }

  const sourceSide = previousZ < 0 ? -1 : 1;
  return {
    position: {
      x: crossingX,
      y: Math.max(0, crossingY),
      z: sourceSide * NET_PLANE_OFFSET,
    },
    velocity: {
      x: nextVelocity.x * NET_DAMPING,
      y: nextVelocity.y * NET_DAMPING,
      z: -nextVelocity.z * NET_RESTITUTION,
    },
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
  const position = {
    x: spun.position.x + velocity.x * dt,
    y: spun.position.y + velocity.y * dt,
    z: spun.position.z + velocity.z * dt,
  };
  const resolved = resolveNetCollision(spun, position, velocity);

  return {
    ...spun,
    position: resolved.position,
    velocity: resolved.velocity,
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
