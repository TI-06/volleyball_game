import { describe, expect, it } from 'vitest';
import { attackIntentFromGesture, resolveJumpTiming } from '../../../../src/game/v3/actions/attack';

describe('V3 attack preparation', () => {
  it('gives mobile-friendly jump timing grades', () => {
    expect(resolveJumpTiming(0.07)).toBe('PERFECT');
    expect(resolveJumpTiming(-0.16)).toBe('GOOD');
    expect(resolveJumpTiming(0.27)).toBe('BAD');
    expect(resolveJumpTiming(0.34)).toBe('MISS');
  });

  it('turns simple gestures into intentional attacks', () => {
    expect(attackIntentFromGesture({ x: 8, y: 7 })).toBe('TIP');
    expect(attackIntentFromGesture({ x: 78, y: 42 })).toBe('LINE');
    expect(attackIntentFromGesture({ x: -82, y: 36 })).toBe('CROSS');
    expect(attackIntentFromGesture({ x: 12, y: 84 })).toBe('POWER');
  });
});
