import { describe, expect, it } from 'vitest';
import { getReadableBallScale } from '../../../../src/game/v3/render/ballReadability';

describe('V3 ball readability', () => {
  it('grows only the rendered ball when projected radius would be too small', () => {
    expect(getReadableBallScale(3.5)).toBeCloseTo(2);
    expect(getReadableBallScale(7)).toBe(1);
    expect(getReadableBallScale(14)).toBe(1);
  });

  it('bounds the presentation scale for zero or invalid projections', () => {
    expect(getReadableBallScale(0)).toBe(2.4);
    expect(getReadableBallScale(Number.NaN)).toBe(2.4);
  });
});
