import { describe, expect, it } from 'vitest';
import { selectionRingLocalY } from '../../../src/game/render/playerPresentation';

describe('player presentation helpers', () => {
  it('keeps the selection ring anchored to the floor while the player jumps', () => {
    expect(selectionRingLocalY(0)).toBeCloseTo(0.025);
    expect(selectionRingLocalY(0.8)).toBeCloseTo(-0.775);
    expect(selectionRingLocalY(1.4)).toBeCloseTo(-1.375);
  });
});
