import { describe, expect, it } from 'vitest';
import { performServe } from '../../../src/game/actions/serve';
import { createMatch } from '../../../src/game/core/createMatch';
import { startRallyWithBall } from '../../../src/game/core/rally';
import { stepMatch } from '../../../src/game/core/stepMatch';

const idleInput = {
  move: { x: 0, z: 0 },
  actionPressed: false,
  actionReleased: false,
  requestedPlayerId: null,
};

describe('dead-ball resolution', () => {
  it('keeps a legal serve alive while it travels in from behind the end line', () => {
    let state = createMatch(160);
    const server = state.players.find((player) => player.id === 'home-0')!;
    state = startRallyWithBall(
      state,
      performServe(state.ball, server, { x: 0, y: 0, z: 6.2 }, 'FLOAT', 0.72),
    );

    const next = stepMatch(state, idleInput, 1 / 240);

    expect(next.score).toEqual({ home: 0, away: 0 });
    expect(next.rally.phase).toBe('RALLY');
    expect(next.ball.inPlay).toBe(true);
  });

  it('lets an untouched standard serve land in and score for the server', () => {
    let state = createMatch(162);
    const server = state.players.find((player) => player.id === 'home-0')!;
    state = startRallyWithBall(
      state,
      performServe(state.ball, server, { x: 0, y: 0, z: 6.2 }, 'FLOAT', 0.72),
    );

    for (let frame = 0; frame < 360 && state.score.home === 0; frame += 1) {
      state = stepMatch(state, idleInput, 1 / 120);
    }

    expect(state.score).toEqual({ home: 1, away: 0 });
    expect(state.rally.phase).toBe('POINT');
  });

  it('awards an out ball only after it contacts the floor outside the court', () => {
    const base = createMatch(161);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        position: { x: 5.1, y: 0.01, z: 3 },
        velocity: { x: 0, y: -2, z: 0 },
      },
    };

    const next = stepMatch(state, idleInput, 1 / 60);

    expect(next.score).toEqual({ home: 0, away: 1 });
    expect(next.rally.phase).toBe('POINT');
  });
});
