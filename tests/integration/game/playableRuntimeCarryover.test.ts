import { describe, expect, it } from 'vitest';
import {
  createMatchRuntime,
  stepMatchRuntime,
  type MatchRuntimeState,
  type RuntimeInput,
} from '../../../src/game/runtime/playableRuntime';

function idleInput(): RuntimeInput {
  return {
    move: { x: 0, z: 0 },
    aim: { x: 0, z: 6.2 },
    swipe: null,
    actionPressed: false,
    actionReleased: false,
    requestedPlayerId: null,
  };
}

describe('playable runtime rally carryover', () => {
  it('drops a queued manual switch before the next rally starts', () => {
    const runtime = createMatchRuntime(188, 'NORMAL', 'STANDARD');
    const prepared: MatchRuntimeState = {
      ...runtime,
      queuedPlayerId: 'home-2',
      match: {
        ...runtime.match,
        time: 1,
        players: runtime.match.players.map((player) =>
          player.id === runtime.controlledPlayerId
            ? { ...player, isAirborne: true, position: { ...player.position, y: 0.5 } }
            : player,
        ),
        rally: {
          ...runtime.match.rally,
          phase: 'POINT',
          pointResolvedAt: 0,
        },
      },
    };

    const next = stepMatchRuntime(prepared, idleInput(), 1 / 60);

    expect(next.match.rally.phase).toBe('SERVE_READY');
    expect(next.queuedPlayerId).toBeNull();
  });
});
