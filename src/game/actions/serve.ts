import { BALL_GRAVITY } from '../ball/ballPhysics';
import type { BallState, PlayerState, Vec3 } from '../core/types';

export type ServeKind = 'FLOAT' | 'JUMP';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function performServe(
  ball: BallState,
  server: PlayerState,
  target: Vec3,
  kind: ServeKind,
  power: number,
): BallState {
  const normalizedPower = clamp01(power);
  const origin = {
    x: server.position.x,
    y: kind === 'JUMP' ? 2.75 : 2.05,
    z: server.position.z,
  };
  const flightTime = kind === 'JUMP'
    ? 0.72 - normalizedPower * 0.1
    : 1.05 - normalizedPower * 0.16;

  const velocity = {
    x: (target.x - origin.x) / flightTime,
    y: (target.y - origin.y + 0.5 * BALL_GRAVITY * flightTime * flightTime) / flightTime,
    z: (target.z - origin.z) / flightTime,
  };
  const direction = Math.sign(target.z - origin.z) || 1;

  return {
    ...ball,
    position: origin,
    velocity,
    spin:
      kind === 'JUMP'
        ? { x: 18 * direction, y: 0, z: 0 }
        : { x: 0.8 * direction, y: 1.2 * (0.5 - normalizedPower), z: 0 },
    inPlay: true,
    lastTouchedBy: server.id,
    attackTimingBonus: 0,
  };
}
