const SELECTION_RING_WORLD_Y = 0.025;

export function selectionRingLocalY(playerWorldY: number): number {
  return SELECTION_RING_WORLD_Y - Math.max(0, playerWorldY);
}
