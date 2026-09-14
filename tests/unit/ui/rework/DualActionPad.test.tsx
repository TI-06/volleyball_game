import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DualActionPad } from '../../../../src/ui/rework/DualActionPad';

describe('DualActionPad', () => {
  it('keeps PLAY and POWER labels fixed while showing context underneath', () => {
    render(
      <DualActionPad
        playLabel="RECEIVE"
        powerLabel="JUMP"
        onPlayPress={() => undefined}
        onPowerPress={() => undefined}
        onPowerRelease={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /PLAY RECEIVE/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /POWER JUMP/i })).toBeInTheDocument();
  });

  it('reports a POWER swipe on release', () => {
    const onRelease = vi.fn();
    render(
      <DualActionPad
        playLabel="NONE"
        powerLabel="SPIKE"
        onPlayPress={() => undefined}
        onPowerPress={() => undefined}
        onPowerRelease={onRelease}
      />,
    );
    const power = screen.getByRole('button', { name: /POWER SPIKE/i });
    fireEvent.pointerDown(power, { pointerId: 3, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(power, { pointerId: 3, clientX: 360, clientY: 170 });
    fireEvent.pointerUp(power, { pointerId: 3, clientX: 360, clientY: 170 });
    expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ x: 60, y: -50 }));
  });
});
