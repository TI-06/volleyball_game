import { describe, expect, it } from 'vitest';
import { getReworkImpactStyle } from '../../../../src/game/rework/render/impactStyle';

describe('rework impact style', () => {
  it('makes spike and block contacts stronger than routine receives', () => {
    const spike = getReworkImpactStyle({ type: 'SPIKE', actorId: 'home-0', quality: 'PERFECT' });
    const block = getReworkImpactStyle({ type: 'BLOCK', actorId: 'home-0', quality: 'GREAT' });
    const receive = getReworkImpactStyle({ type: 'RECEIVE', actorId: 'home-0', quality: 'GOOD' });

    expect(spike?.maxScale ?? 0).toBeGreaterThan(receive?.maxScale ?? 0);
    expect(block?.durationMs ?? 0).toBeGreaterThanOrEqual(receive?.durationMs ?? 0);
  });

  it('does not create floor impact effects for non-contact events', () => {
    expect(getReworkImpactStyle({ type: 'JUMP', actorId: 'home-0' })).toBeNull();
    expect(getReworkImpactStyle({ type: 'SET', actorId: 'home-1', quality: 'GOOD' })).toBeNull();
  });
});
