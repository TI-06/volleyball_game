import type { V3ContactQuality, V3Vec2 } from '../types';

export type V3AttackIntent = 'TIP' | 'LINE' | 'CROSS' | 'POWER';

export function resolveJumpTiming(offsetSeconds: number): V3ContactQuality {
  const offset = Math.abs(Number.isFinite(offsetSeconds) ? offsetSeconds : Infinity);
  if (offset <= 0.09) return 'PERFECT';
  if (offset <= 0.18) return 'GOOD';
  if (offset <= 0.3) return 'BAD';
  return 'MISS';
}

export function attackIntentFromGesture(gesture: Pick<V3Vec2, 'x'> & { y: number }): V3AttackIntent {
  const x = Number.isFinite(gesture.x) ? gesture.x : 0;
  const y = Number.isFinite(gesture.y) ? gesture.y : 0;
  const distance = Math.hypot(x, y);
  if (distance < 24) return 'TIP';
  if (Math.abs(x) > Math.abs(y) * 1.25) return x > 0 ? 'LINE' : 'CROSS';
  return 'POWER';
}
