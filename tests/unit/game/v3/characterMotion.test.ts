import { describe, expect, it } from 'vitest';
import { deriveCharacterMotion } from '../../../../src/game/v3/presentation/characterMotion';

describe('deriveCharacterMotion', () => {
  it('uses ready and run poses from horizontal movement', () => {
    expect(
      deriveCharacterMotion({
        phase: 'DEFENSE_READ',
        speed: 0,
        lastEvent: null,
        bufferedActionKind: null,
        controlled: true,
      }),
    ).toBe('READY');

    expect(
      deriveCharacterMotion({
        phase: 'DEFENSE_READ',
        speed: 2.1,
        lastEvent: null,
        bufferedActionKind: null,
        controlled: true,
      }),
    ).toBe('RUN');
  });

  it('maps volleyball contacts to readable action poses', () => {
    expect(
      deriveCharacterMotion({
        phase: 'RECEIVE_PREP',
        speed: 0,
        lastEvent: { type: 'RECEIVE' },
        bufferedActionKind: null,
        controlled: true,
      }),
    ).toBe('RECEIVE');

    expect(
      deriveCharacterMotion({
        phase: 'SET_BUILDUP',
        speed: 0,
        lastEvent: { type: 'SET' },
        bufferedActionKind: null,
        controlled: false,
      }),
    ).toBe('SET');

    expect(
      deriveCharacterMotion({
        phase: 'ATTACK_AIRBORNE',
        speed: 0,
        lastEvent: { type: 'JUMP' },
        bufferedActionKind: null,
        controlled: true,
      }),
    ).toBe('JUMP');

    expect(
      deriveCharacterMotion({
        phase: 'ATTACK_AIRBORNE',
        speed: 0,
        lastEvent: { type: 'ATTACK' },
        bufferedActionKind: null,
        controlled: true,
      }),
    ).toBe('SPIKE');
  });

  it('gives an armed dive priority over ordinary defensive movement', () => {
    expect(
      deriveCharacterMotion({
        phase: 'RECEIVE_PREP',
        speed: 3,
        lastEvent: null,
        bufferedActionKind: 'DIVE',
        controlled: true,
      }),
    ).toBe('DIVE');
  });

  it('shows approach motion before the jump contact', () => {
    expect(
      deriveCharacterMotion({
        phase: 'ATTACK_APPROACH',
        speed: 0,
        lastEvent: null,
        bufferedActionKind: null,
        controlled: true,
      }),
    ).toBe('APPROACH');
  });
});
