export const TUTORIAL_MATCH_SEED = 1;

const GOLDEN_RATIO_STEP = 0x9e3779b9;
const MIN_PLAYABLE_SEED = 2;

function normalizeSeed(value: number): number {
  const normalized = Math.trunc(Number.isFinite(value) ? value : 0) >>> 0;
  return normalized <= TUTORIAL_MATCH_SEED ? MIN_PLAYABLE_SEED : normalized;
}

export function createSessionSeed(nowMs = Date.now()): number {
  return normalizeSeed(nowMs);
}

export function nextMatchSeed(previousSeed: number): number {
  const current = normalizeSeed(previousSeed);
  const next = (current + GOLDEN_RATIO_STEP) >>> 0;
  return normalizeSeed(next === current ? current + 1 : next);
}
