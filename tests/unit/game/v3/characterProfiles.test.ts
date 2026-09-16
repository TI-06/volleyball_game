import { describe, expect, it } from 'vitest';
import { profileFor } from '../../../../src/game/v3/render/character/characterProfiles';

describe('v3 character profiles', () => {
  it('gives KAI REN and HINA distinct silhouettes and jerseys', () => {
    const kai = profileFor('kai');
    const ren = profileFor('ren');
    const hina = profileFor('hina');

    expect(kai.height).toBeGreaterThan(ren.height);
    expect(ren.height).toBeGreaterThan(hina.height);
    expect(kai.shoulderWidth).toBeGreaterThan(ren.shoulderWidth);
    expect(hina.readyCrouch).toBeGreaterThan(kai.readyCrouch);
    expect(new Set([kai.jersey, ren.jersey, hina.jersey])).toHaveLength(3);
  });

  it('keeps proportions in a stylized human range rather than block avatars', () => {
    for (const id of ['kai', 'ren', 'hina', 'shin', 'gou', 'yu']) {
      const profile = profileFor(id);
      expect(profile.height).toBeGreaterThanOrEqual(1.65);
      expect(profile.height).toBeLessThanOrEqual(1.95);
      expect(profile.headRadius).toBeGreaterThan(0.11);
      expect(profile.legLength).toBeGreaterThan(0.72);
      expect(profile.shoulderWidth).toBeGreaterThan(0.34);
    }
  });

  it('gives opponent players valid alternate profiles', () => {
    expect(profileFor('shin').jersey).not.toBe(profileFor('kai').jersey);
    expect(profileFor('gou')).not.toEqual(profileFor('yu'));
  });
});
