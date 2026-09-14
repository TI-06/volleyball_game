export function shouldPauseMatchForViewport(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return height > width;
}
