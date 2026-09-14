import type { ContactQuality } from '../core/types';

export function classifyContactTiming(
  timingOffsetSeconds: number,
  perfectWindowSeconds: number,
): ContactQuality {
  const offset = Math.abs(timingOffsetSeconds);
  const window = Math.max(0.01, perfectWindowSeconds);

  if (offset <= window) return 'PERFECT';
  if (offset <= window * 1.7) return 'GREAT';
  if (offset <= window * 2.6) return 'GOOD';
  if (offset <= window * 3.6) return 'BAD';
  return 'MISS';
}

export const CONTACT_POWER_MULTIPLIER: Record<ContactQuality, number> = {
  PERFECT: 1,
  GREAT: 0.93,
  GOOD: 0.82,
  BAD: 0.68,
  MISS: 0,
};
