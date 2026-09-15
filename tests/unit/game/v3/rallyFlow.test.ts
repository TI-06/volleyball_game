import { describe, expect, it } from 'vitest';
import { advanceRallyPhase, type V3RallyPhase } from '../../../../src/game/v3/core/rallyFlow';

describe('V3 rally flow', () => {
  it('supports the first readable receive-to-attack sequence', () => {
    let phase: V3RallyPhase = 'DEFENSE_READ';
    phase = advanceRallyPhase(phase, 'PREPARE_RECEIVE');
    expect(phase).toBe('RECEIVE_PREP');
    phase = advanceRallyPhase(phase, 'RECEIVE_CONTACT');
    expect(phase).toBe('SET_BUILDUP');
    phase = advanceRallyPhase(phase, 'SET_CONTACT');
    expect(phase).toBe('ATTACK_APPROACH');
    phase = advanceRallyPhase(phase, 'JUMP');
    expect(phase).toBe('ATTACK_AIRBORNE');
    phase = advanceRallyPhase(phase, 'ATTACK_CONTACT');
    expect(phase).toBe('OPPONENT_DEFENSE');
  });

  it('ignores out-of-order events instead of inventing a prompt-driven transition', () => {
    expect(advanceRallyPhase('DEFENSE_READ', 'JUMP')).toBe('DEFENSE_READ');
    expect(advanceRallyPhase('SET_BUILDUP', 'ATTACK_CONTACT')).toBe('SET_BUILDUP');
  });
});
