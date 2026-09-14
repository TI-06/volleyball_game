import { describe, expect, it } from 'vitest';
import { assistFocusPosition, clampFocusAxis } from '../../../../src/game/rework/movement';

describe('rework one-axis movement', () => {
  it('clamps drag input to -1..1', () => {
    expect(clampFocusAxis(3)).toBe(1);
    expect(clampFocusAxis(-4)).toBe(-1);
    expect(clampFocusAxis(0.4)).toBeCloseTo(0.4);
  });

  it('keeps user depth input authoritative while softly assisting width', () => {
    const next = assistFocusPosition(
      { x: -3, z: -5 },
      { x: 2, z: -2 },
      0.75,
      1 / 60,
    );

    expect(next.z).toBeGreaterThan(-5);
    expect(next.x).toBeGreaterThan(-3);
    expect(next.x).toBeLessThan(2);
  });

  it('never lets width assistance teleport past the target lane', () => {
    const next = assistFocusPosition(
      { x: 1.95, z: -4 },
      { x: 2, z: -4 },
      0,
      1,
    );

    expect(next.x).toBe(2);
  });
});
