import { describe, expect, it } from 'vitest';
import {
  createReworkRuntime,
  stepReworkRuntime,
} from '../../../src/game/rework/runtime';
import type { ReworkInput, ReworkRuntimeState } from '../../../src/game/rework/types';

function idleInput(): ReworkInput {
  return {
    moveAxis: 0,
    playPressed: false,
    powerPressed: false,
    powerReleased: false,
    powerSwipe: null,
  };
}

function moveInput(axis: number): ReworkInput {
  return { ...idleInput(), moveAxis: axis };
}

function pressPlay(): ReworkInput {
  return { ...idleInput(), playPressed: true };
}

function pressPower(): ReworkInput {
  return { ...idleInput(), powerPressed: true };
}

function swipePower(x: number, y: number): ReworkInput {
  return {
    ...idleInput(),
    powerSwipe: { x, y, durationMs: 120 },
  };
}

function incomingBallToKai(runtime: ReworkRuntimeState): ReworkRuntimeState {
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: { ...runtime.match.rally, phase: 'RALLY' },
      players: runtime.match.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: -2.6, y: 0, z: -5.3 } }
          : player,
      ),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'away-0',
        lastContact: 'SPIKE',
        position: { x: -2.6, y: 1.15, z: -5.0 },
        velocity: { x: 0, y: -1.2, z: -3.5 },
      },
    },
  };
}

function runFrames(
  runtime: ReworkRuntimeState,
  frames: number,
  inputFactory: () => ReworkInput,
  stop: (state: ReworkRuntimeState) => boolean,
): ReworkRuntimeState {
  let next = runtime;
  for (let frame = 0; frame < frames && !stop(next); frame += 1) {
    next = stepReworkRuntime(next, inputFactory(), 1 / 60);
  }
  return next;
}

describe('2.5d focus-player runtime', () => {
  it('completes KAI RECEIVE -> REN SET -> KAI JUMP -> KAI SPIKE without switching control', () => {
    let runtime = incomingBallToKai(createReworkRuntime(42, 'NORMAL'));

    runtime = stepReworkRuntime(runtime, pressPlay(), 1 / 60);
    expect(runtime.lastEvent?.type).toBe('RECEIVE');
    expect(runtime.match.ball.lastTouchedBy).toBe('home-0');
    expect(runtime.focusPlayerId).toBe('home-0');

    runtime = runFrames(
      runtime,
      150,
      () => idleInput(),
      (state) => state.match.ball.lastContact === 'SET',
    );
    expect(runtime.match.ball.lastTouchedBy).toBe('home-1');
    expect(runtime.match.ball.lastContact).toBe('SET');
    expect(runtime.focusPlayerId).toBe('home-0');

    runtime = runFrames(
      runtime,
      90,
      () => moveInput(1),
      (state) => state.powerLabel === 'JUMP',
    );
    expect(runtime.powerLabel).toBe('JUMP');

    runtime = stepReworkRuntime(runtime, pressPower(), 1 / 60);
    expect(runtime.match.players.find((player) => player.id === 'home-0')?.isAirborne).toBe(true);
    expect(runtime.focusPlayerId).toBe('home-0');

    runtime = runFrames(
      runtime,
      30,
      () => idleInput(),
      (state) => state.powerLabel === 'SPIKE',
    );
    expect(runtime.powerLabel).toBe('SPIKE');

    runtime = stepReworkRuntime(runtime, swipePower(120, -30), 1 / 60);
    expect(runtime.lastEvent?.type).toBe('SPIKE');
    expect(runtime.lastEvent?.actorId).toBe('home-0');
    expect(runtime.match.ball.lastContact).toBe('SPIKE');
    expect(runtime.focusPlayerId).toBe('home-0');
  });
});
