import { describe, expect, it } from 'vitest';
import { integrateBall } from '../../../src/game/ball/ballPhysics';
import { COURT } from '../../../src/game/core/constants';
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

function serveFromRuntime(swipeX: number, holdFrames: number) {
  let runtime = createReworkRuntime(7100 + swipeX + holdFrames, 'NORMAL');
  runtime = stepReworkRuntime(runtime, { ...idle(), powerPressed: true }, 1 / 60);

  for (let frame = 0; frame < holdFrames; frame += 1) {
    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
  }

  runtime = stepReworkRuntime(
    runtime,
    {
      ...idle(),
      powerReleased: true,
      powerSwipe:
        swipeX === 0 ? null : { x: swipeX, y: 0, durationMs: 260 },
    },
    1 / 60,
  );

  expect(runtime.lastEvent?.type).toBe('SERVE');
  return runtime.match.ball;
}

function simulateLanding(swipeX: number, holdFrames: number) {
  let ball = serveFromRuntime(swipeX, holdFrames);
  let crossedNet = false;

  for (let frame = 0; frame < 720 && ball.position.y > 0; frame += 1) {
    ball = integrateBall(ball, 1 / 240);
    if (ball.position.z > 0) crossedNet = true;
  }

  return { ball, crossedNet };
}

describe('rework normal serve landing matrix', () => {
  it.each([
    [-70, 1],
    [-70, 18],
    [-70, 36],
    [0, 1],
    [0, 18],
    [0, 36],
    [70, 1],
    [70, 18],
    [70, 36],
  ])(
    'crosses the net and lands in bounds: swipe=%i holdFrames=%i',
    (swipeX, holdFrames) => {
      const { ball, crossedNet } = simulateLanding(swipeX, holdFrames);

      expect(crossedNet).toBe(true);
      expect(ball.position.y).toBeLessThanOrEqual(0);
      expect(ball.position.z).toBeGreaterThan(0);
      expect(ball.position.z).toBeLessThanOrEqual(COURT.length / 2);
      expect(Math.abs(ball.position.x)).toBeLessThanOrEqual(COURT.width / 2);
    },
  );
});
