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
        onPowerCancel={() => undefined}
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
        onPowerCancel={() => undefined}
      />,
    );
    const power = screen.getByRole('button', { name: /POWER SPIKE/i });
    fireEvent.pointerDown(power, { pointerId: 3, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(power, { pointerId: 3, clientX: 360, clientY: 170 });
    fireEvent.pointerUp(power, { pointerId: 3, clientX: 360, clientY: 170 });
    expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ x: 60, y: -50 }));
  });

  it('cancels POWER without converting pointercancel into an action release', () => {
    const onRelease = vi.fn();
    const onCancel = vi.fn();
    render(
      <DualActionPad
        playLabel="NONE"
        powerLabel="SERVE"
        onPlayPress={() => undefined}
        onPowerPress={() => undefined}
        onPowerRelease={onRelease}
        onPowerCancel={onCancel}
      />,
    );
    const power = screen.getByRole('button', { name: /POWER SERVE/i });
    fireEvent.pointerDown(power, { pointerId: 4, clientX: 300, clientY: 220 });
    fireEvent.pointerCancel(power, { pointerId: 4, clientX: 320, clientY: 200 });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onRelease).not.toHaveBeenCalled();
  });

  it('shows hold aim release guidance while charging a serve', () => {
    render(
      <DualActionPad
        playLabel="NONE"
        powerLabel="SERVE"
        onPlayPress={() => undefined}
        onPowerPress={() => undefined}
        onPowerRelease={() => undefined}
        onPowerCancel={() => undefined}
      />,
    );
    const power = screen.getByRole('button', { name: /POWER SERVE/i });
    fireEvent.pointerDown(power, { pointerId: 8, clientX: 300, clientY: 220 });
    expect(screen.getByText('HOLD · AIM · RELEASE')).toBeInTheDocument();
  });

  it('reports live serve aim while dragging POWER', () => {
    const onAim = vi.fn();
    render(
      <DualActionPad
        playLabel="NONE"
        powerLabel="SERVE"
        onPlayPress={() => undefined}
        onPowerPress={() => undefined}
        onPowerAim={onAim}
        onPowerRelease={() => undefined}
        onPowerCancel={() => undefined}
      />,
    );
    const power = screen.getByRole('button', { name: /POWER SERVE/i });
    fireEvent.pointerDown(power, { pointerId: 9, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(power, { pointerId: 9, clientX: 350, clientY: 215 });

    expect(onAim).toHaveBeenLastCalledWith(expect.objectContaining({ x: 50, y: -5 }));
  });
});
