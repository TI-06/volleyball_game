export const SERVE_FOLLOW_THROUGH_MS = 420;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function interpolateServeReturnZ(
  serviceZ: number,
  gameplayZ: number,
  elapsedMs: number,
): number {
  const progress = clamp01(elapsedMs / SERVE_FOLLOW_THROUGH_MS);
  const eased = 1 - (1 - progress) * (1 - progress);
  return serviceZ + (gameplayZ - serviceZ) * eased;
}
