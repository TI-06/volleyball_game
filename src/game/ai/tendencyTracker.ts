import type { AttackIntent } from '../actions/spike';

export type DefenseChoice = 'BLOCK' | 'BACKCOURT';

export interface TendencyHistory {
  attacks: AttackIntent[];
  defenses: DefenseChoice[];
}

const MAX_HISTORY = 12;

export function createTendencyHistory(): TendencyHistory {
  return { attacks: [], defenses: [] };
}

export function recordAttack(
  history: TendencyHistory,
  attack: AttackIntent,
): TendencyHistory {
  return {
    ...history,
    attacks: [...history.attacks, attack].slice(-MAX_HISTORY),
  };
}

export function recordDefense(
  history: TendencyHistory,
  defense: DefenseChoice,
): TendencyHistory {
  return {
    ...history,
    defenses: [...history.defenses, defense].slice(-MAX_HISTORY),
  };
}

function dominant<T extends string>(values: readonly T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function dominantAttack(history: TendencyHistory): AttackIntent | null {
  return dominant(history.attacks);
}

export function dominantDefense(history: TendencyHistory): DefenseChoice | null {
  return dominant(history.defenses);
}
