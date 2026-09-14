import { COURT } from '../core/constants';
import type { BallState, PlayerState, Vec3 } from '../core/types';

export type ServeKind = 'FLOAT' | 'JUMP';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getServeOrigin(server: PlayerState, kind: ServeKind): Vec3 {
  const endLine = COURT.length / 2 + 0.35;
  return {
    x: server.position.x,
    y: kind === 'JUMP' ? 3.25 : 2.35,
    z: server.side === 'home' ? -endLine : endLine,
  };
}

export function performServe(
  ball: BallState,
  server: PlayerState,
  target: Vec3,
  kind: ServeKind,
  power: number,
): BallState {
  const normalizedPower = clamp01(power);
  const origin = getServeOrigin(server, kind);
  const deltaX = target.x - origin.x;
  const deltaZ = target.z - origin.z;
  const horizontalDistance = Math.max(0.001, Math.hypot(deltaX, deltaZ));
  const horizontalSpeed = kind === 'JUMP'
    ? 17.3 + normalizedPower * 3.2
    : 12.8 + normalizedPower * 2.8;
  const verticalSpeed = kind === 'JUMP' ? 1.8 : 3.55;
  const direction = Math.sign(deltaZ) || 1;

  return {
    ...ball,
    position: origin,
    velocity: {
      x: (deltaX / horizontalDistance) * horizontalSpeed,
      y: verticalSpeed,
      z: (deltaZ / horizontalDistance) * horizontalSpeed,
    },
    spin:
      kind === 'JUMP'
        ? { x: 18 * direction, y: 0, z: 0 }
        : { x: 0.8 * direction, y: 1.2 * (0.5 - normalizedPower), z: 0 },
    inPlay: true,
    lastTouchedBy: server.id,
    lastContact: 'SERVE',
    attackTimingBonus: 0,
  };
}
