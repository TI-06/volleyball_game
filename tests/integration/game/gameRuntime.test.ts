import { describe, expect, it } from 'vitest';
import {
  createMatchRuntime,
  stepMatchRuntime,
  type MatchRuntimeState,
  type RuntimeInput,
} from '../../../src/game/runtime/gameRuntime';

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

function awayServe(runtime: MatchRuntimeState): MatchRuntimeState {
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: {
        ...runtime.match.rally,
        servingSide: 'away',
        serverIndex: { home: 0, away: 0 },
      },
    },
  };
}

function runUntilCpuServe(
  seed: number,
  difficulty: 'HARD' | 'EXPERT' = 'EXPERT',
): MatchRuntimeState {
  let runtime = awayServe(createMatchRuntime(seed, difficulty, 'MANUAL'));
  for (let frame = 0; frame < 90 && runtime.match.rally.phase === 'SERVE_READY'; frame += 1) {
    runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
  }
  return runtime;
}

describe('game runtime cpu serve variation', () => {
  it('keeps the existing cpu serve flow while applying seed-based target variation', () => {
    const first = runUntilCpuServe(123);
    const second = runUntilCpuServe(124);

    expect(first.match.rally.phase).toBe('RALLY');
    expect(second.match.rally.phase).toBe('RALLY');
    expect(first.match.ball.lastTouchedBy).toBe('away-0');
    expect(second.match.ball.lastTouchedBy).toBe('away-0');
    expect(first.match.ball.lastContact).toBe('SERVE');
    expect(second.match.ball.lastContact).toBe('SERVE');
    expect(first.match.ball.velocity.x).not.toBeCloseTo(second.match.ball.velocity.x, 2);
  });

  it('uses a float serve for the tutorial opening ball even if HARD was selected', () => {
    const tutorial = runUntilCpuServe(1, 'HARD');

    expect(tutorial.match.ball.lastContact).toBe('SERVE');
    expect(tutorial.match.ball.position.y).toBeLessThan(2.6);
  });
});
