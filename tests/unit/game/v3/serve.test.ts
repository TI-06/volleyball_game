import { describe, expect, it } from 'vitest';
import {
  resolveServeQuality,
  serveTargetLaneFromInput,
  serveTargetXForLane,
} from '../../../../src/game/v3/actions/serve';

describe('V3 serve action', () => {
  it('uses forgiving timing bands without making very early input perfect', () => {
    expect(resolveServeQuality(0.06)).toBe('PERFECT');
    expect(resolveServeQuality(-0.18)).toBe('GOOD');
    expect(resolveServeQuality(0.31)).toBe('BAD');
    expect(resolveServeQuality(-0.46)).toBe('MISS');
  });

  it('maps horizontal stick intent to three stable serve lanes', () => {
    expect(serveTargetLaneFromInput(-0.8)).toBe('LEFT');
    expect(serveTargetLaneFromInput(0.1)).toBe('MIDDLE');
    expect(serveTargetLaneFromInput(0.9)).toBe('RIGHT');
    expect(serveTargetXForLane('LEFT')).toBeLessThan(-1.5);
    expect(serveTargetXForLane('MIDDLE')).toBe(0);
    expect(serveTargetXForLane('RIGHT')).toBeGreaterThan(1.5);
  });
});
