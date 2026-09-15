import { describe, expect, it } from 'vitest';
import { selectSetPlan } from '../../../../src/game/v3/actions/set';

describe('V3 set selection', () => {
  it('maps stable directional intent to left, middle, and right lanes', () => {
    expect(selectSetPlan({ directionX: -0.8, holdSeconds: 0.3, receiveQuality: 'GOOD' })?.lane).toBe('LEFT');
    expect(selectSetPlan({ directionX: 0.1, holdSeconds: 0.3, receiveQuality: 'GOOD' })?.lane).toBe('MIDDLE');
    expect(selectSetPlan({ directionX: 0.7, holdSeconds: 0.3, receiveQuality: 'GOOD' })?.lane).toBe('RIGHT');
  });

  it('uses hold duration for trajectory while preventing quick sets after a bad pass', () => {
    expect(selectSetPlan({ directionX: 0, holdSeconds: 0.12, receiveQuality: 'PERFECT' })?.trajectory).toBe('LOW');
    expect(selectSetPlan({ directionX: 0, holdSeconds: 0.12, receiveQuality: 'BAD' })?.trajectory).toBe('NORMAL');
    expect(selectSetPlan({ directionX: 0, holdSeconds: 0.8, receiveQuality: 'GOOD' })?.trajectory).toBe('HIGH');
  });

  it('does not fabricate an attack plan after a missed receive', () => {
    expect(selectSetPlan({ directionX: 0, holdSeconds: 0.3, receiveQuality: 'MISS' })).toBeNull();
  });
});
