import { describe, expect, it } from 'vitest';
import {
  createV3Runtime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeState,
} from '../../../../src/game/v3/core/runtime';

function stepFor(source: V3RuntimeState, seconds: number): V3RuntimeState {
  let state = source;
  const dt = 1 / 60;
  const steps = Math.ceil(Math.max(0, seconds) / dt);
  for (let index = 0; index < steps; index += 1) {
    state = stepV3Runtime(state, emptyV3RuntimeInput(), dt);
  }
  return state;
}

function placeKAIAtLaneOffset(state: V3RuntimeState, offsetX: number): V3RuntimeState {
  const lane = state.rally.blockLaneX;
  if (lane === null) throw new Error('seed must create a quick-attack block rally');
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === 'home-0'
        ? { ...player, position: { x: lane + offsetX, z: -1.05 } }
        : player,
    ),
  };
}

function resolveQuickBlock(offsetX: number, pressBlock: boolean): V3RuntimeState {
  let state = placeKAIAtLaneOffset(createV3Runtime(72), offsetX);
  state = stepFor(state, state.rally.opponentContactAt - 0.1);
  if (pressBlock) {
    state = stepV3Runtime(
      state,
      { ...emptyV3RuntimeInput(), jumpPressed: true },
      1 / 60,
    );
  }
  return stepFor(state, 0.14);
}

describe('quick-block continuation trajectories', () => {
  it('turns a TOUCH into a slower shallow cover ball', () => {
    const touch = resolveQuickBlock(0.65, true);
    const miss = resolveQuickBlock(1.6, false);

    expect(touch.lastEvent).toMatchObject({ type: 'BLOCK', result: 'TOUCH' });
    expect(miss.lastEvent).toMatchObject({ type: 'BLOCK', result: 'MISS' });
    expect(touch.rally.landingTarget.z).toBeGreaterThan(-4.5);
    expect(touch.rally.receiveContactAt - touch.time).toBeGreaterThan(
      miss.rally.receiveContactAt - miss.time,
    );

    const touchFlight = stepFor(touch, 0.25);
    const missFlight = stepFor(miss, 0.25);
    expect(touchFlight.ball.position.z).toBeGreaterThan(missFlight.ball.position.z);
  });

  it('turns a DEFLECT into a visibly lateral cover ball', () => {
    const deflect = resolveQuickBlock(1.0, true);
    const miss = resolveQuickBlock(1.6, false);

    expect(deflect.lastEvent).toMatchObject({ type: 'BLOCK', result: 'DEFLECT' });
    expect(Math.abs(deflect.rally.landingTarget.x - miss.rally.landingTarget.x)).toBeGreaterThan(1.25);

    const deflectFlight = stepFor(deflect, 0.25);
    const missFlight = stepFor(miss, 0.25);
    expect(Math.abs(deflectFlight.ball.position.x - missFlight.ball.position.x)).toBeGreaterThan(0.3);
  });
});