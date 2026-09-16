import { describe, expect, it } from 'vitest';
import { resolveBlockResult } from '../../../../src/game/v3/actions/block';

describe('V3 block resolution', () => {
  it('rewards anticipation plus lateral alignment', () => {
    expect(resolveBlockResult({ timingOffsetSeconds: -0.08, lateralErrorMeters: 0.3 })).toBe('STUFF');
    expect(resolveBlockResult({ timingOffsetSeconds: -0.17, lateralErrorMeters: 0.7 })).toBe('TOUCH');
    expect(resolveBlockResult({ timingOffsetSeconds: -0.27, lateralErrorMeters: 1.05 })).toBe('DEFLECT');
  });

  it('rejects late reactions after the attack contact', () => {
    expect(resolveBlockResult({ timingOffsetSeconds: 0.04, lateralErrorMeters: 0.2 })).toBe('MISS');
  });
});
