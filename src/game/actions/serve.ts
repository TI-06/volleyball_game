import { COURT } from '../core/constants';
import type { BallState, PlayerState, Vec3 } from '../core/types';
import { solveServeTrajectory } from './serveTrajectory';

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
  const direction = Math.sign(deltaZ) || 1;

  const velocity =
    kind === 'FLOAT'
      ? solveServeTrajectory({
          origin,
          target,
          aggression: normalizedPower,
          netHeight: COURT.netHeight,
        }).velocity
      : (() => {
          const horizontalSpeed = 17.3 + normalizedPower * 3.2;
          return {
            x: (deltaX / horizontalDistance) * horizontalSpeed,
            y: 1.8,
            z: (deltaZ / horizontalDistance) * horizontalSpeed,
          };
        })();

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
    lastContact: 'SERVE',
    attackTimingBonus: 0,
  };
}
