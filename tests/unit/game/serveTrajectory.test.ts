import { describe, expect, it } from 'vitest';
import { performServe, type ServeKind } from '../../../src/game/actions/serve';
import { integrateBall } from '../../../src/game/ball/ballPhysics';
import { createMatch } from '../../../src/game/core/createMatch';

function crossesNet(kind: ServeKind): boolean {
  const match = createMatch(140);
  const server = match.players.find((player) => player.id === 'home-0')!;
  let ball = performServe(
    match.ball,
    server,
    { x: 0, y: 0, z: 6.2 },
    kind,
    0.72,
  );

  for (let frame = 0; frame < 480; frame += 1) {
    ball = integrateBall(ball, 1 / 240);
    if (ball.position.z >= 0) return true;
    if (ball.velocity.z < 0 || ball.position.y <= 0) return false;
  }

  return false;
}

describe('serve trajectory', () => {
  it('lets a standard float serve clear the net', () => {
    expect(crossesNet('FLOAT')).toBe(true);
  });

  it('lets a standard jump serve clear the net', () => {
    expect(crossesNet('JUMP')).toBe(true);
  });
});
