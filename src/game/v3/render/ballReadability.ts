export const DEFAULT_MINIMUM_BALL_RADIUS_PX = 7;
export const MAX_BALL_RENDER_SCALE = 2.4;

export function getReadableBallScale(
  projectedRadiusPx: number,
  minimumRadiusPx = DEFAULT_MINIMUM_BALL_RADIUS_PX,
): number {
  const minimum =
    Number.isFinite(minimumRadiusPx) && minimumRadiusPx > 0
      ? minimumRadiusPx
      : DEFAULT_MINIMUM_BALL_RADIUS_PX;
  if (!Number.isFinite(projectedRadiusPx) || projectedRadiusPx <= 0) {
    return MAX_BALL_RENDER_SCALE;
  }
  return Math.max(1, Math.min(MAX_BALL_RENDER_SCALE, minimum / projectedRadiusPx));
}
