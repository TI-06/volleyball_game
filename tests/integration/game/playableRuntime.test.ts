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

function homeSetBlockPrep(velocityY: number, y = 2.9): MatchRuntimeState {
  let runtime = withRally(createMatchRuntime(186, 'MASTER', 'MANUAL'));
  runtime = {
    ...runtime,
    match: {
      ...runtime.match,
      time: 1,
      players: runtime.match.players.map((player) => {
        if (player.id === 'away-1') {
          return { ...player, position: { x: 0, y: 0, z: 1.05 } };
        }
        if (player.id === 'away-0') {
          return { ...player, position: { x: 3.4, y: 0, z: 1.2 } };
        }
        return player;
      }),
      ball: {
        ...runtime.match.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        lastContact: 'SET',
        position: { x: 0, y, z: -0.7 },
        velocity: { x: 0, y: velocityY, z: 1.1 },
      },
    },
    cpuDecisions: {
      'away-1': {
        intent: {
          state: 'APPROACH',
          target: { x: 0, y: 0, z: 0.55 },
          attackIntent: null,
          reactionDelay: 0.1,
        },
        nextDecisionAt: 10,
        actionReadyAt: 0.5,
      },
    } as unknown as MatchRuntimeState['cpuDecisions'],
  };
  return runtime;
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

  it('does not pre-jump a cpu blocker immediately after a high-rising opponent set', () => {
    const runtime = homeSetBlockPrep(5.2, 2.2);
    const next = stepMatchRuntime(runtime, idleInput(), 1 / 60);
    const blocker = next.match.players.find((player) => player.id === 'away-1')!;

    expect(blocker.isAirborne).toBe(false);
    expect(next.match.ball.lastContact).toBe('SET');
  });

  it('pre-jumps a ready cpu blocker near the opponent set apex without touching it', () => {
    let runtime = homeSetBlockPrep(1.6);

    runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
    const blocker = runtime.match.players.find((player) => player.id === 'away-1')!;

    expect(blocker.isAirborne).toBe(true);
    expect(runtime.match.ball.lastTouchedBy).toBe('home-1');
    expect(runtime.match.ball.lastContact).toBe('SET');
    expect(runtime.lastEvent).toMatchObject({ type: 'JUMP', actorId: 'away-1' });
  });

  it('lets an already-airborne cpu blocker contact the following opponent spike once', () => {
    let runtime = withRally(createMatchRuntime(187, 'MASTER', 'MANUAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        time: 1,
        players: runtime.match.players.map((player) => {
          if (player.id === 'away-1') {
            return {
              ...player,
              isAirborne: true,
              position: { x: 0, y: 0.72, z: 1.05 },
              velocity: { ...player.velocity, y: 4.2 },
            };
          }
          if (player.id === 'away-0') {
            return { ...player, position: { x: 3.4, y: 0, z: 1.2 } };
          }
          return player;
        }),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-0',
          lastContact: 'SPIKE',
          position: { x: 0.05, y: 2.85, z: -0.35 },
          velocity: { x: 0, y: -4, z: 26 },
        },
      },
      cpuDecisions: {
        'away-1': {
          intent: {
            state: 'APPROACH',
            target: { x: 0, y: 0, z: 0.55 },
            attackIntent: null,
            reactionDelay: 0.1,
          },
          nextDecisionAt: 10,
          actionReadyAt: 0.9,
        },
      } as unknown as MatchRuntimeState['cpuDecisions'],
    };

    runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);

    expect(runtime.match.ball.lastTouchedBy).toBe('away-1');
    expect(runtime.match.ball.lastContact).toBe('BLOCK');
    expect(runtime.lastEvent).toMatchObject({ type: 'BLOCK', actorId: 'away-1' });

    const actionReadyAt = runtime.cpuDecisions['away-1']?.actionReadyAt ?? 0;
    const next = stepMatchRuntime(runtime, idleInput(), 1 / 60);
    expect(next.cpuDecisions['away-1']?.actionReadyAt ?? 0).toBeGreaterThanOrEqual(actionReadyAt);
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

  it('completes RECEIVE -> emergency SHIN SET -> GOU SPIKE when YU took first touch', () => {
    let runtime = withRally(createMatchRuntime(184, 'NORMAL', 'MANUAL'));
    runtime = {
      ...runtime,
      match: {
        ...runtime.match,
        time: 1,
        players: runtime.match.players.map((player) => {
          if (player.id === 'away-0') {
            return { ...player, position: { x: 0.1, y: 0, z: 1.1 } };
          }
          if (player.id === 'away-1') {
            return { ...player, position: { x: 2.1, y: 0, z: 0.9 } };
          }
          return player;
        }),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'away-2',
          lastContact: 'RECEIVE',
          position: { x: 0.15, y: 2.2, z: 1.15 },
          velocity: { x: 0, y: 0.8, z: 0.1 },
        },
      },
      cpuDecisions: {
        'away-0': {
          intent: {
            state: 'SET',
            target: { x: 0, y: 0, z: 1.05 },
            attackIntent: null,
            reactionDelay: 0.42,
          },
          nextDecisionAt: 10,
          actionReadyAt: 0.5,
        },
      } as unknown as MatchRuntimeState['cpuDecisions'],
    };

    runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
    expect(runtime.match.ball.lastTouchedBy).toBe('away-0');
    expect(runtime.match.ball.lastContact).toBe('SET');
    expect(runtime.lastEvent?.type).toBe('SET');

    let sawGouJump = false;
    let sawGouSpike = false;
    for (let frame = 0; frame < 75 && !sawGouSpike; frame += 1) {
      runtime = stepMatchRuntime(runtime, idleInput(), 1 / 60);
      const gou = runtime.match.players.find((player) => player.id === 'away-1')!;
      if (gou.isAirborne && runtime.match.ball.lastContact === 'SET') {
        sawGouJump = true;
      }
      if (runtime.lastEvent?.type === 'SPIKE' && runtime.lastEvent.actorId === 'away-1') {
        sawGouSpike = true;
        expect(runtime.match.ball.lastContact).toBe('SPIKE');
      }
    }

    expect(sawGouJump).toBe(true);
    expect(sawGouSpike).toBe(true);
  });
});
