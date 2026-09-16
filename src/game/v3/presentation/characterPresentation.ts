import type { V3BufferedActionKind } from '../controls/inputBuffer';
import type { V3RallyPhase, V3TeamSide, V3Vec2 } from '../types';
import {
  deriveCharacterMotion,
  type V3CharacterMotionState,
  type V3PresentationEventType,
} from './characterMotion';

export interface V3PresentationEvent {
  type: V3PresentationEventType | 'POINT';
  actorId?: string;
}

export interface V3PresentationBufferedAction {
  kind: V3BufferedActionKind;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

export interface V3CharacterPresentationInput {
  playerId: string;
  side: V3TeamSide;
  currentPosition: V3Vec2;
  previousPosition: V3Vec2;
  dt: number;
  phase: V3RallyPhase;
  controlledPlayerId: string;
  lastEvent: V3PresentationEvent | null;
  bufferedAction: V3PresentationBufferedAction | null;
  previousMotion: V3CharacterMotionState;
  previousMotionAge: number;
}

export interface V3CharacterPresentation {
  motion: V3CharacterMotionState;
  motionAge: number;
  normalizedTime: number;
  speed: number;
}

const MOTION_DURATION: Record<V3CharacterMotionState, number> = {
  READY: 1.8,
  RUN: 0.62,
  RECEIVE: 0.48,
  DIVE: 0.72,
  SET: 0.62,
  APPROACH: 0.56,
  JUMP: 0.72,
  SPIKE: 0.68,
  BLOCK: 0.7,
  LAND: 0.52,
};

const LOOPING = new Set<V3CharacterMotionState>(['READY', 'RUN', 'APPROACH']);

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function speedMetersPerSecond(current: V3Vec2, previous: V3Vec2, dt: number): number {
  const safeDt = finitePositive(dt);
  if (safeDt <= 0) return 0;
  return Math.hypot(current.x - previous.x, current.z - previous.z) / safeDt;
}

function actorEventForPlayer(
  event: V3PresentationEvent | null,
  playerId: string,
): { type: V3PresentationEventType } | null {
  if (!event || event.type === 'POINT') return null;
  if (event.actorId !== playerId) return null;
  return { type: event.type };
}

function bufferedKindForPlayer(
  action: V3PresentationBufferedAction | null,
  playerId: string,
  controlledPlayerId: string,
): 'ACTION' | 'DIVE' | 'JUMP' | null {
  if (!action || action.consumed || playerId !== controlledPlayerId) return null;
  if (action.kind === 'DIVE') return 'DIVE';
  if (action.kind === 'ACTION') return 'ACTION';
  if (action.kind === 'JUMP_BLOCK') return 'JUMP';
  return null;
}

function normalizePoseTime(motion: V3CharacterMotionState, age: number): number {
  const duration = MOTION_DURATION[motion];
  if (duration <= 0) return 0;
  if (LOOPING.has(motion)) return (age % duration) / duration;
  return Math.min(1, age / duration);
}

export function deriveV3CharacterPresentation(
  input: V3CharacterPresentationInput,
): V3CharacterPresentation {
  const dt = finitePositive(input.dt);
  const speed = speedMetersPerSecond(input.currentPosition, input.previousPosition, dt);
  const controlled = input.playerId === input.controlledPlayerId;
  const actorEvent = actorEventForPlayer(input.lastEvent, input.playerId);
  const bufferedActionKind = bufferedKindForPlayer(
    input.bufferedAction,
    input.playerId,
    input.controlledPlayerId,
  );

  let motion = deriveCharacterMotion({
    phase: input.phase,
    speed,
    lastEvent: actorEvent,
    bufferedActionKind,
    controlled,
  });

  // Team phase fallbacks belong only to the player with that role. This keeps
  // generic phase rules from making every teammate perform the same action.
  if (motion === 'SET' && input.playerId !== 'home-1' && actorEvent?.type !== 'SET') {
    motion = speed >= 0.25 ? 'RUN' : 'READY';
  }
  if ((motion === 'APPROACH' || motion === 'JUMP') && input.playerId !== 'home-0') {
    motion = speed >= 0.25 ? 'RUN' : 'READY';
  }

  const motionAge = motion === input.previousMotion
    ? Math.max(0, input.previousMotionAge) + dt
    : 0;

  return {
    motion,
    motionAge,
    normalizedTime: normalizePoseTime(motion, motionAge),
    speed,
  };
}
