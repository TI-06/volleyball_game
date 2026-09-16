import { describe, expect, it } from 'vitest';
import { getV3PlayerFacingRotation } from '../../../../src/game/v3/render/character/characterFacing';

describe('getV3PlayerFacingRotation', () => {
  it('faces home players toward positive court depth', () => {
    const rotation = getV3PlayerFacingRotation('home');
    const forwardZ = Math.cos(rotation);

    expect(forwardZ).toBeGreaterThan(0.99);
  });

  it('faces away players toward negative court depth', () => {
    const rotation = getV3PlayerFacingRotation('away');
    const forwardZ = Math.cos(rotation);

    expect(forwardZ).toBeLessThan(-0.99);
  });
});
