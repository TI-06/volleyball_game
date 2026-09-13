import { describe, expect, it } from 'vitest';
import { interpretActionGesture } from '../../../src/game/input/gesture';

describe('action gestures', () => {
  it('uses a short tap-like spike gesture as a tip', () => {
    expect(
      interpretActionGesture('SPIKE', { x: 8, y: 5, durationMs: 120 }).attackIntent,
    ).toBe('TIP');
  });

  it('maps opposite horizontal spike swipes to line and cross attacks', () => {
    expect(
      interpretActionGesture('SPIKE', { x: 70, y: -30, durationMs: 210 }).attackIntent,
    ).toBe('LINE');
    expect(
      interpretActionGesture('SPIKE', { x: -70, y: -30, durationMs: 210 }).attackIntent,
    ).toBe('CROSS');
  });

  it('uses gesture duration and distance to select set tempo', () => {
    expect(
      interpretActionGesture('SET', { x: 20, y: -40, durationMs: 140 }).setTempo,
    ).toBe('QUICK');
    expect(
      interpretActionGesture('SET', { x: 10, y: -25, durationMs: 520 }).setTempo,
    ).toBe('HIGH');
  });

  it('turns serve horizontal swipe into a bounded court target', () => {
    const intent = interpretActionGesture('SERVE', { x: 500, y: 0, durationMs: 300 });
    expect(intent.aimX).toBeLessThanOrEqual(4.05);
    expect(intent.aimZ).toBeGreaterThan(4);
  });
});
