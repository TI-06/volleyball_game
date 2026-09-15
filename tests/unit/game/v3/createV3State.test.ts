import { describe, expect, it } from 'vitest';
import { createV3PrototypeState } from '../../../../src/game/v3/core/createV3State';

describe('V3 prototype state', () => {
  it('creates the same defensive 3v3 state for the same seed', () => {
    const first = createV3PrototypeState(73);
    const second = createV3PrototypeState(73);

    expect(first).toEqual(second);
    expect(first.players).toHaveLength(6);
    expect(first.controlledPlayerId).toBe('home-2');
    expect(first.phase).toBe('DEFENSE_READ');
    expect(first.seed).toBe(73);
  });
});
