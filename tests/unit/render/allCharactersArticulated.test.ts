import { describe, expect, it } from 'vitest';
import { STARTER_ROSTER, type CharacterId } from '../../../src/game/characters/roster';
import { CHARACTER_SKINS } from '../../../src/game/rework/render/character/characterSkin';
import { isArticulatedCharacter } from '../../../src/game/rework/render/character/ArticulatedPlayerView';

const CHARACTER_IDS = Object.keys(STARTER_ROSTER) as CharacterId[];

describe('all starter characters use the articulated renderer', () => {
  it('provides a distinct complete skin for every starter character', () => {
    expect(CHARACTER_IDS).toHaveLength(6);

    const atlasUrls = CHARACTER_IDS.map((id) => {
      const skin = CHARACTER_SKINS[id];
      expect(skin.id).toBe(id);
      expect(skin.atlasUrl).toContain(`/assets/characters/${id.toLowerCase()}/`);
      expect(Object.keys(skin.atlasRects).length).toBeGreaterThanOrEqual(17);
      return skin.atlasUrl;
    });

    expect(new Set(atlasUrls).size).toBe(6);
  });

  it('marks every starter character as articulated-capable', () => {
    for (const id of CHARACTER_IDS) {
      expect(isArticulatedCharacter(id)).toBe(true);
    }
  });
});
