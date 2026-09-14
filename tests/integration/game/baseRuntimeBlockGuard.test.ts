import { describe, expect, it } from 'vitest';
import {
  createMatchRuntime,
  stepMatchRuntime,
  type MatchRuntimeState,
  type RuntimeInput,
} from '../../../src/game/runtime/matchRuntime';

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

function homeSetWithStaleCpuBlock(): MatchRuntimeState {
  const runtime = createMatchRuntime(220, 'HARD', 'MANUAL');
  return {
    ...runtime,
    match: {
      ...runtime.match,
      time: 1,
      rally: { ...runtime.match.rally, phase: 'RALLY' },
      players: runtime.match.players.map((player) =>
        player.id === 'away-1'
          ? {
              ...player,
              isAirborne: true,
              position: { x: 0, y: 0.75, z: 1 },
            }
          : player,
      ),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET',
        position: { x: 0, y: 2.8, z: -0.5 },
        velocity: { x: 0, y: 1.7, z: 1.2 },
      },
    },
    cpuDecisions: {
      'away-1': {
        intent: {
          state: 'BLOCK',
          target: { x: 0, y: 0, z: 1 },
          attackIntent: null,
          reactionDelay: 0.22,
        },
        nextDecisionAt: 99,
        actionReadyAt: 0,
      },
    },
  };
}

describe('base runtime block legality', () => {
  it('does not contact a home SET as a cpu BLOCK even with stale block memory', () => {
    const prepared = homeSetWithStaleCpuBlock();
    const next = stepMatchRuntime(prepared, idleInput(), 1 / 60);

    expect(next.match.ball.lastTouchedBy).toBe('home-1');
    expect(next.match.ball.lastContact).toBe('SET');
    expect(next.lastEvent?.type).not.toBe('BLOCK');
  });
});
