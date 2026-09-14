import type { CpuDifficulty } from '../game/ai/difficulty';
import type { CameraSetting } from '../game/camera/cameraDirector';
import type { SwitchMode } from '../game/input/inputTypes';

export const STORAGE_KEY = 'volleyball-game:v1';

export interface StoredSettings {
  tutorialComplete: boolean;
  switchMode: SwitchMode;
  cameraMode: CameraSetting;
  unlockedDifficulties: CpuDifficulty[];
}

export interface StoredScore {
  for: number;
  against: number;
}

export interface StoredRecords {
  bestScores: Partial<Record<CpuDifficulty, StoredScore>>;
  highestSpikeKmh: number;
  perfectCount: number;
  matchesPlayed: number;
  wins: number;
}

export interface StoredRoot {
  version: 1;
  settings: StoredSettings;
  records: StoredRecords;
}

export const DEFAULT_SETTINGS: StoredSettings = {
  tutorialComplete: false,
  switchMode: 'STANDARD',
  cameraMode: 'STANDARD',
  unlockedDifficulties: ['BEGINNER', 'NORMAL', 'HARD'],
};

export const DEFAULT_RECORDS: StoredRecords = {
  bestScores: {},
  highestSpikeKmh: 0,
  perfectCount: 0,
  matchesPlayed: 0,
  wins: 0,
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isDifficulty(value: unknown): value is CpuDifficulty {
  return (
    value === 'BEGINNER' ||
    value === 'NORMAL' ||
    value === 'HARD' ||
    value === 'EXPERT' ||
    value === 'MASTER'
  );
}

function readSettings(value: unknown): StoredSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const candidate = value as Record<string, unknown>;
  const unlocked = Array.isArray(candidate.unlockedDifficulties)
    ? candidate.unlockedDifficulties.filter(isDifficulty)
    : DEFAULT_SETTINGS.unlockedDifficulties;
  const required = ['BEGINNER', 'NORMAL', 'HARD'] as CpuDifficulty[];
  const unlockedDifficulties = [...new Set([...required, ...unlocked])];

  return {
    tutorialComplete: candidate.tutorialComplete === true,
    switchMode:
      candidate.switchMode === 'CASUAL' ||
      candidate.switchMode === 'MANUAL' ||
      candidate.switchMode === 'STANDARD'
        ? candidate.switchMode
        : DEFAULT_SETTINGS.switchMode,
    cameraMode:
      candidate.cameraMode === 'LOW' ||
      candidate.cameraMode === 'OFF' ||
      candidate.cameraMode === 'STANDARD'
        ? candidate.cameraMode
        : DEFAULT_SETTINGS.cameraMode,
    unlockedDifficulties,
  };
}

function readRecords(value: unknown): StoredRecords {
  if (!value || typeof value !== 'object') return { ...DEFAULT_RECORDS, bestScores: {} };
  const candidate = value as Record<string, unknown>;
  const bestScores: StoredRecords['bestScores'] = {};
  if (candidate.bestScores && typeof candidate.bestScores === 'object') {
    for (const difficulty of ['BEGINNER', 'NORMAL', 'HARD', 'EXPERT', 'MASTER'] as const) {
      const score = (candidate.bestScores as Record<string, unknown>)[difficulty];
      if (score && typeof score === 'object') {
        const object = score as Record<string, unknown>;
        if (typeof object.for === 'number' && typeof object.against === 'number') {
          bestScores[difficulty] = { for: object.for, against: object.against };
        }
      }
    }
  }

  return {
    bestScores,
    highestSpikeKmh:
      typeof candidate.highestSpikeKmh === 'number' && Number.isFinite(candidate.highestSpikeKmh)
        ? Math.max(0, candidate.highestSpikeKmh)
        : 0,
    perfectCount:
      typeof candidate.perfectCount === 'number' && Number.isFinite(candidate.perfectCount)
        ? Math.max(0, Math.floor(candidate.perfectCount))
        : 0,
    matchesPlayed:
      typeof candidate.matchesPlayed === 'number' && Number.isFinite(candidate.matchesPlayed)
        ? Math.max(0, Math.floor(candidate.matchesPlayed))
        : 0,
    wins:
      typeof candidate.wins === 'number' && Number.isFinite(candidate.wins)
        ? Math.max(0, Math.floor(candidate.wins))
        : 0,
  };
}

export function loadRoot(): StoredRoot {
  if (!canUseStorage()) {
    return {
      version: 1,
      settings: { ...DEFAULT_SETTINGS },
      records: { ...DEFAULT_RECORDS, bestScores: {} },
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('missing');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      version: 1,
      settings: readSettings(parsed.settings),
      records: readRecords(parsed.records),
    };
  } catch {
    return {
      version: 1,
      settings: { ...DEFAULT_SETTINGS },
      records: { ...DEFAULT_RECORDS, bestScores: {} },
    };
  }
}

export function saveRoot(root: StoredRoot): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    // A storage write failure must never block the match.
  }
}
