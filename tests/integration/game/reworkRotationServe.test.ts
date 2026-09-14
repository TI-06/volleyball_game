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

function withHomeServer(index: number) {
  const runtime = createReworkRuntime(92 + index, 'NORMAL');
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: {
        ...runtime.match.rally,
        phase: 'SERVE_READY' as const,
        servingSide: 'home' as const,
        serverIndex: { ...runtime.match.rally.serverIndex, home: index },
      },
    },
  };
}

function stepFrames(runtime: ReturnType<typeof createReworkRuntime>, count: number) {
  let next = runtime;
  for (let frame = 0; frame < count; frame += 1) {
    next = stepReworkRuntime(next, idle(), 1 / 60);
  }
  return next;
}

describe('rework home serve rotation', () => {
  it('shows REN in a short service windup before auto serving', () => {
    let runtime = withHomeServer(1);

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
    expect(runtime.match.rally.phase).toBe('SERVE_READY');
    expect(runtime.lastEvent).toBeNull();

    runtime = stepFrames(runtime, 30);

    expect(runtime.lastEvent).toMatchObject({ type: 'SERVE', actorId: 'home-1' });
    expect(runtime.match.rally.phase).toBe('RALLY');
    expect(runtime.match.ball.lastTouchedBy).toBe('home-1');
    expect(runtime.focusPlayerId).toBe('home-0');
  });

  it('shows HINA in a short service windup before auto serving', () => {
    let runtime = withHomeServer(2);

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
    expect(runtime.match.rally.phase).toBe('SERVE_READY');
    expect(runtime.lastEvent).toBeNull();

    runtime = stepFrames(runtime, 30);

    expect(runtime.lastEvent).toMatchObject({ type: 'SERVE', actorId: 'home-2' });
    expect(runtime.match.rally.phase).toBe('RALLY');
    expect(runtime.match.ball.lastTouchedBy).toBe('home-2');
  });

  it('keeps KAI serve manual when rotation returns to index zero', () => {
    let runtime = withHomeServer(0);

    runtime = stepFrames(runtime, 35);

    expect(runtime.lastEvent).toBeNull();
    expect(runtime.match.rally.phase).toBe('SERVE_READY');
    expect(runtime.powerLabel).toBe('SERVE');
    expect(runtime.focusPlayerId).toBe('home-0');
  });
});
