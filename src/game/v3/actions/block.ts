export type V3BlockResult = 'STUFF' | 'TOUCH' | 'DEFLECT' | 'MISS';

export interface BlockResolutionInput {
  timingOffsetSeconds: number;
  lateralErrorMeters: number;
}

export function resolveBlockResult(input: BlockResolutionInput): V3BlockResult {
  const timing = Number.isFinite(input.timingOffsetSeconds)
    ? input.timingOffsetSeconds
    : Infinity;
  const lateral = Math.abs(
    Number.isFinite(input.lateralErrorMeters) ? input.lateralErrorMeters : Infinity,
  );

  // Positive means the blocker initiated after the attacker contacted the ball.
  if (timing > 0) return 'MISS';
  const anticipation = Math.abs(timing);
  if (anticipation <= 0.11 && lateral <= 0.45) return 'STUFF';
  if (anticipation <= 0.2 && lateral <= 0.8) return 'TOUCH';
  if (anticipation <= 0.3 && lateral <= 1.2) return 'DEFLECT';
  return 'MISS';
}
