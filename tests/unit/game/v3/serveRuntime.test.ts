import { describe, expect, it } from 'vitest';
import {
  createV3MatchRuntime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeState,
} from '../../../../src/game/v3/core/runtime';

function stepFor(source: V3RuntimeState, seconds: number): V3RuntimeState {
  let state = source;
  const dt = 1 / 60;
  const steps = Math.ceil(seconds / dt);
  for (let index = 0; index < steps; index += 1) {
    state = stepV3Runtime(state, emptyV3RuntimeInput(), dt);
  }
  return state;
}

function placeControlledAtServeTarget(state: V3RuntimeState): V3RuntimeState {
  const target = state.serve?.target ?? state.rally.landingTarget;
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.controlledPlayerId
        ? { ...player, position: { ...target } }
        : player,
    ),
  };
}

describe('V3 serve opening runtime', () => {
  it('creates a deterministic CPU serve opening with HINA reading the receive', () => {
    const first = createV3MatchRuntime(73);
    const second = createV3MatchRuntime(73);

    expect(first).toEqual(second);
    expect(first.phase).toBe('SERVE_READY');
    expect(first.serve?.side).toBe('away');
    expect(first.serve?.serverPlayerId).toBe('away-0');
    expect(first.controlledPlayerId).toBe('home-2');
    expect(first.serve?.target.z).toBeLessThan(-4.5);
    expect(first.serve?.idealContactAt).toBeGreaterThan(0.4);
    expect(first.serve?.landingAt).toBeGreaterThan(first.serve?.idealContactAt ?? 0);
    expect(first.rally.landingTarget).toEqual(first.serve?.target);
  });

  it('can create a home serve opening with KAI behind the baseline', () => {
    const state = createV3MatchRuntime(73, 'home');
    const kai = state.players.find((player) => player.id === 'home-0');

    expect(state.phase).toBe('SERVE_READY');
    expect(state.serve?.side).toBe('home');
    expect(state.serve?.serverPlayerId).toBe('home-0');
    expect(state.controlledPlayerId).toBe('home-0');
    expect(state.serve?.target.z).toBeGreaterThan(4.5);
    expect(state.serve?.contactAt).toBeNull();
    expect(kai?.position.z).toBeLessThan(-8);
  });

  it('automatically contacts a CPU serve and gives HINA a readable flight forecast', () => {
    const initial = createV3MatchRuntime(73);
    const beforeContact = stepFor(initial, 0.5);
    const flight = stepFor(initial, 0.9);

    expect(beforeContact.phase).toBe('SERVE_READY');
    expect(beforeContact.ball.position.y).toBeGreaterThan(initial.ball.position.y);
    expect(flight.phase).toBe('SERVE_FLIGHT');
    expect(flight.controlledPlayerId).toBe('home-2');
    expect(flight.forecast).not.toBeNull();
    expect(flight.ball.position.z).toBeLessThan(beforeContact.ball.position.z);
  });

  it('accepts an early ACTION during CPU serve flight and reuses the receive-to-set flow', () => {
    let state = placeControlledAtServeTarget(createV3MatchRuntime(73));
    const landingAt = state.serve?.landingAt;
    expect(landingAt).not.toBeNull();
    if (landingAt == null) return;

    state = stepFor(state, landingAt - 0.28);
    expect(state.phase).toBe('SERVE_FLIGHT');

    state = stepV3Runtime(
      state,
      { ...emptyV3RuntimeInput(), actionPressed: true },
      1 / 60,
    );
    expect(state.bufferedAction?.kind).toBe('ACTION');

    state = stepFor(state, 0.34);
    expect(state.lastEvent?.type).toBe('RECEIVE');
    expect(state.phase).toBe('SET_BUILDUP');
    expect(state.score).toEqual({ home: 0, away: 0 });
  });
});
