import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import {
  getReworkCameraFrame,
  REWORK_CAMERA_MODE,
} from '../../../../src/game/rework/render/ReworkCamera';
import {
  isArticulatedCharacter,
} from '../../../../src/game/rework/render/character/ArticulatedPlayerView';
import {
  CHARACTER_SKINS,
} from '../../../../src/game/rework/render/character/characterSkin';

describe('2.5d presentation contract', () => {
  it('keeps one fixed camera mode during normal rally and spike states', () => {
    const base = createMatch(101);
    const rally = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
    };
    const spike = {
      ...rally,
      ball: {
        ...rally.ball,
        inPlay: true,
        lastTouchedBy: 'home-0',
        lastContact: 'SPIKE' as const,
        position: { x: 0, y: 3, z: -0.4 },
        velocity: { x: 0, y: -2, z: 20 },
      },
    };

    expect(REWORK_CAMERA_MODE).toBe('FIXED_2_5D');
    expect(getReworkCameraFrame(rally).mode).toBe('FIXED_2_5D');
    expect(getReworkCameraFrame(spike).mode).toBe('FIXED_2_5D');
  });

  it('uses articulated character presentation for the full starter roster', () => {
    for (const id of ['kai', 'ren', 'hina', 'shin', 'gou', 'yu'] as const) {
      expect(isArticulatedCharacter(id)).toBe(true);
    }
  });

  it('keeps KAI and HINA visibly different through visual profiles', () => {
    const kai = CHARACTER_SKINS.kai.visual;
    const hina = CHARACTER_SKINS.hina.visual;
    expect(kai.heightScale).toBeGreaterThan(hina.heightScale);
    expect(kai.shoulderScale).toBeGreaterThan(hina.shoulderScale);
  });

  it('uses reusable per-character SVG atlases instead of generated pose textures', () => {
    for (const id of ['kai', 'ren', 'hina', 'shin', 'gou', 'yu'] as const) {
      const skin = CHARACTER_SKINS[id];
      expect(skin.atlasUrl).toMatch(
        /^\/assets\/characters\/[a-z]+\/parts\.svg(?:\?.+)?$/,
      );
      expect(Object.keys(skin.atlasRects)).toHaveLength(17);
    }
  });
});
