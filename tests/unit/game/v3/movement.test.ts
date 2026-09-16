import { describe, expect, it } from 'vitest';
import { moveControlledPlayer, normalizeMoveInput } from '../../../../src/game/v3/core/movement';

describe('V3 direct movement', () => {
  it('normalizes diagonal input without discarding either court axis', () => {
    const input = normalizeMoveInput({ x: 1, z: 1 });
    expect(Math.hypot(input.x, input.z)).toBeCloseTo(1);
    expect(input.x).toBeGreaterThan(0);
    expect(input.z).toBeGreaterThan(0);
  });

  it('moves directly from user input on both x and z', () => {
    const next = moveControlledPlayer({ x: 0, z: -5 }, { x: 0.6, z: 0.8 }, 5, 0.2);
    expect(next.x).toBeCloseTo(0.6);
    expect(next.z).toBeCloseTo(-4.2);
  });

  it('clamps movement to the playable home court without target seeking', () => {
    const next = moveControlledPlayer({ x: 4.2, z: -0.5 }, { x: 1, z: 1 }, 10, 1);
    expect(next.x).toBe(4.25);
    expect(next.z).toBe(-0.45);
  });
});
