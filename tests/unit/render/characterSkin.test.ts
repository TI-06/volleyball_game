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

  it('uses an isolated KAI v5 quality revision without pretending the other five are finished', () => {
    expect(CHARACTER_SKINS.kai.atlasUrl).toContain('?rev=kai-v5');
    for (const id of CHARACTER_IDS.filter((candidate) => candidate !== 'kai')) {
      expect(CHARACTER_SKINS[id].atlasUrl).toContain('?rev=athletic-v2');
    }
  });

  it('keeps all visual profile values finite, positive, and within safe presentation ranges', () => {
    for (const id of CHARACTER_IDS) {
      const visual = CHARACTER_SKINS[id].visual;
      for (const field of PROFILE_FIELDS) {
        expect(Number.isFinite(visual[field])).toBe(true);
        expect(visual[field]).toBeGreaterThan(0);
        expect(visual[field]).toBeGreaterThanOrEqual(0.84);
        expect(visual[field]).toBeLessThanOrEqual(1.15);
      }
      expect(visual.heightScale).toBeGreaterThanOrEqual(0.95);
      expect(visual.heightScale).toBeLessThanOrEqual(1.15);
    }
  });

  it('uses athletic volleyball proportions while preserving visible silhouette differences', () => {
    for (const id of CHARACTER_IDS) {
      const visual = CHARACTER_SKINS[id].visual;
      expect(visual.headScale).toBeLessThan(1);
      expect(visual.legScale).toBeGreaterThan(1);
    }

    const kai = CHARACTER_SKINS.kai.visual;
    expect(kai.headScale).toBeLessThanOrEqual(0.84);
    expect(kai.armScale).toBeGreaterThanOrEqual(1.14);
    expect(kai.legScale).toBeGreaterThanOrEqual(1.14);

    expect(CHARACTER_SKINS.hina.visual.heightScale).toBeLessThan(CHARACTER_SKINS.kai.visual.heightScale);
    expect(CHARACTER_SKINS.hina.visual.motionSpeed).toBeGreaterThan(CHARACTER_SKINS.kai.visual.motionSpeed);
    expect(CHARACTER_SKINS.gou.visual.heightScale).toBeGreaterThan(CHARACTER_SKINS.kai.visual.heightScale);
    expect(CHARACTER_SKINS.gou.visual.shoulderScale).toBeGreaterThan(CHARACTER_SKINS.hina.visual.shoulderScale);
  });
});
