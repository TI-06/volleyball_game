import { describe, expect, it } from 'vitest';
import { BALL_RADIUS } from '../../../src/game/ball/ballPhysics';
import { COURT } from '../../../src/game/core/constants';
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
              position: { x: 0, y: 0.4, z: -1.6 },
              velocity: { ...player.velocity, y: 4.2 },
            }
          : player,
      ),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET',
        position: { x: 0, y: 3.2, z: -2.1 },
        velocity: { x: 0, y: 1.0, z: 5.2 },
      },
    },
  };
}

describe('rework spike trajectory', () => {
  it('lets a normal POWER spike clear the net and enter the opponent court', () => {
    let runtime = spikeReady(createReworkRuntime(52, 'NORMAL'));
    runtime = stepReworkRuntime(
      runtime,
      { ...idle(), powerSwipe: { x: 0, y: -120, durationMs: 110 } },
      1 / 60,
    );

    expect(runtime.lastEvent?.type).toBe('SPIKE');

    let crossed = false;
    let crossingY = 0;
    for (let frame = 0; frame < 30 && runtime.match.rally.phase === 'RALLY'; frame += 1) {
      const before = runtime.match.ball;
      runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
      const after = runtime.match.ball;
      if (before.position.z < 0 && after.position.z >= 0) {
        crossed = true;
        crossingY = after.position.y;
        break;
      }
    }

    expect(crossed).toBe(true);
    expect(crossingY).toBeGreaterThan(COURT.netHeight + BALL_RADIUS);
  });
});
