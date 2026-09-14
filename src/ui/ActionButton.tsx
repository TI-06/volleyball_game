import { useEffect, useRef, type PointerEvent } from 'react';
import { isGestureAction } from '../game/input/gesture';
import type { ActionKind, SwipeInput } from '../game/input/inputTypes';

const ACTION_ICON: Record<ActionKind, string> = {
  SERVE: '↗',
  RECEIVE: '⌄',
  DIVE: '↘',
  SET: '△',
  JUMP: '↑',
  SPIKE: '⚡',
  BLOCK: '▥',
};

interface ActionButtonProps {
  action: ActionKind | null;
  onPress: (action: ActionKind) => void;
  onRelease?: (action: ActionKind) => void;
  onGesture?: (action: ActionKind, swipe: SwipeInput) => void;
}

interface PointerStart {
  x: number;
  y: number;
  at: number;
  action: ActionKind;
  gesture: boolean;
}

export function ActionButton({ action, onPress, onRelease, onGesture }: ActionButtonProps) {
  const activePointerId = useRef<number | null>(null);
  const pointerStart = useRef<PointerStart | null>(null);

  useEffect(() => {
    const start = pointerStart.current;
    if (!start || start.action === action) return;

    // Context ACTION can change while a finger is still down (JUMP -> SPIKE).
    // Drop the old pointer state so the newly rendered action cannot inherit a stale lock.
    activePointerId.current = null;
    pointerStart.current = null;
  }, [action]);

  if (!action) return null;
  const gestureAction = isGestureAction(action);

  const releaseCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clearPointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointerId.current !== event.pointerId) return null;
    const start = pointerStart.current;
    activePointerId.current = null;
    pointerStart.current = null;
    releaseCapture(event);
    return start;
  };

  return (
    <button
      type="button"
      className={`action-button action-button--${action.toLowerCase()}${gestureAction ? ' is-gesture' : ''}`}
      onPointerDown={(event) => {
        if (activePointerId.current !== null) return;
        activePointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointerStart.current = {
          x: event.clientX,
          y: event.clientY,
          at: performance.now(),
          action,
          gesture: gestureAction,
        };
        if (!gestureAction) {
          onPress(action);
        }
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        if (!start || activePointerId.current !== event.pointerId) return;

        if (start.gesture) {
          const swipe: SwipeInput = {
            x: event.clientX - start.x,
            y: event.clientY - start.y,
            durationMs: Math.max(0, performance.now() - start.at),
          };
          clearPointer(event);
          onGesture?.(start.action, swipe);
          return;
        }

        clearPointer(event);
        onRelease?.(start.action);
      }}
      onPointerCancel={(event) => {
        const start = clearPointer(event);
        if (start && !start.gesture) {
          onRelease?.(start.action);
        }
      }}
    >
      <span className="action-button__icon" aria-hidden="true">
        {ACTION_ICON[action]}
      </span>
      <span className="action-button__label">{action}</span>
      {gestureAction ? <span className="action-button__hint">SWIPE</span> : null}
    </button>
  );
}
