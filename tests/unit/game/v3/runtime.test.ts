import { describe, expect, it } from 'vitest';
import {
  createV3Runtime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeState,
} from '../../../../src/game/v3/core/runtime';

function stepFor(
  source: V3RuntimeState,
  seconds: number,
  inputAtStep?: (state: V3RuntimeState) => ReturnType<typeof emptyV3RuntimeInput>,
): V3RuntimeState {
  let state = source;
  const dt = 1 / 60;
  const steps = Math.ceil(seconds / dt);
  for (let index = 0; index < steps; index += 1) {
    state = stepV3Runtime(state, inputAtStep?.(state) ?? emptyV3RuntimeInput(), dt);
  }
  return state;
}

function placeControlledAtLanding(state: V3RuntimeState): V3RuntimeState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.controlledPlayerId
        ? { ...player, position: { ...state.rally.landingTarget } }
        : player,
    ),
  };
}

describe('V3 playable rally runtime', () => {
  it('creates deterministic opponent attack timing, landing, and early forecast', () => {
    const first = createV3Runtime(73);
    const second = createV3Runtime(73);

    expect(first).toEqual(second);
    expect(first.phase).toBe('DEFENSE_READ');
    expect(first.controlledPlayerId).toBe('home-2');
    expect(first.forecast?.stage).toBe('SET_READ');
    expect(first.rally.opponentContactAt).toBeGreaterThan(0.7);
    expect(first.rally.receiveContactAt).toBeGreaterThan(first.rally.opponentContactAt);

    const approachRead = stepFor(first, 0.5);
    expect(approachRead.forecast?.stage).toBe('APPROACH_READ');

    const contactRead = stepFor(first, 0.85);
    expect(contactRead.forecast?.stage).toBe('CONTACT_READ');

    const flight = stepFor(first, 1.15);
    expect(flight.forecast?.stage).toBe('FLIGHT_CONFIRMED');
    expect(flight.ball.position.z).toBeLessThan(first.ball.position.z);
  });

  it('moves the controlled defender directly on both court axes', () => {
    const source = createV3Runtime(73);
    const before = source.players.find((player) => player.id === source.controlledPlayerId)!;
    const next = stepFor(source, 0.2, () => ({
      ...emptyV3RuntimeInput(),
      move: { x: -0.6, z: 0.8 },
    }));
    const after = next.players.find((player) => player.id === next.controlledPlayerId)!;

    expect(after.position.x).toBeLessThan(before.position.x);
    expect(after.position.z).toBeGreaterThan(before.position.z);
  });

  it('accepts ACTION before contact and resolves the receive without a last-frame prompt', () => {
    let state = placeControlledAtLanding(createV3Runtime(73));
    state = stepFor(state, state.rally.receiveContactAt - 0.32);
    state = stepV3Runtime(state, { ...emptyV3RuntimeInput(), actionPressed: true }, 1 / 60);

    expect(state.bufferedAction?.kind).toBe('ACTION');
    expect(state.phase).toBe('RECEIVE_PREP');

    state = stepFor(state, 0.38);
    expect(state.lastEvent?.type).toBe('RECEIVE');
    expect(state.lastEvent?.quality).not.toBe('MISS');
    expect(state.phase).toBe('SET_BUILDUP');
    expect(state.score).toEqual({ home: 0, away: 0 });
  });

  it('awards the CPU point and starts a new readable rally when receive is missed', () => {
    const source = createV3Runtime(73);
    const next = stepFor(source, source.rally.receiveContactAt + 0.12);

    expect(next.score.away).toBe(1);
    expect(next.rallyIndex).toBe(1);
    expect(next.phase).toBe('DEFENSE_READ');
    expect(next.forecast?.stage).toBe('SET_READ');
  });

  it('continues a successful receive into early KAI control, jump, attack intent, and a point', () => {
    let state = placeControlledAtLanding(createV3Runtime(73));
    state = stepFor(state, state.rally.receiveContactAt - 0.28);
    state = stepV3Runtime(state, { ...emptyV3RuntimeInput(), actionPressed: true }, 1 / 60);
    state = stepFor(state, 0.38);

    expect(state.phase).toBe('SET_BUILDUP');
    state = stepFor(state, 0.3);
    expect(state.controlledPlayerId).toBe('home-0');

    state = stepFor(state, Math.max(0, (state.rally.idealJumpAt ?? state.time) - state.time - 0.04));
    state = stepV3Runtime(state, { ...emptyV3RuntimeInput(), jumpPressed: true }, 1 / 60);
    expect(state.phase).toBe('ATTACK_AIRBORNE');

    state = stepV3Runtime(
      state,
      { ...emptyV3RuntimeInput(), attackGesture: { x: -84, y: 38 } },
      1 / 60,
    );
    expect(state.lastEvent).toMatchObject({ type: 'ATTACK', intent: 'CROSS' });
    expect(state.score.home + state.score.away).toBe(1);
    expect(state.rallyIndex).toBe(1);
  });
});
