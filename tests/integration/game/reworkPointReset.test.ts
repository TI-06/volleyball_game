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

describe('rework point lifecycle', () => {
  it('returns all players to base formation when point pause ends', () => {
    let runtime = createReworkRuntime(93, 'NORMAL');
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        time: 2,
        players: runtime.match.players.map((player) => ({
          ...player,
          isAirborne: true,
          position: { x: 4, y: 0.8, z: player.side === 'home' ? -0.5 : 0.5 },
          velocity: { x: 1, y: 3, z: 1 },
        })),
        rally: {
          ...runtime.match.rally,
          phase: 'POINT',
          servingSide: 'away',
          pointResolvedAt: 1,
          lastPointWinner: 'away',
        },
        ball: { ...runtime.match.ball, inPlay: false },
      },
      cpuMemory: {
        'away-0': { role: 'APPROACH', readyAt: 9 },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);

    expect(runtime.match.rally.phase).toBe('SERVE_READY');
    expect(runtime.match.players.find((player) => player.id === 'home-0')?.position).toEqual({ x: -2.6, y: 0, z: -5.5 });
    expect(runtime.match.players.find((player) => player.id === 'away-2')?.position).toEqual({ x: 2.6, y: 0, z: 5.5 });
    expect(runtime.match.players.every((player) => !player.isAirborne)).toBe(true);
    expect(runtime.cpuMemory).toEqual({});
  });
});
