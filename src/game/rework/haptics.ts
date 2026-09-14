import type { ReworkEvent } from './types';

export function getReworkHapticPattern(event: ReworkEvent): number[] | null {
  if (event.type === 'POINT') {
    return (event.value ?? 0) > 0 ? [16, 24, 28] : null;
  }

  if (event.actorId !== 'home-0') return null;

  if (event.type === 'RECEIVE') {
    return event.quality === 'PERFECT' ? [16] : [12];
  }
  if (event.type === 'SPIKE') {
    return event.quality === 'PERFECT' ? [24, 18, 18] : [20];
  }
  if (event.type === 'BLOCK') {
    return event.quality === 'PERFECT' ? [26, 16, 20] : [24];
  }
  return null;
}

export function playReworkHaptic(event: ReworkEvent): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const pattern = getReworkHapticPattern(event);
  if (!pattern) return;
  navigator.vibrate(pattern);
}
