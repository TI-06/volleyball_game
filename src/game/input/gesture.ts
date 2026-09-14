import type { AttackIntent } from '../actions/spike';
import type { SetTempo } from '../actions/set';
import type { ActionKind, SwipeInput } from './inputTypes';

export interface GestureIntent {
  aimX: number;
  aimZ: number;
  attackIntent?: AttackIntent;
  setTempo?: SetTempo;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function interpretActionGesture(
  action: ActionKind,
  swipe: SwipeInput,
): GestureIntent {
  const distance = Math.hypot(swipe.x, swipe.y);
  const aimX = clamp(swipe.x / 32, -4.05, 4.05);

  if (action === 'SET') {
    const setTempo: SetTempo =
      swipe.durationMs <= 180 || distance >= 145
        ? 'QUICK'
        : swipe.durationMs >= 430
          ? 'HIGH'
          : 'NORMAL';
    return { aimX, aimZ: -0.8, setTempo };
  }

  if (action === 'SPIKE') {
    let attackIntent: AttackIntent = 'POWER';
    if (distance < 34) {
      attackIntent = 'TIP';
    } else if (Math.abs(swipe.x) >= 118 && Math.abs(swipe.y) <= 72) {
      attackIntent = 'BLOCK_OUT';
    } else if (Math.abs(swipe.x) >= 48) {
      attackIntent = swipe.x > 0 ? 'LINE' : 'CROSS';
    }
    return { aimX, aimZ: 6.6, attackIntent };
  }

  if (action === 'SERVE') {
    return {
      aimX,
      aimZ: clamp(6.1 - swipe.y / 110, 4.5, 8.1),
    };
  }

  return { aimX: 0, aimZ: 6.2 };
}

export function isGestureAction(action: ActionKind): boolean {
  return action === 'SERVE' || action === 'SET' || action === 'SPIKE';
}
