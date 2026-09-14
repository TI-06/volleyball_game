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

function spikeReady(runtime: ReworkRuntimeState): ReworkRuntimeState {
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: { ...runtime.match.rally, phase: 'RALLY' },
      players: runtime.match.players.map((player) =>
        player.id === 'home-0'
          ? {
              ...player,
              isAirborne: true,
              position: { x: -2.5, y: 0.45, z: -1.0 },
              velocity: { ...player.velocity, y: 4.5 },
            }
          : player,
      ),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET',
        position: { x: -2.5, y: 3.05, z: -0.8 },
        velocity: { x: 0, y: -0.2, z: 0.1 },
      },
    },
  };
}

describe('rework spike swipe direction', () => {
  it('maps screen-right swipe to the screen-right attack lane', () => {
    let runtime = spikeReady(createReworkRuntime(72, 'NORMAL'));
    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerSwipe: { x: 120, y: -30, durationMs: 120 } },
      1 / 60,
    );

    expect(runtime.lastEvent?.type).toBe('SPIKE');
    expect(runtime.match.ball.velocity.x).toBeLessThan(0);
  });

  it('maps screen-left swipe to the screen-left attack lane', () => {
    let runtime = spikeReady(createReworkRuntime(73, 'NORMAL'));
    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerSwipe: { x: -120, y: -30, durationMs: 120 } },
      1 / 60,
    );

    expect(runtime.lastEvent?.type).toBe('SPIKE');
    expect(runtime.match.ball.velocity.x).toBeGreaterThan(0);
  });
});
