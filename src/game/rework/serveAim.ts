import type { Vec3 } from '../core/types';
import type { ReworkSwipe } from './types';

const SERVE_TARGET_X = 3.4;
const SERVE_TARGET_Z = 6.7;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface ReworkServePreviewTarget extends Vec3 {
  aggression: number;
}

export function getReworkServeTarget(swipe: ReworkSwipe | null): Vec3 {
  const lane = clamp((swipe?.x ?? 0) / 80, -1, 1);
  const x = Math.abs(lane) < 0.0001 ? 0 : -lane * SERVE_TARGET_X;
  return { x, y: 0, z: SERVE_TARGET_Z };
}

export function getReworkServePreviewTarget(
  swipe: ReworkSwipe | null,
): ReworkServePreviewTarget {
  const target = getReworkServeTarget(swipe);
  return {
    ...target,
    y: 0.025,
    aggression: clamp(Math.abs(swipe?.x ?? 0) / 80, 0, 1),
  };
}
