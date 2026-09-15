import { describe, expect, it } from 'vitest';
import { CHARACTER_SKINS } from '../../../src/game/rework/render/character/characterSkin';
import { ARTICULATED_PART_LAYOUT } from '../../../src/game/rework/render/character/ArticulatedPlayerView';

describe('KAI presentation quality', () => {
  it('uses the v6 art revision and athletic limb proportions instead of the paper-doll silhouette', () => {
    expect(CHARACTER_SKINS.kai.atlasUrl).toContain('?rev=kai-v6');

    const armLength = ARTICULATED_PART_LAYOUT.upperArmL.width + ARTICULATED_PART_LAYOUT.foreArmL.width;
    expect(armLength).toBeGreaterThanOrEqual(0.98);
    expect(ARTICULATED_PART_LAYOUT.upperArmL.height).toBeGreaterThanOrEqual(0.34);
    expect(ARTICULATED_PART_LAYOUT.foreArmL.height).toBeGreaterThanOrEqual(0.3);
    expect(ARTICULATED_PART_LAYOUT.thighL.width).toBeGreaterThanOrEqual(0.34);
    expect(ARTICULATED_PART_LAYOUT.shinL.width).toBeGreaterThanOrEqual(0.3);
    expect(ARTICULATED_PART_LAYOUT.torso.height).toBeGreaterThanOrEqual(0.92);
  });

  it('uses shoulder-facing sleeve cells for both upper arms', () => {
    const { upperArmL, upperArmR } = CHARACTER_SKINS.kai.atlasRects;
    expect(upperArmL.y).toBe(upperArmR.y);
    expect(upperArmL.x).toBeGreaterThan(upperArmR.x);
  });
});
