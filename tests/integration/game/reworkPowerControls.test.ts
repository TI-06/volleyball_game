import { describe, expect, it } from 'vitest';
import {
  createReworkRuntime,
  stepReworkRuntime,
} from '../../../src/game/rework/runtime';
import type { ReworkInput, ReworkRuntimeState } from '../../../src/game/rework/types';

function idle(): ReworkInput {
  return {
    moveAxis: 0,
    playPressed: false,
    powerPressed: false,
    powerReleased: false,
    powerSwipe: null,
  };
}

function opponentSet(runtime: ReworkRuntimeState): ReworkRuntimeState {
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: { ...runtime.match.rally, phase: 'RALLY', servingSide: 'away' },
      players: runtime.match.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, position: { x: 0, y: 0, z: -1.0 }, isAirborne: false }
          : player,
      ),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET',
        position: { x: 0, y: 3.0, z: 0.7 },
        velocity: { x: 0, y: 0.4, z: 0 },
      },
    },
  };
}

describe('rework POWER controls', () => {
  it('charges and releases a FLOAT serve from the same POWER zone', () => {
    let runtime = createReworkRuntime(60, 'NORMAL');

    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerPressed: true },
      1 / 60,
    );
    expect(runtime.powerHoldStartedAt).not.toBeNull();
    expect(runtime.match.rally.phase).toBe('SERVE_READY');

    for (let frame = 0; frame < 24; frame += 1) {
      runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
    }

    runtime = stepReworkRuntime(
      runtime,
      {
        ...idle(),
        powerReleased: true,
        powerSwipe: { x: 70, y: 0, durationMs: 400 },
      },
      1 / 60,
    );

    expect(runtime.lastEvent?.type).toBe('SERVE');
    expect(runtime.match.rally.phase).toBe('RALLY');
    expect(runtime.match.ball.lastContact).toBe('SERVE');
    expect(runtime.match.ball.lastTouchedBy).toBe('home-0');
    expect(runtime.match.ball.velocity.z).toBeGreaterThan(0);
    expect(runtime.powerHoldStartedAt).toBeNull();
  });

  it('uses one hold/release to jump for a block and auto-contacts the spike', () => {
    let runtime = opponentSet(createReworkRuntime(61, 'NORMAL'));

    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerPressed: true },
      1 / 60,
    );
    expect(runtime.blockHoldStartedAt).not.toBeNull();
    expect(runtime.match.players.find((player) => player.id === 'home-0')?.isAirborne).toBe(false);

    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerReleased: true },
      1 / 60,
    );
    expect(runtime.blockHoldStartedAt).toBeNull();
    expect(runtime.match.players.find((player) => player.id === 'home-0')?.isAirborne).toBe(true);

    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        rally: { ...runtime.match.rally, phase: 'RALLY' },
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-0',
          lastContact: 'SPIKE',
          position: { x: 0, y: 2.65, z: 0.45 },
          velocity: { x: 0, y: -2.5, z: -12 },
        },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
    expect(runtime.lastEvent?.type).toBe('BLOCK');
    expect(runtime.lastEvent?.actorId).toBe('home-0');
    expect(runtime.match.ball.lastContact).toBe('BLOCK');
  });

  it('keeps a block reservation through SET -> SPIKE and jumps on release', () => {
    let runtime = opponentSet(createReworkRuntime(62, 'NORMAL'));

    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerPressed: true },
      1 / 60,
    );
    expect(runtime.blockHoldStartedAt).not.toBeNull();

    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-0',
          lastContact: 'SPIKE',
          position: { x: 0, y: 2.9, z: 0.8 },
          velocity: { x: 0, y: -1.5, z: -13 },
        },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
    expect(runtime.blockHoldStartedAt).not.toBeNull();

    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerReleased: true },
      1 / 60,
    );

    expect(runtime.blockHoldStartedAt).toBeNull();
    expect(runtime.lastEvent).toMatchObject({ type: 'JUMP', actorId: 'home-0' });
    expect(runtime.match.players.find((player) => player.id === 'home-0')?.isAirborne).toBe(true);
  });
});
