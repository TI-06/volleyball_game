import { describe, expect, it } from 'vitest';
import { isLandingInsideSide } from '../../../../src/game/rework/courtLanding';

describe('rework court landing bounds', () => {
  it('accepts legal home and away landings including boundary lines', () => {
    expect(isLandingInsideSide(4.5, -9, 'home')).toBe(true);
    expect(isLandingInsideSide(-4.5, 9, 'away')).toBe(true);
  });

  it('rejects width and end-line outs symmetrically', () => {
    expect(isLandingInsideSide(4.51, -5, 'home')).toBe(false);
    expect(isLandingInsideSide(-4.51, 5, 'away')).toBe(false);
    expect(isLandingInsideSide(0, -9.01, 'home')).toBe(false);
    expect(isLandingInsideSide(0, 9.01, 'away')).toBe(false);
  });

  it('does not classify the opposite half as inside', () => {
    expect(isLandingInsideSide(0, 0.1, 'home')).toBe(false);
    expect(isLandingInsideSide(0, -0.1, 'away')).toBe(false);
  });
});
