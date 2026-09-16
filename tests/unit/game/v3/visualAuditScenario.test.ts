import { describe, expect, it } from 'vitest';
import {
  createV3VisualAuditState,
  parseV3VisualAuditScenario,
} from '../../../../src/game/v3/presentation/visualAuditScenario';

describe('createV3VisualAuditState', () => {
  it('keeps the initial read deterministic', () => {
    const state = createV3VisualAuditState('initial', 73);

    expect(state.phase).toBe('DEFENSE_READ');
    expect(state.controlledPlayerId).toBe('home-2');
    expect(state.forecast).not.toBeNull();
  });

  it('freezes a successful HINA receive frame', () => {
    const state = createV3VisualAuditState('receive', 73);

    expect(state.phase).toBe('SET_BUILDUP');
    expect(state.lastEvent).toMatchObject({ type: 'RECEIVE', actorId: 'home-2' });
    expect(state.score).toEqual({ home: 0, away: 0 });
  });

  it('freezes REN at set contact with KAI taking control', () => {
    const state = createV3VisualAuditState('set', 73);

    expect(state.phase).toBe('ATTACK_APPROACH');
    expect(state.lastEvent).toEqual({ type: 'SET', actorId: 'home-1' });
    expect(state.controlledPlayerId).toBe('home-0');
  });

  it('freezes KAI airborne inside the visible spike windup window', () => {
    const state = createV3VisualAuditState('spike', 73);

    expect(state.phase).toBe('ATTACK_AIRBORNE');
    expect(state.controlledPlayerId).toBe('home-0');
    expect(state.rally.attackContactAt).not.toBeNull();
    expect((state.rally.attackContactAt ?? state.time) - state.time).toBeGreaterThan(0);
    expect((state.rally.attackContactAt ?? state.time) - state.time).toBeLessThanOrEqual(0.22);
    expect(state.rallyIndex).toBe(0);
  });
});

describe('parseV3VisualAuditScenario', () => {
  it('accepts named scenarios only on local hosts', () => {
    expect(parseV3VisualAuditScenario('localhost', '?v3audit=receive')).toBe('receive');
    expect(parseV3VisualAuditScenario('127.0.0.1', '?v3audit=set')).toBe('set');
    expect(parseV3VisualAuditScenario('localhost', '?v3audit=spike')).toBe('spike');
  });

  it('keeps the legacy v3audit=1 alias as the initial frame', () => {
    expect(parseV3VisualAuditScenario('localhost', '?v3audit=1')).toBe('initial');
  });

  it('rejects audits on non-local hosts and unknown scenario names', () => {
    expect(parseV3VisualAuditScenario('example.com', '?v3audit=spike')).toBeNull();
    expect(parseV3VisualAuditScenario('localhost', '?v3audit=unknown')).toBeNull();
    expect(parseV3VisualAuditScenario('localhost', '')).toBeNull();
  });
});
