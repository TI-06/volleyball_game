import { useRef, type PointerEvent } from 'react';
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

export function ActionButton({ action, onPress, onRelease, onGesture }: ActionButtonProps) {
  const pointerStart = useRef<{ x: number; y: number; at: number } | null>(null);

  if (!action) return null;
  const gestureAction = isGestureAction(action);

  const finishGesture = (event: PointerEvent<HTMLButtonElement>) => {
    if (!gestureAction || !pointerStart.current) return;
    const start = pointerStart.current;
    pointerStart.current = null;
    onGesture?.(action, {
      x: event.clientX - start.x,
      y: event.clientY - start.y,
      durationMs: Math.max(0, performance.now() - start.at),
    });
  };

  return (
    <button
      type="button"
      className={`action-button action-button--${action.toLowerCase()}${gestureAction ? ' is-gesture' : ''}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        if (gestureAction) {
          pointerStart.current = {
            x: event.clientX,
            y: event.clientY,
            at: performance.now(),
          };
        } else {
          onPress(action);
        }
      }}
      onPointerUp={(event) => {
        if (gestureAction) {
          finishGesture(event);
        } else {
          onRelease?.(action);
        }
      }}
      onPointerCancel={(event) => {
        if (gestureAction) {
          finishGesture(event);
        } else {
          onRelease?.(action);
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
