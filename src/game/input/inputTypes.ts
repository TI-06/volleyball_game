import type { MatchInput } from '../core/types';

export type ActionKind =
  | 'SERVE'
  | 'RECEIVE'
  | 'DIVE'
  | 'SET'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK';

export type SwitchMode = 'CASUAL' | 'STANDARD' | 'MANUAL';

export interface SwipeInput {
  x: number;
  y: number;
  durationMs: number;
}

export interface PlayerInput extends MatchInput {
  aim: { x: number; z: number };
  swipe: SwipeInput | null;
}

export interface SwitchDecision {
  playerId: string | null;
  warningLead: number;
  reason:
    | 'MANUAL_MODE'
    | 'CURRENT_PLAYER'
    | 'HELD_BY_INPUT'
    | 'SERVE'
    | 'BALL_TARGET'
    | 'NO_CANDIDATE';
}

export interface ManualSwitchResult {
  activePlayerId: string;
  queuedPlayerId: string | null;
}
