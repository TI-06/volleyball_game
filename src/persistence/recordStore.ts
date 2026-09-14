import type { CpuDifficulty } from '../game/ai/difficulty';
import type { StoredRecords, StoredSettings } from './gameStorage';
import { loadRoot, saveRoot } from './gameStorage';

export interface MatchResultRecord {
  difficulty: CpuDifficulty;
  homeScore: number;
  awayScore: number;
  highestSpikeKmh: number;
  perfectCount: number;
}

function isBetterScore(
  current: { for: number; against: number } | undefined,
  next: { for: number; against: number },
): boolean {
  if (!current) return true;
  const currentMargin = current.for - current.against;
  const nextMargin = next.for - next.against;
  return nextMargin > currentMargin || (nextMargin === currentMargin && next.against < current.against);
}

function unlockAfterWin(
  settings: StoredSettings,
  difficulty: CpuDifficulty,
  won: boolean,
): StoredSettings {
  if (!won) return settings;
  const unlocked = new Set(settings.unlockedDifficulties);
  if (difficulty === 'HARD') unlocked.add('EXPERT');
  if (difficulty === 'EXPERT') unlocked.add('MASTER');
  return { ...settings, unlockedDifficulties: [...unlocked] };
}

export function loadRecords(): StoredRecords {
  return loadRoot().records;
}

export function saveMatchResult(result: MatchResultRecord): {
  records: StoredRecords;
  settings: StoredSettings;
} {
  const root = loadRoot();
  const won = result.homeScore > result.awayScore;
  const nextScore = { for: result.homeScore, against: result.awayScore };
  const currentScore = root.records.bestScores[result.difficulty];
  const bestScores = { ...root.records.bestScores };
  if (isBetterScore(currentScore, nextScore)) {
    bestScores[result.difficulty] = nextScore;
  }

  const records: StoredRecords = {
    ...root.records,
    bestScores,
    highestSpikeKmh: Math.max(root.records.highestSpikeKmh, result.highestSpikeKmh),
    perfectCount: root.records.perfectCount + result.perfectCount,
    matchesPlayed: root.records.matchesPlayed + 1,
    wins: root.records.wins + (won ? 1 : 0),
  };
  const settings = unlockAfterWin(root.settings, result.difficulty, won);
  saveRoot({ version: 1, settings, records });
  return { records, settings };
}
