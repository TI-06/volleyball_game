import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionButton } from '../../../src/ui/ActionButton';

describe('ActionButton', () => {
  it('does not carry a stale JUMP pointer into the following SPIKE action', () => {
    const onPress = vi.fn();
    const onRelease = vi.fn();
    const onGesture = vi.fn();

    const view = render(
      <ActionButton
        action="JUMP"
        onPress={onPress}
        onRelease={onRelease}
        onGesture={onGesture}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button'), {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    expect(onPress).toHaveBeenCalledWith('JUMP');

    view.rerender(
      <ActionButton
        action="SPIKE"
        onPress={onPress}
        onRelease={onRelease}
        onGesture={onGesture}
      />,
    );

    fireEvent.pointerUp(screen.getByRole('button'), {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    expect(onGesture).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByRole('button'), {
      pointerId: 2,
      clientX: 120,
      clientY: 120,
    });
    fireEvent.pointerUp(screen.getByRole('button'), {
      pointerId: 2,
      clientX: 190,
      clientY: 80,
    });

    expect(onGesture).toHaveBeenCalledTimes(1);
    expect(onGesture).toHaveBeenCalledWith(
      'SPIKE',
      expect.objectContaining({ x: 70, y: -40 }),
    );
  });

  it('does not commit a gesture after pointer cancel', () => {
    const onGesture = vi.fn();
    render(
      <ActionButton
        action="SET"
        onPress={vi.fn()}
        onRelease={vi.fn()}
        onGesture={onGesture}
      />,
    );

    fireEvent.pointerDown(screen.getByRole('button'), {
      pointerId: 3,
      clientX: 50,
      clientY: 50,
    });
    fireEvent.pointerCancel(screen.getByRole('button'), { pointerId: 3 });

    expect(onGesture).not.toHaveBeenCalled();
  });
});
