import { describe, expect, it } from 'vitest';
import {
  SERVE_FOLLOW_THROUGH_MS,
  interpolateServeReturnZ,
} from '../../../src/game/render/servePresentation';

describe('serve presentation', () => {
  it('starts at the visual service position and ends at the gameplay position', () => {
    expect(interpolateServeReturnZ(-9.35, -5.5, 0)).toBeCloseTo(-9.35);
    expect(interpolateServeReturnZ(-9.35, -5.5, SERVE_FOLLOW_THROUGH_MS)).toBeCloseTo(-5.5);
  });

  it('moves smoothly toward the gameplay position during follow-through', () => {
    const halfway = interpolateServeReturnZ(
      9.35,
      5.5,
      SERVE_FOLLOW_THROUGH_MS / 2,
    );
    expect(halfway).toBeLessThan(9.35);
    expect(halfway).toBeGreaterThan(5.5);
  });
});
