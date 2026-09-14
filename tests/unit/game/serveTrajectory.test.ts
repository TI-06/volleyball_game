import { describe, expect, it } from 'vitest';
import { performServe, type ServeKind } from '../../../src/game/actions/serve';
import {
  predictServePosition,
  solveServeTrajectory,
} from '../../../src/game/actions/serveTrajectory';
import { integrateBall } from '../../../src/game/ball/ballPhysics';
import { COURT } from '../../../src/game/core/constants';
import { createMatch } from '../../../src/game/core/createMatch';

function simulateServe(kind: ServeKind, power: number) {
  const match = createMatch(140);
  const server = match.players.find((player) => player.id === 'home-0')!;
  let ball = performServe(
    match.ball,
    server,
    { x: 0, y: 0, z: 6.2 },
    kind,
    power,
  );
  let crossedNet = false;

  for (let frame = 0; frame < 720; frame += 1) {
    ball = integrateBall(ball, 1 / 240);
    if (ball.position.z >= 0 && ball.position.y > 0) crossedNet = true;
    if (ball.position.y <= 0) break;
  }

  return { crossedNet, landingZ: ball.position.z };
}

describe('solveServeTrajectory', () => {
  it.each([0.58, 0.74, 0.9])(
    'clears the net and reaches a central target at aggression %s',
    (aggression) => {
      const origin = { x: 0, y: 2.35, z: -(COURT.length / 2 + 0.35) };
      const target = { x: 0, y: 0, z: 6.7 };
      const result = solveServeTrajectory({
        origin,
        target,
        aggression,
        netHeight: COURT.netHeight,
      });

      const netT = result.flightSeconds * ((0 - origin.z) / (target.z - origin.z));
      const atNet = predictServePosition(origin, result.velocity, netT);
      const atLanding = predictServePosition(origin, result.velocity, result.flightSeconds);

      expect(atNet.y).toBeGreaterThan(COURT.netHeight + 0.2);
      expect(atLanding.x).toBeCloseTo(target.x, 2);
      expect(atLanding.z).toBeCloseTo(target.z, 2);
      expect(atLanding.y).toBeCloseTo(0, 2);
    },
  );
});

describe('serve trajectory', () => {
  it('lets a standard float serve clear the net', () => {
    expect(simulateServe('FLOAT', 0.72).crossedNet).toBe(true);
  });

  it('lets a standard jump serve clear the net', () => {
    expect(simulateServe('JUMP', 0.72).crossedNet).toBe(true);
  });

  it('keeps the normal cpu jump-serve power inside the opponent court', () => {
    const result = simulateServe('JUMP', 0.68);
    expect(result.crossedNet).toBe(true);
    expect(result.landingZ).toBeLessThanOrEqual(COURT.length / 2);
    expect(result.landingZ).toBeGreaterThan(0);
  });

  it('lets an overpowered jump serve carry long for a real risk/reward tradeoff', () => {
    const result = simulateServe('JUMP', 1);
    expect(result.crossedNet).toBe(true);
    expect(result.landingZ).toBeGreaterThan(COURT.length / 2);
  });

  it('keeps a full-power float serve safer than a full-power jump serve', () => {
    const result = simulateServe('FLOAT', 1);
    expect(result.crossedNet).toBe(true);
    expect(result.landingZ).toBeLessThanOrEqual(COURT.length / 2);
  });
});
