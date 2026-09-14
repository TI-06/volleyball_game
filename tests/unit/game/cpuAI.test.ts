import { describe, expect, it } from 'vitest';
import { decideCpuIntent } from '../../../src/game/ai/cpuAI';
import { DIFFICULTY_PROFILES } from '../../../src/game/ai/difficulty';
import { createTendencyHistory, recordDefense } from '../../../src/game/ai/tendencyTracker';
import { createMatch } from '../../../src/game/core/createMatch';

describe('CPU AI', () => {
  it('keeps the approved reaction-delay ranges for all five levels', () => {
    expect(DIFFICULTY_PROFILES.BEGINNER.reactionDelay).toEqual({ min: 0.5, max: 0.8 });
    expect(DIFFICULTY_PROFILES.NORMAL.reactionDelay).toEqual({ min: 0.35, max: 0.55 });
    expect(DIFFICULTY_PROFILES.HARD.reactionDelay).toEqual({ min: 0.22, max: 0.4 });
    expect(DIFFICULTY_PROFILES.EXPERT.reactionDelay).toEqual({ min: 0.12, max: 0.25 });
    expect(DIFFICULTY_PROFILES.MASTER.reactionDelay).toEqual({ min: 0.07, max: 0.16 });
  });

  it('is deterministic from visible match state and history only', () => {
    const base = createMatch(88);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET' as const,
        position: { x: 0, y: 2, z: 3 },
        velocity: { x: 0, y: 3, z: -0.2 },
      },
    };
    const history = createTendencyHistory();

    expect(
      decideCpuIntent(state, 'away-0', DIFFICULTY_PROFILES.HARD, history),
    ).toEqual(decideCpuIntent(state, 'away-0', DIFFICULTY_PROFILES.HARD, history));
  });

  it('lets MASTER punish repeated front-block defense with a tip read', () => {
    const base = createMatch(99);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      rngState: 1,
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET' as const,
        position: { x: -2, y: 2.5, z: 2.2 },
        velocity: { x: 0, y: 3, z: -0.1 },
      },
    };
    let history = createTendencyHistory();
    for (let index = 0; index < 8; index += 1) {
      history = recordDefense(history, 'BLOCK');
    }

    const intent = decideCpuIntent(state, 'away-0', DIFFICULTY_PROFILES.MASTER, history);
    expect(intent.state).toBe('APPROACH');
    expect(['TIP', 'CROSS', 'LINE']).toContain(intent.attackIntent);
  });

  it('approaches the net before a back-row blocker becomes block-ready', () => {
    const base = createMatch(120);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'away-1'
          ? { ...player, position: { x: 0, y: 0, z: 4.1 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 0.6, y: 2.8, z: -0.6 },
        velocity: { x: 0, y: 0.5, z: 4.5 },
      },
    };

    const intent = decideCpuIntent(
      state,
      'away-1',
      DIFFICULTY_PROFILES.HARD,
      createTendencyHistory(),
    );

    expect(intent.state).toBe('APPROACH');
    expect(intent.target.z).toBeCloseTo(0.55);
  });

  it('enters BLOCK only after the blocker reaches the front zone', () => {
    const base = createMatch(121);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'away-1'
          ? { ...player, position: { x: 0.4, y: 0, z: 1.2 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 0.7, y: 2.9, z: -0.5 },
        velocity: { x: 0, y: 0.3, z: 4.2 },
      },
    };

    const intent = decideCpuIntent(
      state,
      'away-1',
      DIFFICULTY_PROFILES.HARD,
      createTendencyHistory(),
    );

    expect(intent.state).toBe('BLOCK');
  });

  it('keeps a CPU attacker approaching when its own set is descending', () => {
    const base = createMatch(122);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'SET' as const,
        position: { x: -2, y: 2.9, z: 0.9 },
        velocity: { x: -1, y: -1.1, z: -0.2 },
      },
    };

    expect(
      decideCpuIntent(state, 'away-0', DIFFICULTY_PROFILES.HARD, createTendencyHistory()).state,
    ).toBe('APPROACH');
  });

  it('assigns SHIN as the emergency setter when YU took the first touch', () => {
    const base = createMatch(123);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'away-2',
        lastContact: 'RECEIVE' as const,
        position: { x: 0.2, y: 2, z: 2.1 },
        velocity: { x: 0.1, y: 2.1, z: -0.2 },
      },
    };

    expect(
      decideCpuIntent(state, 'away-0', DIFFICULTY_PROFILES.HARD, createTendencyHistory()).state,
    ).toBe('SET');
  });

  it('gives higher levels tighter receive prediction error than beginner', () => {
    expect(DIFFICULTY_PROFILES.MASTER.predictionError).toBeLessThan(
      DIFFICULTY_PROFILES.BEGINNER.predictionError,
    );
  });
});
