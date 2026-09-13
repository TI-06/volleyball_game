export type CpuDifficulty = 'BEGINNER' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER';

export interface DifficultyProfile {
  id: CpuDifficulty;
  reactionDelay: { min: number; max: number };
  predictionError: number;
  decisionNoise: number;
  openSpaceWeight: number;
  blockerReadWeight: number;
  tendencyWeight: number;
  tipChance: number;
}

export const DIFFICULTY_PROFILES: Record<CpuDifficulty, DifficultyProfile> = {
  BEGINNER: {
    id: 'BEGINNER',
    reactionDelay: { min: 0.5, max: 0.8 },
    predictionError: 1.25,
    decisionNoise: 0.34,
    openSpaceWeight: 0.12,
    blockerReadWeight: 0,
    tendencyWeight: 0,
    tipChance: 0.02,
  },
  NORMAL: {
    id: 'NORMAL',
    reactionDelay: { min: 0.35, max: 0.55 },
    predictionError: 0.9,
    decisionNoise: 0.22,
    openSpaceWeight: 0.35,
    blockerReadWeight: 0.12,
    tendencyWeight: 0,
    tipChance: 0.07,
  },
  HARD: {
    id: 'HARD',
    reactionDelay: { min: 0.22, max: 0.4 },
    predictionError: 0.58,
    decisionNoise: 0.14,
    openSpaceWeight: 0.58,
    blockerReadWeight: 0.52,
    tendencyWeight: 0.08,
    tipChance: 0.11,
  },
  EXPERT: {
    id: 'EXPERT',
    reactionDelay: { min: 0.12, max: 0.25 },
    predictionError: 0.34,
    decisionNoise: 0.08,
    openSpaceWeight: 0.8,
    blockerReadWeight: 0.75,
    tendencyWeight: 0.3,
    tipChance: 0.16,
  },
  MASTER: {
    id: 'MASTER',
    reactionDelay: { min: 0.07, max: 0.16 },
    predictionError: 0.18,
    decisionNoise: 0.04,
    openSpaceWeight: 0.95,
    blockerReadWeight: 0.92,
    tendencyWeight: 0.78,
    tipChance: 0.2,
  },
};
