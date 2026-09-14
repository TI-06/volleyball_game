import { describe, expect, it } from 'vitest';
import { getReworkHapticPattern } from '../../../../src/game/rework/haptics';

describe('rework haptics', () => {
  it('uses stronger feedback for spike and block than routine receive', () => {
    const receive = getReworkHapticPattern({
      type: 'RECEIVE',
      actorId: 'home-0',
      quality: 'GOOD',
    });
    const spike = getReworkHapticPattern({
      type: 'SPIKE',
      actorId: 'home-0',
      quality: 'PERFECT',
      value: 118,
    });
    const block = getReworkHapticPattern({
      type: 'BLOCK',
      actorId: 'home-0',
      quality: 'GREAT',
    });

    expect(receive).toEqual([12]);
    expect((spike ?? []).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(12);
    expect((block ?? []).reduce((sum, value) => sum + value, 0)).toBeGreaterThan(12);
  });

  it('does not vibrate for movement or CPU contacts', () => {
    expect(getReworkHapticPattern({ type: 'JUMP', actorId: 'home-0' })).toBeNull();
    expect(getReworkHapticPattern({ type: 'SPIKE', actorId: 'away-0', quality: 'PERFECT' })).toBeNull();
  });

  it('gives a short success pulse when the player wins a point', () => {
    expect(getReworkHapticPattern({ type: 'POINT', value: 1 })).toEqual([16, 24, 28]);
    expect(getReworkHapticPattern({ type: 'POINT', value: -1 })).toBeNull();
  });
});
