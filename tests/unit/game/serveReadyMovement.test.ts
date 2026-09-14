import { describe, expect, it } from 'vitest';
import { constrainServeReadyMove } from '../../../src/game/input/serveReadyMovement';

describe('serve-ready movement constraint', () => {
  it('keeps lateral positioning but blocks forward/back movement before serve', () => {
    expect(constrainServeReadyMove('SERVE_READY', { x: 0.75, z: 1 })).toEqual({
      x: 0.75,
      z: 0,
    });
  });

  it('leaves rally movement unchanged', () => {
    expect(constrainServeReadyMove('RALLY', { x: -0.4, z: 0.8 })).toEqual({
      x: -0.4,
      z: 0.8,
    });
  });
});
