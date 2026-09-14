import { describe, expect, it } from 'vitest';
import { performReceive } from '../../../src/game/actions/receive';
import { performServe } from '../../../src/game/actions/serve';
import { performSet } from '../../../src/game/actions/set';
import { performSpike } from '../../../src/game/actions/spike';
import { STARTER_ROSTER } from '../../../src/game/characters/roster';
import { createMatch } from '../../../src/game/core/createMatch';
import { startRallyWithBall } from '../../../src/game/core/rally';
import { stepMatch } from '../../../src/game/core/stepMatch';

const idleInput = {
  move: { x: 0, z: 0 },
  actionPressed: false,
  actionReleased: false,
  requestedPlayerId: null,
};

describe('rally flow', () => {
  it('can resolve serve, receive, set, spike and a point through the authoritative state', () => {
    let state = createMatch(42);
    state = {
      ...state,
      rally: { ...state.rally, servingSide: 'away', serverIndex: { home: 0, away: 0 } },
    };

    const awayServer = state.players.find((player) => player.id === 'away-0')!;
    const served = performServe(
      state.ball,
      awayServer,
      { x: 2.3, y: 0, z: -5.2 },
      'FLOAT',
      0.7,
    );
    state = startRallyWithBall(state, served);

    const received = performReceive(
      state.ball,
      STARTER_ROSTER.hina,
      'home-2',
      { x: 0, y: 2.2, z: -1.2 },
      0,
    );
    state = { ...state, ball: received.ball };

    const set = performSet(
      state.ball,
      STARTER_ROSTER.ren,
      'home-1',
      { x: -2.2, y: 3.1, z: -0.5 },
      0,
      'NORMAL',
    );
    state = { ...state, ball: set.ball };

    const spike = performSpike(
      state.ball,
      STARTER_ROSTER.kai,
      'home-0',
      { x: 1.6, y: 0, z: 6.4 },
      0,
      'POWER',
    );
    state = { ...state, ball: spike.ball };

    for (let frame = 0; frame < 240 && state.score.home === 0; frame += 1) {
      state = stepMatch(state, idleInput, 1 / 60);
    }

    expect(state.score).toEqual({ home: 1, away: 0 });
    expect(state.rally.phase).toBe('POINT');
  });
});
