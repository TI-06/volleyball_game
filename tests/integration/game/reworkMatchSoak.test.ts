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
    powerCancelled: false,
  };
}

function autopilot(runtime: ReworkRuntimeState): ReworkInput {
  const input = idle();

  if (runtime.powerLabel === 'SERVE') {
    if (runtime.powerHoldStartedAt === null) input.powerPressed = true;
    else if (runtime.match.time - runtime.powerHoldStartedAt >= 0.34) {
      input.powerReleased = true;
      input.powerSwipe = { x: 0, y: 0, durationMs: 340 };
    }
    return input;
  }

  if (runtime.playLabel === 'RECEIVE') {
    input.playPressed = true;
    return input;
  }

  if (runtime.powerLabel === 'JUMP') {
    input.powerPressed = true;
    return input;
  }

  if (runtime.powerLabel === 'SPIKE') {
    input.powerSwipe = { x: 0, y: -78, durationMs: 210 };
    return input;
  }

  if (runtime.powerLabel === 'BLOCK_READY') {
    if (runtime.blockHoldStartedAt === null) input.powerPressed = true;
    else if (runtime.match.time - runtime.blockHoldStartedAt >= 0.1) input.powerReleased = true;
  }

  return input;
}

function expectFiniteRuntime(runtime: ReworkRuntimeState): void {
  const vectors = [
    runtime.match.ball.position,
    runtime.match.ball.velocity,
    runtime.match.ball.spin,
    ...runtime.match.players.flatMap((player) => [player.position, player.velocity]),
  ];
  for (const vector of vectors) {
    expect(Number.isFinite(vector.x)).toBe(true);
    expect(Number.isFinite(vector.y)).toBe(true);
    expect(Number.isFinite(vector.z)).toBe(true);
  }
}

describe('rework full match soak', () => {
  it('reaches a legal winner under deterministic playable inputs without invalid physics', () => {
    let runtime = createReworkRuntime(92026, 'NORMAL');
    let rallyPoints = 0;
    let previousTotal = 0;

    for (let frame = 0; frame < 120_000 && !runtime.match.winner; frame += 1) {
      runtime = stepReworkRuntime(runtime, autopilot(runtime), 1 / 60);
      if (frame % 120 === 0) expectFiniteRuntime(runtime);

      const total = runtime.match.score.home + runtime.match.score.away;
      if (total > previousTotal) {
        rallyPoints += total - previousTotal;
        previousTotal = total;
      }

      expect(runtime.match.score.home).toBeLessThanOrEqual(20);
      expect(runtime.match.score.away).toBeLessThanOrEqual(20);
    }

    expectFiniteRuntime(runtime);
    expect(runtime.match.winner).toMatch(/^(home|away)$/);
    expect(rallyPoints).toBeGreaterThanOrEqual(15);
    expect(Math.max(runtime.match.score.home, runtime.match.score.away)).toBeGreaterThanOrEqual(15);
    expect(Math.max(runtime.match.score.home, runtime.match.score.away)).toBeLessThanOrEqual(20);
  });
});
