import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import {
  getReworkCameraFrame,
  REWORK_CAMERA_MODE,
} from '../../../../src/game/rework/render/ReworkCamera';
import {
  getToonProxyScale,
  REWORK_PLAYER_PRESENTATION,
} from '../../../../src/game/rework/render/ToonPlayerProxy';
import { STARTER_ROSTER } from '../../../../src/game/characters/roster';

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

  it('uses toon proxies instead of the old primitive humanoid presentation', () => {
    expect(REWORK_PLAYER_PRESENTATION).toBe('TOON_PROXY_2_5D');
  });

  it('keeps KAI and HINA visibly different in proxy scale', () => {
    const kai = getToonProxyScale(STARTER_ROSTER.kai);
    const hina = getToonProxyScale(STARTER_ROSTER.hina);
    expect(kai.height).toBeGreaterThan(hina.height);
    expect(kai.width).toBeGreaterThan(hina.width);
  });
});
