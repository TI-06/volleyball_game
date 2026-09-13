import type { ActionKind } from '../game/input/inputTypes';

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
}

export function ActionButton({ action, onPress, onRelease }: ActionButtonProps) {
  if (!action) return null;

  return (
    <button
      type="button"
      className={`action-button action-button--${action.toLowerCase()}`}
      onPointerDown={() => onPress(action)}
      onPointerUp={() => onRelease?.(action)}
      onPointerCancel={() => onRelease?.(action)}
    >
      <span className="action-button__icon" aria-hidden="true">
        {ACTION_ICON[action]}
      </span>
      <span className="action-button__label">{action}</span>
    </button>
  );
}
