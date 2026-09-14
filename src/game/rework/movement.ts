export interface ReworkPositionXZ {
  x: number;
  z: number;
}

const DEFAULT_DEPTH_SPEED = 6.2;

function moveToward(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

export function clampFocusAxis(axis: number): number {
  if (!Number.isFinite(axis)) return 0;
  return Math.max(-1, Math.min(1, axis));
}

export function assistFocusPosition(
  current: ReworkPositionXZ,
  assistTarget: ReworkPositionXZ,
  moveAxis: number,
  dt: number,
  depthSpeed = DEFAULT_DEPTH_SPEED,
  widthAssistSpeed = depthSpeed * 0.75,
): ReworkPositionXZ {
  const safeDt = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const axis = clampFocusAxis(moveAxis);

  return {
    x: moveToward(current.x, assistTarget.x, widthAssistSpeed * safeDt),
    z: current.z + axis * depthSpeed * safeDt,
  };
}
