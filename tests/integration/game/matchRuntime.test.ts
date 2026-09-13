import { describe, expect, it } from 'vitest';
import {
  createMatchRuntime,
  getCurrentAction,
  stepMatchRuntime,
  type RuntimeInput,
} from '../../../src/game/runtime/matchRuntime';

function input(overrides: Partial<RuntimeInput> = {}): RuntimeInput {
  return {
    move: { x: 0, z: 0 },
    aim: { x: 0, z: 6.2 },
    swipe: null,
    actionPressed: false,
    actionReleased: false,
    requestedPlayerId: null,
    ...overrides,
  };
}

describe('match runtime', () => {
  it('connects the home contextual serve action to the rally state', () => {
    const runtime = createMatchRuntime(101, 'NORMAL', 'STANDARD');
    expect(getCurrentAction(runtime)).toBe('SERVE');

    const next = stepMatchRuntime(
      runtime,
      input({ actionPressed: true, aim: { x: 1.2, z: 6.4 } }),
      1 / 60,
    );

    expect(next.match.rally.phase).toBe('RALLY');
    expect(next.match.ball.inPlay).toBe(true);
    expect(next.match.ball.lastTouchedBy).toBe('home-0');
  });

  it('uses an upward committed serve swipe as a jump serve', () => {
    const runtime = createMatchRuntime(105, 'NORMAL', 'MANUAL');
    const next = stepMatchRuntime(
      runtime,
      input({
        actionPressed: true,
        aim: { x: 0.6, z: 6.8 },
        swipe: { x: 24, y: -150, durationMs: 520 },
      }),
      1 / 60,
    );

    expect(next.match.ball.lastTouchedBy).toBe('home-0');
    expect(next.match.ball.position.y).toBeGreaterThan(2.4);
  });

  it('moves the controlled player from stick input while keeping them on their court side', () => {
    const runtime = createMatchRuntime(102, 'NORMAL', 'MANUAL');
    let next = runtime;
    for (let frame = 0; frame < 30; frame += 1) {
      next = stepMatchRuntime(next, input({ move: { x: 1, z: 1 } }), 1 / 60);
    }

    const player = next.match.players.find((candidate) => candidate.id === 'home-0')!;
    expect(player.position.x).toBeGreaterThan(-2.6);
    expect(player.position.z).toBeLessThan(0);
  });

  it('switches from a receiver to the setter when a home pass is rising', () => {
    const runtime = createMatchRuntime(103, 'NORMAL', 'STANDARD');
    const prepared = {
      ...runtime,
      controlledPlayerId: 'home-2',
      match: {
        ...runtime.match,
        rally: { ...runtime.match.rally, phase: 'RALLY' as const },
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-2',
          position: { x: 1, y: 1.4, z: -3.4 },
          velocity: { x: -0.4, y: 4.2, z: 2.3 },
        },
      },
    };

    const next = stepMatchRuntime(prepared, input(), 1 / 60);
    expect(next.controlledPlayerId).toBe('home-1');
  });

  it('routes a right-side set gesture toward the right-side teammate', () => {
    const runtime = createMatchRuntime(107, 'NORMAL', 'MANUAL');
    const prepared = {
      ...runtime,
      controlledPlayerId: 'home-1',
      match: {
        ...runtime.match,
        rally: { ...runtime.match.rally, phase: 'RALLY' as const },
        players: runtime.match.players.map((player) =>
          player.id === 'home-1'
            ? { ...player, position: { x: 0, y: 0, z: -1.2 } }
            : player,
        ),
        ball: {
          ...runtime.match.ball,
          inPlay: true,
          lastTouchedBy: 'home-2',
          position: { x: 0, y: 2.05, z: -1.2 },
          velocity: { x: 0, y: 0.2, z: 0 },
        },
      },
    };

    const next = stepMatchRuntime(
      prepared,
      input({
        actionPressed: true,
        aim: { x: 4, z: -0.8 },
        selectedSetTempo: 'NORMAL',
      }),
      1 / 60,
    );

    expect(next.match.ball.lastTouchedBy).toBe('home-1');
    expect(next.match.ball.velocity.x).toBeGreaterThan(0);
  });

  it('lets an away CPU server start the rally without reading player input', () => {
    const runtime = createMatchRuntime(104, 'HARD', 'MANUAL');
    const awayServe = {
      ...runtime,
      match: {
        ...runtime.match,
        rally: {
          ...runtime.match.rally,
          servingSide: 'away' as const,
          serverIndex: { home: 0, away: 0 },
        },
      },
    };

    const next = stepMatchRuntime(awayServe, input({ move: { x: -1, z: -1 } }), 1 / 60);
    expect(next.match.rally.phase).toBe('RALLY');
    expect(next.match.ball.lastTouchedBy).toBe('away-0');
  });

  it('updates beginner cpu decisions less frequently than master', () => {
    const beginner = stepMatchRuntime(
      createMatchRuntime(106, 'BEGINNER', 'MANUAL'),
      input(),
      1 / 60,
    );
    const master = stepMatchRuntime(
      createMatchRuntime(106, 'MASTER', 'MANUAL'),
      input(),
      1 / 60,
    );

    expect(beginner.cpuDecisions['away-0']?.nextDecisionAt).toBeGreaterThan(
      master.cpuDecisions['away-0']?.nextDecisionAt ?? Number.POSITIVE_INFINITY,
    );
  });
});
