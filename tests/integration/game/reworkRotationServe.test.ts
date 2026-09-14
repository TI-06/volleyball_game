import { describe, expect, it } from 'vitest';
import {
  createReworkRuntime,
  stepReworkRuntime,
} from '../../../src/game/rework/runtime';
import type { ReworkInput } from '../../../src/game/rework/types';

function idle(): ReworkInput {
  return {
    moveAxis: 0,
    playPressed: false,
    powerPressed: false,
    powerReleased: false,
    powerSwipe: null,
  };
}

describe('rework home serve rotation', () => {
  it('auto serves when REN is the current home server and keeps KAI as focus', () => {
    let runtime = createReworkRuntime(92, 'NORMAL');
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        rally: {
          ...runtime.match.rally,
          phase: 'SERVE_READY',
          servingSide: 'home',
          serverIndex: { ...runtime.match.rally.serverIndex, home: 1 },
        },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);

    expect(runtime.lastEvent).toMatchObject({ type: 'SERVE', actorId: 'home-1' });
    expect(runtime.match.rally.phase).toBe('RALLY');
    expect(runtime.match.ball.lastTouchedBy).toBe('home-1');
    expect(runtime.focusPlayerId).toBe('home-0');
  });
});
