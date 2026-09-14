import { describe, expect, it } from 'vitest';
import { performServe, type ServeKind } from '../../../src/game/actions/serve';
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
