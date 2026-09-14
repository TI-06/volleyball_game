import { describe, expect, it } from 'vitest';
import {
  createReworkRuntime,
  stepReworkRuntime,
} from '../../../src/game/rework/playableRuntime';
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

describe('rework match over lifecycle', () => {
  it('emits the final POINT once and clears the event on the next fixed step', () => {
    let runtime = createReworkRuntime(120, 'NORMAL');
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        score: { home: 14, away: 0 },
        rally: {
          ...runtime.match.rally,
          phase: 'RALLY',
          servingSide: 'home',
        },
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-0',
          lastContact: 'SPIKE',
          position: { x: 4, y: 0.02, z: 7 },
          velocity: { x: 0, y: -2, z: 0 },
        },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);

    expect(runtime.match.score).toEqual({ home: 15, away: 0 });
    expect(runtime.match.winner).toBe('home');
    expect(runtime.match.rally.phase).toBe('MATCH_OVER');
    expect(runtime.lastEvent).toMatchObject({ type: 'POINT', value: 1 });

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);

    expect(runtime.match.score).toEqual({ home: 15, away: 0 });
    expect(runtime.match.winner).toBe('home');
    expect(runtime.lastEvent).toBeNull();
  });
});
