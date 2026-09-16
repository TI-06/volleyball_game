import type { V3RallyPhase } from '../types';

export type V3CharacterMotionState =
  | 'READY'
  | 'RUN'
  | 'RECEIVE'
  | 'DIVE'
  | 'SET'
  | 'APPROACH'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK'
  | 'LAND';

export type V3PresentationEventType =
  | 'RECEIVE'
  | 'SET'
  | 'JUMP'
  | 'ATTACK'
  | 'BLOCK'
  | 'LAND'
  | 'POINT';

export interface V3CharacterMotionInput {
  phase: V3RallyPhase;
  speed: number;
  lastEvent: { type: V3PresentationEventType } | null;
  bufferedActionKind: 'ACTION' | 'DIVE' | 'JUMP' | null;
  controlled: boolean;
  cue?: 'BLOCK' | 'LAND' | null;
}

const RUN_SPEED_THRESHOLD = 0.25;

export function deriveCharacterMotion(input: V3CharacterMotionInput): V3CharacterMotionState {
  if (input.cue === 'BLOCK') return 'BLOCK';
  if (input.cue === 'LAND') return 'LAND';

  if (input.bufferedActionKind === 'DIVE' && input.controlled) return 'DIVE';

  if (input.lastEvent?.type === 'ATTACK') return 'SPIKE';
  if (input.lastEvent?.type === 'BLOCK') return 'BLOCK';
  if (input.lastEvent?.type === 'LAND') return 'LAND';
  if (input.lastEvent?.type === 'JUMP') return 'JUMP';
  if (input.lastEvent?.type === 'SET') return 'SET';
  if (input.lastEvent?.type === 'RECEIVE') return 'RECEIVE';

  if (input.phase === 'ATTACK_AIRBORNE') return 'JUMP';
  if (input.phase === 'ATTACK_APPROACH') return 'APPROACH';
  if (input.phase === 'SET_BUILDUP' && !input.controlled) return 'SET';

  if (Number.isFinite(input.speed) && input.speed >= RUN_SPEED_THRESHOLD) return 'RUN';
  return 'READY';
}
