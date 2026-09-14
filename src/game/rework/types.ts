import type { CpuDifficulty } from '../ai/difficulty';
import type { ContactQuality, MatchState } from '../core/types';

export type ReworkActionLabel =
  | 'NONE'
  | 'RECEIVE'
  | 'SET'
  | 'TIP'
  | 'SERVE'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK_READY';

export type ReworkEventType =
  | 'SERVE'
  | 'RECEIVE'
  | 'SET'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK'
  | 'POINT';

export type ReworkCpuRole =
  | 'SERVE'
  | 'RECEIVE'
  | 'SET'
  | 'APPROACH'
  | 'BLOCK'
  | 'COVER';

export interface ReworkSwipe {
  x: number;
  y: number;
  durationMs: number;
}

export interface ReworkInput {
  moveAxis: number;
  playPressed: boolean;
  powerPressed: boolean;
  powerReleased: boolean;
  powerSwipe: ReworkSwipe | null;
}

export interface ReworkEvent {
  type: ReworkEventType;
  actorId?: string;
  quality?: ContactQuality;
  value?: number;
}

export interface ReworkCpuMemory {
  role: ReworkCpuRole;
  readyAt: number;
}

export interface ReworkRuntimeState {
  match: MatchState;
  difficulty: CpuDifficulty;
  focusPlayerId: 'home-0';
  playLabel: ReworkActionLabel;
  powerLabel: ReworkActionLabel;
  blockHoldStartedAt: number | null;
  powerHoldStartedAt: number | null;
  cpuMemory: Record<string, ReworkCpuMemory>;
  lastEvent: ReworkEvent | null;
}
