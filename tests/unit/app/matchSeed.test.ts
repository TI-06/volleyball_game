import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_MATCH_SEED,
  createSessionSeed,
  nextMatchSeed,
} from '../../../src/app/matchSeed';

describe('match seed', () => {
  it('keeps the tutorial on a fixed reproducible seed', () => {
    expect(TUTORIAL_MATCH_SEED).toBe(1);
  });

  it('creates a non-tutorial session seed from the current time', () => {
    expect(createSessionSeed(1)).not.toBe(TUTORIAL_MATCH_SEED);
    expect(createSessionSeed(0)).toBeGreaterThan(1);
    expect(createSessionSeed(1_726_273_600_000)).toBeGreaterThan(1);
  });

  it('advances every normal rematch to a different non-tutorial seed', () => {
    const first = createSessionSeed(1_726_273_600_000);
    const second = nextMatchSeed(first);
    const third = nextMatchSeed(second);

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expect(second).not.toBe(TUTORIAL_MATCH_SEED);
    expect(third).not.toBe(TUTORIAL_MATCH_SEED);
  });
});
