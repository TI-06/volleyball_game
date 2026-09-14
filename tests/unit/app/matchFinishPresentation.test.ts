import { describe, expect, it } from 'vitest';
import { getMatchFinishFramePlan } from '../../../src/app/matchFinishPresentation';

describe('match finish presentation', () => {
  it('starts the result timer once but keeps rendering after the winner is decided', () => {
    expect(getMatchFinishFramePlan(true, false)).toEqual({
      startResultTimer: true,
      keepRendering: true,
    });
    expect(getMatchFinishFramePlan(true, true)).toEqual({
      startResultTimer: false,
      keepRendering: true,
    });
  });

  it('does not start a result timer before match over', () => {
    expect(getMatchFinishFramePlan(false, false)).toEqual({
      startResultTimer: false,
      keepRendering: true,
    });
  });
});
