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

function preparedSpike(difficulty: 'BEGINNER' | 'MASTER'): MatchRuntimeState {
  const runtime = createMatchRuntime(230, difficulty, 'MANUAL');
  return {
    ...runtime,
    match: {
      ...runtime.match,
      time: 1,
      rally: { ...runtime.match.rally, phase: 'RALLY' },
      players: runtime.match.players.map((player) => {
        if (player.id === 'away-0') {
          return {
            ...player,
            isAirborne: true,
            position: { x: 0, y: 0.72, z: 1.02 },
            velocity: { ...player.velocity, y: 4.1 },
          };
        }
        if (player.id === 'away-1') {
          return { ...player, position: { x: 3.6, y: 0, z: 1.1 } };
        }
        return player;
      }),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE',
        position: { x: 0.03, y: 2.82, z: -0.32 },
        velocity: { x: 0, y: -3.8, z: 25 },
      },
    },
    cpuDecisions: {
      'away-0': {
        intent: {
          state: 'APPROACH',
          target: { x: 0, y: 0, z: 0.55 },
          attackIntent: null,
          reactionDelay: difficulty === 'BEGINNER' ? 0.6 : 0.1,
        },
        nextDecisionAt: 10,
        actionReadyAt: 0,
      },
    } as unknown as MatchRuntimeState['cpuDecisions'],
  };
}

describe('prepared cpu block difficulty', () => {
  it('does not give BEGINNER the same perfect block timing as MASTER', () => {
    const beginner = stepMatchRuntime(preparedSpike('BEGINNER'), idleInput(), 1 / 60);
    const master = stepMatchRuntime(preparedSpike('MASTER'), idleInput(), 1 / 60);

    expect(beginner.lastEvent?.type).toBe('BLOCK');
    expect(master.lastEvent?.type).toBe('BLOCK');
    expect(beginner.lastEvent?.quality).not.toBe('PERFECT');
    expect(master.lastEvent?.quality).toBe('PERFECT');
  });
});
