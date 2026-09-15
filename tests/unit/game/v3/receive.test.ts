import { describe, expect, it } from 'vitest';
import { resolveReceiveQuality } from '../../../../src/game/v3/actions/receive';

describe('V3 receive quality', () => {
  it('rewards prepared positioning with forgiving mobile timing', () => {
    expect(resolveReceiveQuality({ timingOffsetSeconds: 0.08, distanceMeters: 0.35, movementSpeedMetersPerSecond: 0.4 })).toBe('PERFECT');
    expect(resolveReceiveQuality({ timingOffsetSeconds: 0.2, distanceMeters: 0.85, movementSpeedMetersPerSecond: 1.2 })).toBe('GOOD');
    expect(resolveReceiveQuality({ timingOffsetSeconds: 0.34, distanceMeters: 1.4, movementSpeedMetersPerSecond: 1.8 })).toBe('BAD');
  });

  it('misses only after the useful timing or reach window is exceeded', () => {
    expect(resolveReceiveQuality({ timingOffsetSeconds: 0.41, distanceMeters: 0.8, movementSpeedMetersPerSecond: 0 })).toBe('MISS');
    expect(resolveReceiveQuality({ timingOffsetSeconds: 0.1, distanceMeters: 1.7, movementSpeedMetersPerSecond: 0 })).toBe('MISS');
  });

  it('degrades one grade when the player is still sprinting through contact', () => {
    expect(resolveReceiveQuality({ timingOffsetSeconds: 0.08, distanceMeters: 0.35, movementSpeedMetersPerSecond: 4.1 })).toBe('GOOD');
  });
});
