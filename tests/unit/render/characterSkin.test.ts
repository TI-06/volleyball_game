import { describe, expect, it } from 'vitest';
import type { CharacterId } from '../../../src/game/characters/roster';
import {
  CHARACTER_SKINS,
  REQUIRED_CHARACTER_PARTS,
} from '../../../src/game/rework/render/character/characterSkin';

const CHARACTER_IDS: readonly CharacterId[] = ['kai', 'ren', 'hina', 'shin', 'gou', 'yu'];

const PROFILE_FIELDS = [
  'heightScale',
  'shoulderScale',
  'legScale',
  'armScale',
  'headScale',
  'motionSpeed',
  'approachStride',
  'jumpVisualScale',
  'landingWeight',
] as const;

describe('CHARACTER_SKINS', () => {
  it('defines every starter and rival without falling back to another character', () => {
    for (const id of CHARACTER_IDS) {
      const skin = CHARACTER_SKINS[id];
      expect(skin.id).toBe(id);

      for (const part of REQUIRED_CHARACTER_PARTS) {
        expect(skin.parts[part]).toMatch(new RegExp(`/characters/${id}/`));
      }
    }
  });

  it('keeps all visual profile values finite, positive, and within safe presentation ranges', () => {
    for (const id of CHARACTER_IDS) {
      const visual = CHARACTER_SKINS[id].visual;
      for (const field of PROFILE_FIELDS) {
        expect(Number.isFinite(visual[field])).toBe(true);
        expect(visual[field]).toBeGreaterThan(0);
        expect(visual[field]).toBeGreaterThanOrEqual(0.85);
        expect(visual[field]).toBeLessThanOrEqual(1.15);
      }
      expect(visual.heightScale).toBeGreaterThanOrEqual(0.9);
      expect(visual.heightScale).toBeLessThanOrEqual(1.1);
    }
  });

  it('uses KAI as neutral baseline and preserves visible silhouette differences', () => {
    expect(CHARACTER_SKINS.kai.visual).toEqual({
      heightScale: 1,
      shoulderScale: 1,
      legScale: 1,
      armScale: 1,
      headScale: 1,
      motionSpeed: 1,
      approachStride: 1,
      jumpVisualScale: 1,
      landingWeight: 1,
    });

    expect(CHARACTER_SKINS.hina.visual.heightScale).toBeLessThan(1);
    expect(CHARACTER_SKINS.hina.visual.motionSpeed).toBeGreaterThan(1);
    expect(CHARACTER_SKINS.gou.visual.heightScale).toBeGreaterThan(1);
    expect(CHARACTER_SKINS.gou.visual.shoulderScale).toBeGreaterThan(1);
  });
});
