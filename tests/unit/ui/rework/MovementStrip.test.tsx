import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementStrip } from '../../../../src/ui/rework/MovementStrip';

describe('MovementStrip', () => {
  it('maps right drag to positive movement and resets on release', () => {
    const onMove = vi.fn();
    render(<MovementStrip onMove={onMove} />);
    const strip = screen.getByTestId('rework-movement-strip');
    fireEvent.pointerDown(strip, { pointerId: 1, clientX: 90, clientY: 180 });
    fireEvent.pointerMove(strip, { pointerId: 1, clientX: 170, clientY: 180 });
    fireEvent.pointerUp(strip, { pointerId: 1, clientX: 170, clientY: 180 });
    expect(onMove).toHaveBeenCalledWith(expect.any(Number));
    expect(onMove.mock.calls.some(([value]) => value > 0.5)).toBe(true);
    expect(onMove).toHaveBeenLastCalledWith(0);
  });
});
