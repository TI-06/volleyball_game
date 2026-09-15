import { describe, expect, it } from 'vitest';
import { canStartDive, createDiveState } from '../../../../src/game/v3/actions/dive';

describe('V3 dive', () => {
  it('extends defensive reach in the chosen direction', () => {
    const dive = createDiveState({ x: 3, z: 4 }, 2);
    expect(dive.reachMeters).toBe(2.55);
    expect(dive.direction.x).toBeCloseTo(0.6);
    expect(dive.direction.z).toBeCloseTo(0.8);
    expect(dive.recoveryUntil).toBeCloseTo(2.85);
  });

  it('prevents immediate dive chaining during recovery', () => {
    const dive = createDiveState({ x: -1, z: 0 }, 4);
    expect(canStartDive(dive, 4.5)).toBe(false);
    expect(canStartDive(dive, 4.851)).toBe(true);
  });
});
