import { describe, expect, it } from 'vitest';
import { performBlock } from '../../../src/game/actions/block';
import { STARTER_ROSTER } from '../../../src/game/characters/roster';
import type { BallState } from '../../../src/game/core/types';

const incoming: BallState = {
  position: { x: 0, y: 2.65, z: 0.35 },
  velocity: { x: 0.4, y: -1.6, z: -13 },
  spin: { x: 4, y: 0, z: 0 },
  inPlay: true,
  lastTouchedBy: 'away-0',
};

describe('block rebound physics', () => {
  it('drives a PERFECT block downward for a shut-out feel', () => {
    const result = performBlock(incoming, STARTER_ROSTER.gou, 'home-0', 0, 0.1);

    expect(result.quality).toBe('PERFECT');
    expect(result.touched).toBe(true);
    expect(result.ball.velocity.y).toBeLessThan(0);
    expect(result.ball.velocity.z).toBeGreaterThan(0);
  });

  it('keeps a weaker touched block playable instead of always stuffing it', () => {
    const result = performBlock(incoming, STARTER_ROSTER.gou, 'home-0', 0.36, 0.1);

    expect(result.touched).toBe(true);
    expect(['GOOD', 'BAD']).toContain(result.quality);
    expect(result.ball.velocity.y).toBeGreaterThan(0);
  });
});
