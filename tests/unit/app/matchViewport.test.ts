import { describe, expect, it } from 'vitest';
import { shouldPauseMatchForViewport } from '../../../src/app/matchViewport';

describe('match viewport pause', () => {
  it('pauses gameplay while the device is portrait', () => {
    expect(shouldPauseMatchForViewport(390, 844)).toBe(true);
  });

  it('keeps gameplay active in landscape and square transition frames', () => {
    expect(shouldPauseMatchForViewport(844, 390)).toBe(false);
    expect(shouldPauseMatchForViewport(430, 430)).toBe(false);
  });
});
