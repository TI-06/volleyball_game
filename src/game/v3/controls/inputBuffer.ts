import type { V3Vec2 } from '../types';

export type V3BufferedActionKind = 'ACTION' | 'DIVE' | 'JUMP_BLOCK';

export interface V3BufferedAction {
  kind: V3BufferedActionKind;
  createdAt: number;
  expiresAt: number;
  direction?: V3Vec2;
  consumed: boolean;
}

export const DEFAULT_ACTION_BUFFER_SECONDS = 0.45;

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function bufferAction(
  kind: V3BufferedActionKind,
  now: number,
  direction?: V3Vec2,
  windowSeconds = DEFAULT_ACTION_BUFFER_SECONDS,
): V3BufferedAction {
  const createdAt = finiteOrZero(now);
  const window = Number.isFinite(windowSeconds) && windowSeconds > 0
    ? windowSeconds
    : DEFAULT_ACTION_BUFFER_SECONDS;
  return {
    kind,
    createdAt,
    expiresAt: createdAt + window,
    direction: direction ? { x: direction.x, z: direction.z } : undefined,
    consumed: false,
  };
}

export function isBufferedActionActive(action: V3BufferedAction, now: number): boolean {
  if (action.consumed || !Number.isFinite(now)) return false;
  return now >= action.createdAt && now <= action.expiresAt;
}

export function consumeBufferedAction(
  action: V3BufferedAction,
  now: number,
): V3BufferedAction | null {
  if (!isBufferedActionActive(action, now)) return null;
  return { ...action, consumed: true };
}
