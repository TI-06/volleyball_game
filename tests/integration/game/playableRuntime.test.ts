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

function withRally(runtime: MatchRuntimeState): MatchRuntimeState {
  return {
    ...runtime,
    match: {
      ...runtime.match,
      rally: { ...runtime.match.rally, phase: 'RALLY' },
    },
  };
}

describe('playable cpu runtime', () => {
  it('makes the cpu attacker jump before making set contact into a spike', () => {
    let runtime = withRally(createMatchRuntime(180, 'MASTER', 'MANUAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        players: runtime.match.players.map((player) => {
          if (player.id === 'away-0') {
            return { ...player, position: { x: 0, y: 0, z: 0.9 } };
          }
          if (player.id === 'away-1') {
            return { ...player, position: { x: 3.2, y: 0, z: 1.1 } };
          }
          return player;
        }),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-2',
          lastContact: 'SET',
          position: { x: 0, y: 3.35, z: 0.9 },
          velocity: { x: 0, y: 1.1, z: 0 },
        },
      },
    };

    let sawJump = false;
    let sawSpike = false;
    for (let frame = 0; frame < 45 && !sawSpike; frame += 1) {
      runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
      const attacker = runtime.match.players.find((player) => player.id === 'away-0')!;
      if (attacker.isAirborne && runtime.match.ball.lastContact === 'SET') {
        sawJump = true;
      }
      if (runtime.lastEvent?.type === 'SPIKE' && runtime.lastEvent.actorId === 'away-0') {
        sawSpike = true;
        expect(attacker.isAirborne).toBe(true);
        expect(runtime.match.ball.lastContact).toBe('SPIKE');
      }
    }

    expect(sawJump).toBe(true);
    expect(sawSpike).toBe(true);
  });

  it('makes a front cpu blocker leave the floor before attempting a spike block', () => {
    let runtime = withRally(createMatchRuntime(181, 'MASTER', 'MANUAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        players: runtime.match.players.map((player) =>
          player.id === 'away-1'
            ? { ...player, position: { x: 0, y: 0, z: 1.05 } }
            : player.id === 'away-0'
              ? { ...player, position: { x: 3.4, y: 0, z: 1.2 } }
              : player,
        ),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-0',
          lastContact: 'SPIKE',
          position: { x: 0, y: 3.4, z: -0.85 },
          velocity: { x: 0, y: 0.2, z: 2.1 },
        },
      },
    };

    let jumped = false;
    for (let frame = 0; frame < 30 && !jumped; frame += 1) {
      runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
      const blocker = runtime.match.players.find((player) => player.id === 'away-1')!;
      jumped = blocker.isAirborne;
    }

    expect(jumped).toBe(true);
    expect(runtime.match.ball.lastContact).toBe('SPIKE');
  });

  it('does not turn a serve into a cpu block jump', () => {
    let runtime = withRally(createMatchRuntime(182, 'MASTER', 'MANUAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        players: runtime.match.players.map((player) =>
          player.id === 'away-1'
            ? { ...player, position: { x: 0, y: 0, z: 1.05 } }
            : player,
        ),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-0',
          lastContact: 'SERVE',
          position: { x: 0, y: 3.2, z: -0.9 },
          velocity: { x: 0, y: 0, z: 2 },
        },
      },
    };

    let sawBlockJump = false;
    for (let frame = 0; frame < 18; frame += 1) {
      runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
      const blocker = runtime.match.players.find((player) => player.id === 'away-1')!;
      if (blocker.isAirborne || runtime.lastEvent?.type === 'BLOCK') {
        sawBlockJump = true;
      }
    }

    expect(sawBlockJump).toBe(false);
  });

  it('lets a ready cpu setter rescue a descending pass without an instant follow-up spike', () => {
    let runtime = withRally(createMatchRuntime(183, 'NORMAL', 'MANUAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        time: 1,
        players: runtime.match.players.map((player) => {
          if (player.id === 'away-2') {
            return { ...player, position: { x: 0, y: 0, z: 1.15 } };
          }
          if (player.id === 'away-0') {
            return { ...player, position: { x: -1.8, y: 0, z: 0.9 } };
          }
          return player;
        }),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-0',
          lastContact: 'RECEIVE',
          position: { x: 0.15, y: 2.15, z: 1.2 },
          velocity: { x: 0, y: -0.7, z: 0.1 },
        },
      },
      cpuDecisions: {
        'away-2': {
          intent: {
            state: 'SET',
            target: { x: 0, y: 0, z: 1.05 },
            attackIntent: null,
            reactionDelay: 0.4,
          },
          nextDecisionAt: 10,
          actionReadyAt: 0.5,
        },
      } as unknown as MatchRuntimeState['cpuDecisions'],
    };

    const next = stepMatchRuntime(runtime, idleInput(), 1 / 60);

    expect(next.match.ball.lastTouchedBy).toBe('away-2');
    expect(next.match.ball.lastContact).toBe('SET');
    expect(next.lastEvent?.type).toBe('SET');
    expect(next.match.players.find((player) => player.id === 'away-0')?.isAirborne).toBe(false);
  });
});
