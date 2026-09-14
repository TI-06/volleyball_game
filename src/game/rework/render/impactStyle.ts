import type { ReworkEvent } from '../types';

export interface ReworkImpactStyle {
  color: number;
  durationMs: number;
  maxScale: number;
  startOpacity: number;
}

export function getReworkImpactStyle(event: ReworkEvent): ReworkImpactStyle | null {
  if (event.type === 'SPIKE') {
    const perfect = event.quality === 'PERFECT';
    return {
      color: perfect ? 0xffd65c : 0x78efff,
      durationMs: perfect ? 260 : 220,
      maxScale: perfect ? 2.35 : 2.0,
      startOpacity: perfect ? 0.92 : 0.76,
    };
  }
  if (event.type === 'BLOCK') {
    return {
      color: event.quality === 'PERFECT' ? 0xff716f : 0xff9b76,
      durationMs: 240,
      maxScale: 2.15,
      startOpacity: 0.84,
    };
  }
  if (event.type === 'RECEIVE') {
    return {
      color: 0x59f4df,
      durationMs: 170,
      maxScale: 1.48,
      startOpacity: event.quality === 'PERFECT' ? 0.7 : 0.5,
    };
  }
  return null;
}
