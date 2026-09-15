import type { V3RallyPhase } from '../types';

export type V3RallyEvent =
  | 'PREPARE_RECEIVE'
  | 'RECEIVE_CONTACT'
  | 'SET_CONTACT'
  | 'JUMP'
  | 'ATTACK_CONTACT';

const TRANSITIONS: Partial<Record<V3RallyPhase, Partial<Record<V3RallyEvent, V3RallyPhase>>>> = {
  DEFENSE_READ: { PREPARE_RECEIVE: 'RECEIVE_PREP' },
  RECEIVE_PREP: { RECEIVE_CONTACT: 'SET_BUILDUP' },
  SET_BUILDUP: { SET_CONTACT: 'ATTACK_APPROACH' },
  ATTACK_APPROACH: { JUMP: 'ATTACK_AIRBORNE' },
  ATTACK_AIRBORNE: { ATTACK_CONTACT: 'OPPONENT_DEFENSE' },
};

export function advanceRallyPhase(phase: V3RallyPhase, event: V3RallyEvent): V3RallyPhase {
  return TRANSITIONS[phase]?.[event] ?? phase;
}

export type { V3RallyPhase } from '../types';
