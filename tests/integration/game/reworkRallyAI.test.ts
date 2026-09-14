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

function rally(runtime: ReworkRuntimeState): ReworkRuntimeState {
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: { ...runtime.match.rally, phase: 'RALLY' },
    },
  };
}

describe('rework rally AI', () => {
  it('lets HINA take an assigned ball without switching user control away from KAI', () => {
    let runtime = rally(createReworkRuntime(80, 'NORMAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        players: runtime.match.players.map((player) => {
          if (player.id === 'home-0') return { ...player, position: { x: -3.6, y: 0, z: -5.3 } };
          if (player.id === 'home-2') return { ...player, position: { x: 2.6, y: 0, z: -5.2 } };
          return player;
        }),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-0',
          lastContact: 'SERVE',
          position: { x: 2.6, y: 1.35, z: -4.95 },
          velocity: { x: 0, y: -1.1, z: -3.2 },
        },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);

    expect(runtime.lastEvent).toMatchObject({ type: 'RECEIVE', actorId: 'home-2' });
    expect(runtime.match.ball.lastTouchedBy).toBe('home-2');
    expect(runtime.focusPlayerId).toBe('home-0');
  });

  it('lets REN take a nearby first ball and HINA continue with the emergency set', () => {
    let runtime = rally(createReworkRuntime(82, 'NORMAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        players: runtime.match.players.map((player) => {
          if (player.id === 'home-0') return { ...player, position: { x: -3.8, y: 0, z: -5.6 } };
          if (player.id === 'home-1') return { ...player, position: { x: 0, y: 0, z: -2.1 } };
          if (player.id === 'home-2') return { ...player, position: { x: 1.8, y: 0, z: -2.4 } };
          return player;
        }),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-0',
          lastContact: 'SPIKE',
          position: { x: 0.1, y: 1.25, z: -2.05 },
          velocity: { x: 0, y: -1.0, z: -2.8 },
        },
      },
    };

    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
    expect(runtime.lastEvent).toMatchObject({ type: 'RECEIVE', actorId: 'home-1' });

    let setter: string | null = null;
    for (let frame = 0; frame < 180 && setter === null; frame += 1) {
      runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
      if (runtime.lastEvent?.type === 'SET') setter = runtime.lastEvent.actorId ?? null;
    }

    expect(setter).toBe('home-2');
    expect(runtime.match.ball.lastContact).toBe('SET');
  });

  it('completes SHIN RECEIVE -> YU SET -> GOU SPIKE with no user input', () => {
    let runtime = rally(createReworkRuntime(81, 'MASTER'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        players: runtime.match.players.map((player) =>
          player.id === 'away-0'
            ? { ...player, position: { x: -2.6, y: 0, z: 5.2 } }
            : player,
        ),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-0',
          lastContact: 'SPIKE',
          position: { x: -2.6, y: 2.2, z: 4.0 },
          velocity: { x: 0, y: -0.8, z: 3.2 },
        },
      },
    };

    const events: string[] = [];
    let spikeActor: string | null = null;
    for (let frame = 0; frame < 360 && spikeActor === null; frame += 1) {
      runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
      if (runtime.lastEvent?.actorId?.startsWith('away-')) {
        events.push(runtime.lastEvent.type);
        if (runtime.lastEvent.type === 'SPIKE') {
          spikeActor = runtime.lastEvent.actorId;
        }
      }
    }

    expect(events).toContain('RECEIVE');
    expect(events).toContain('SET');
    expect(events).toContain('SPIKE');
    expect(spikeActor).toBe('away-1');
  });
});
