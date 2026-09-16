import { describe, expect, it } from 'vitest';
import {
  bufferAction,
  consumeBufferedAction,
  isBufferedActionActive,
} from '../../../../src/game/v3/controls/inputBuffer';

describe('V3 early action buffer', () => {
  it('keeps a defensive ACTION alive long enough to prepare before contact', () => {
    const action = bufferAction('ACTION', 1, { x: 0.25, z: -0.8 });
    expect(isBufferedActionActive(action, 1.4)).toBe(true);
    expect(isBufferedActionActive(action, 1.451)).toBe(false);
    expect(action.direction).toEqual({ x: 0.25, z: -0.8 });
  });

  it('consumes an active action only once', () => {
    const action = bufferAction('DIVE', 3, { x: -1, z: 0 });
    const consumed = consumeBufferedAction(action, 3.2);
    expect(consumed?.consumed).toBe(true);
    expect(consumeBufferedAction(consumed!, 3.21)).toBeNull();
  });

  it('does not consume an expired action', () => {
    const action = bufferAction('JUMP_BLOCK', 5, undefined, 0.2);
    expect(consumeBufferedAction(action, 5.21)).toBeNull();
  });
});
