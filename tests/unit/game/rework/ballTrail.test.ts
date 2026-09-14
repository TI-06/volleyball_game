import { describe, expect, it } from 'vitest';
import { getReworkBallTrailStrength } from '../../../../src/game/rework/render/ballTrailStyle';

describe('rework ball trail', () => {
  it('stays hidden on slow setup balls', () => {
    expect(getReworkBallTrailStrength({ x: 1, y: 2, z: 5 })).toBe(0);
  });

  it('appears on fast serves and spikes and caps its strength', () => {
    const fast = getReworkBallTrailStrength({ x: 0, y: -2, z: 18 });
    const extreme = getReworkBallTrailStrength({ x: 0, y: -4, z: 40 });
    expect(fast).toBeGreaterThan(0);
    expect(extreme).toBeLessThanOrEqual(1);
    expect(extreme).toBeGreaterThanOrEqual(fast);
  });
});
