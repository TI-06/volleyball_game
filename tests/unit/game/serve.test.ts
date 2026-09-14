import { describe, expect, it } from 'vitest';
import { getServeOrigin } from '../../../src/game/actions/serve';
import { COURT } from '../../../src/game/core/constants';
import { createMatch } from '../../../src/game/core/createMatch';

describe('serve origin', () => {
  it('places the home server behind the home end line', () => {
    const match = createMatch(1);
    const server = match.players.find((player) => player.id === 'home-0')!;
    const origin = getServeOrigin(server, 'FLOAT');

    expect(origin.z).toBeLessThan(-COURT.length / 2);
    expect(origin.y).toBeGreaterThan(2);
  });

  it('places the away server behind the away end line', () => {
    const match = createMatch(1);
    const server = match.players.find((player) => player.id === 'away-0')!;
    const origin = getServeOrigin(server, 'JUMP');

    expect(origin.z).toBeGreaterThan(COURT.length / 2);
    expect(origin.y).toBeGreaterThan(2.4);
  });
});
