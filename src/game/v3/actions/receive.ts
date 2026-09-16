import type { V3ContactQuality } from '../types';

export interface ReceiveQualityInput {
  timingOffsetSeconds: number;
  distanceMeters: number;
  movementSpeedMetersPerSecond: number;
}

const QUALITY_ORDER: readonly V3ContactQuality[] = ['PERFECT', 'GOOD', 'BAD', 'MISS'];

function baseReceiveQuality(timing: number, distance: number): V3ContactQuality {
  if (timing <= 0.12 && distance <= 0.55) return 'PERFECT';
  if (timing <= 0.24 && distance <= 1.0) return 'GOOD';
  if (timing <= 0.38 && distance <= 1.55) return 'BAD';
  return 'MISS';
}

export function resolveReceiveQuality(input: ReceiveQualityInput): V3ContactQuality {
  const timing = Math.abs(Number.isFinite(input.timingOffsetSeconds) ? input.timingOffsetSeconds : Infinity);
  const distance = Math.abs(Number.isFinite(input.distanceMeters) ? input.distanceMeters : Infinity);
  const speed = Math.abs(
    Number.isFinite(input.movementSpeedMetersPerSecond)
      ? input.movementSpeedMetersPerSecond
      : Infinity,
  );

  const quality = baseReceiveQuality(timing, distance);
  if (quality === 'MISS' || speed <= 3.5) return quality;
  return QUALITY_ORDER[Math.min(QUALITY_ORDER.indexOf(quality) + 1, QUALITY_ORDER.length - 1)];
}
