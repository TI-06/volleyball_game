import { useRef, useState, type PointerEvent } from 'react';
import type { ReworkActionLabel, ReworkSwipe } from '../../game/rework/types';

interface DualActionPadProps {
  playLabel: ReworkActionLabel;
  powerLabel: ReworkActionLabel;
  onPlayPress: () => void;
  onPowerPress: () => void;
  onPowerAim?: (swipe: ReworkSwipe | null) => void;
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
  onPowerAim,
  onPowerRelease,
  onPowerCancel,
}: DualActionPadProps) {
  const powerPointerId = useRef<number | null>(null);
  const powerStart = useRef({ x: 0, y: 0, time: 0 });
  const powerLast = useRef({ x: 0, y: 0 });
  const [powerActive, setPowerActive] = useState(false);

  const swipeFromPoint = (x: number, y: number): ReworkSwipe => ({
    x: x - powerStart.current.x,
    y: y - powerStart.current.y,
    durationMs: Math.max(1, performance.now() - powerStart.current.time),
  });

  const onPowerPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== null || powerLabel === 'NONE') return;
    powerPointerId.current = event.pointerId;
    powerStart.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    powerLast.current = { x: event.clientX, y: event.clientY };
    setPowerActive(true);
    if (powerLabel === 'SERVE') onPowerAim?.(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onPowerPress();
  };

  const onPowerPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== event.pointerId) return;
    powerLast.current = { x: event.clientX, y: event.clientY };
    if (powerLabel === 'SERVE') {
      onPowerAim?.(swipeFromPoint(event.clientX, event.clientY));
    }
  };

  const clearPointer = (event: PointerEvent<HTMLButtonElement>) => {
    powerPointerId.current = null;
    setPowerActive(false);
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
    const rawSwipe = swipeFromPoint(last.x, last.y);
    const distance = Math.hypot(rawSwipe.x, rawSwipe.y);
    const swipe = distance >= MIN_SWIPE_DISTANCE ? rawSwipe : null;

    clearPointer(event);
    if (powerLabel === 'SERVE') onPowerAim?.(null);
    onPowerRelease(swipe);
  };

  const cancelPower = (event: PointerEvent<HTMLButtonElement>) => {
    if (powerPointerId.current !== event.pointerId) return;
    clearPointer(event);
    if (powerLabel === 'SERVE') onPowerAim?.(null);
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
        className={`rework-action rework-action--power${powerLabel !== 'NONE' ? ' is-ready' : ''}${powerActive ? ' is-active' : ''}`}
        aria-label={`POWER ${contextText(powerLabel)}`}
        onPointerDown={onPowerPointerDown}
        onPointerMove={onPowerPointerMove}
        onPointerUp={finishPower}
        onPointerCancel={cancelPower}
      >
        {powerActive && powerLabel === 'SERVE' ? (
          <em className="rework-action__hint" aria-hidden="true">HOLD · AIM · RELEASE</em>
        ) : null}
        <strong>POWER</strong>
        <span>{contextText(powerLabel)}</span>
      </button>
    </div>
  );
}
