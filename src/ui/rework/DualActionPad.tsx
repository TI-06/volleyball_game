import { useRef, type PointerEvent } from 'react';
import type { ReworkActionLabel, ReworkSwipe } from '../../game/rework/types';

interface DualActionPadProps {
  playLabel: ReworkActionLabel;
  powerLabel: ReworkActionLabel;
  onPlayPress: () => void;
  onPowerPress: () => void;
  onPowerRelease: (swipe: ReworkSwipe | null) => void;
  onPowerCancel: () => void;
}

const MIN_SWIPE_DISTANCE = 14;

function contextText(label: ReworkActionLabel): string {
  return label === 'NONE' ? 'READY' : label.replace('_', ' ');
}

export function DualActionPad({
  playLabel,
  powerLabel,
  onPlayPress,
  onPowerPress,
  onPowerRelease,
  onPowerCancel,
}: DualActionPadProps) {
  const powerPointerId = useRef<number | null>(null);
  const powerStart = useRef({ x: 0, y: 0, time: 0 });
  const powerLast = useRef({ x: 0, y: 0 });

  const onPowerPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== null || powerLabel === 'NONE') return;
    powerPointerId.current = event.pointerId;
    powerStart.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    powerLast.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onPowerPress();
  };

  const onPowerPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== event.pointerId) return;
    powerLast.current = { x: event.clientX, y: event.clientY };
  };

  const clearPointer = (event: PointerEvent<HTMLButtonElement>) => {
    powerPointerId.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const finishPower = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== event.pointerId) return;
    const last = {
      x: Number.isFinite(event.clientX) ? event.clientX : powerLast.current.x,
      y: Number.isFinite(event.clientY) ? event.clientY : powerLast.current.y,
    };
    const x = last.x - powerStart.current.x;
    const y = last.y - powerStart.current.y;
    const distance = Math.hypot(x, y);
    const swipe = distance >= MIN_SWIPE_DISTANCE
      ? {
          x,
          y,
          durationMs: Math.max(1, performance.now() - powerStart.current.time),
        }
      : null;

    clearPointer(event);
    onPowerRelease(swipe);
  };

  const cancelPower = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== event.pointerId) return;
    clearPointer(event);
    onPowerCancel();
  };

  return (
    <div className="rework-action-pad">
      <button
        type="button"
        className={`rework-action rework-action--play${playLabel !== 'NONE' ? ' is-ready' : ''}`}
        aria-label={`PLAY ${contextText(playLabel)}`}
        onPointerDown={(event) => {
          if (playLabel === 'NONE') return;
          event.preventDefault();
          onPlayPress();
        }}
      >
        <strong>PLAY</strong>
        <span>{contextText(playLabel)}</span>
      </button>
      <button
        type="button"
        className={`rework-action rework-action--power${powerLabel !== 'NONE' ? ' is-ready' : ''}`}
        aria-label={`POWER ${contextText(powerLabel)}`}
        onPointerDown={onPowerPointerDown}
        onPointerMove={onPowerPointerMove}
        onPointerUp={finishPower}
        onPointerCancel={cancelPower}
      >
        <strong>POWER</strong>
        <span>{contextText(powerLabel)}</span>
      </button>
    </div>
  );
}
