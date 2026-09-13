import { describe, expect, it } from 'vitest';
import {
  getBlockReach,
  getMovementProfile,
  getReceiveAssist,
  getSetAssist,
  getSpikeTimingWindow,
} from '../../../src/game/characters/abilities';
import { STARTER_ROSTER } from '../../../src/game/characters/roster';

describe('character ability helpers', () => {
  it('makes strong receivers easier to position and time without auto-succeeding', () => {
    const hina = getReceiveAssist(STARTER_ROSTER.hina);
    const gou = getReceiveAssist(STARTER_ROSTER.gou);

    expect(hina.predictionLead).toBeGreaterThan(gou.predictionLead);
    expect(hina.predictionError).toBeLessThan(gou.predictionError);
    expect(hina.perfectWindow).toBeGreaterThan(gou.perfectWindow);
  });

  it('gives higher spike skill a wider input timing window', () => {
    expect(getSpikeTimingWindow(STARTER_ROSTER.shin)).toBeGreaterThan(
      getSpikeTimingWindow(STARTER_ROSTER.hina),
    );
  });

  it('preserves clear role differences in movement and block reach', () => {
    expect(getMovementProfile(STARTER_ROSTER.hina).maxSpeed).toBeGreaterThan(
      getMovementProfile(STARTER_ROSTER.gou).maxSpeed,
    );
    expect(getBlockReach(STARTER_ROSTER.gou)).toBeGreaterThan(
      getBlockReach(STARTER_ROSTER.hina),
    );
  });

  it('makes elite setters provide more accurate and more forgiving sets', () => {
    const ren = getSetAssist(STARTER_ROSTER.ren);
    const gou = getSetAssist(STARTER_ROSTER.gou);

    expect(ren.targetError).toBeLessThan(gou.targetError);
    expect(ren.perfectWindowBonus).toBeGreaterThan(gou.perfectWindowBonus);
  });

  it('keeps every Phase 1 roster ability inside the approved range', () => {
    for (const character of Object.values(STARTER_ROSTER)) {
      for (const value of Object.values(character.abilities)) {
        expect(value).toBeGreaterThanOrEqual(35);
        expect(value).toBeLessThanOrEqual(97);
      }
    }
  });
});
