import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V3MovementPad } from '../../../../src/ui/v3/V3MovementPad';

describe('V3MovementPad', () => {
  it('maps a diagonal drag to direct two-axis court movement and resets on release', () => {
    const onMove = vi.fn();
    render(<V3MovementPad onMove={onMove} />);
    const pad = screen.getByTestId('v3-movement-pad');

    fireEvent.pointerDown(pad, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 150, clientY: 50 });

    const diagonal = onMove.mock.calls.find(
      ([value]) => value.x > 0.4 && value.z > 0.4,
    )?.[0];
    expect(diagonal).toBeDefined();
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeLessThanOrEqual(1.001);

    fireEvent.pointerUp(pad, { pointerId: 1, clientX: 150, clientY: 50 });
    expect(onMove).toHaveBeenLastCalledWith({ x: 0, z: 0 });
  });

  it('clamps long drags to unit magnitude', () => {
    const onMove = vi.fn();
    render(<V3MovementPad onMove={onMove} />);
    const pad = screen.getByTestId('v3-movement-pad');

    fireEvent.pointerDown(pad, { pointerId: 7, clientX: 80, clientY: 80 });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 500, clientY: -400 });

    const last = onMove.mock.calls.at(-1)?.[0];
    expect(last).toBeDefined();
    expect(Math.hypot(last.x, last.z)).toBeLessThanOrEqual(1.001);
  });
});
