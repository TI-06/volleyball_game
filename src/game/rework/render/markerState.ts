import { predictLanding } from '../../ball/ballPhysics';
import type { MatchState, PlayerState, Vec3 } from '../../core/types';
import { chooseHomeReceiveOwner } from '../receiveOwnership';
import { decideTeammateRoles } from '../teammateAI';
import { getReworkServePreviewTarget, type ReworkServePreviewTarget } from '../serveAim';
import type { ReworkSwipe } from '../types';

export type ReworkApproachStage = 'PREP' | 'GO';

export interface ReworkMarkerState {
  focusedPlayerId: string;
  receiveOwnerId: string | null;
  receiveOwnerPosition: Vec3 | null;
  receiveLanding: Vec3 | null;
  serveTarget: ReworkServePreviewTarget | null;
  setterId: string | null;
  setterPosition: Vec3 | null;
  setterTarget: Vec3 | null;
  approach: Vec3 | null;
  approachStage: ReworkApproachStage | null;
  attackLanes: Vec3[];
  blockTarget: Vec3 | null;
}

const ATTACK_ZONE_Z = -2.2;
const APPROACH_PREP_Z = -2.65;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function emptyMarkers(focusPlayerId: string): ReworkMarkerState {
  return {
    focusedPlayerId: focusPlayerId,
    receiveOwnerId: null,
    receiveOwnerPosition: null,
    receiveLanding: null,
    serveTarget: null,
    setterId: null,
    setterPosition: null,
    setterTarget: null,
    approach: null,
    approachStage: null,
    attackLanes: [],
    blockTarget: null,
  };
}

function teammateSet(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'SET' &&
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false)
  );
}

function firstTouchByHome(state: MatchState): boolean {
  return (
    state.ball.inPlay &&
    (state.ball.lastContact === 'RECEIVE' ||
      state.ball.lastContact === 'DIVE' ||
      state.ball.lastContact === 'BLOCK') &&
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false)
  );
}

function opponentSet(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'SET' &&
    (state.ball.lastTouchedBy?.startsWith('away-') ?? false)
  );
}

function incomingOpponentBall(state: MatchState): boolean {
  return (
    state.ball.inPlay &&
    (state.ball.lastTouchedBy?.startsWith('away-') ?? false) &&
    (state.ball.lastContact === 'SERVE' || state.ball.lastContact === 'SPIKE')
  );
}

function currentServer(state: MatchState): PlayerState | null {
  if (state.rally.phase !== 'SERVE_READY') return null;
  const side = state.rally.servingSide;
  const players = state.players.filter((player) => player.side === side);
  if (players.length === 0) return null;
  return players[state.rally.serverIndex[side] % players.length] ?? null;
}

function receiveOwnerPosition(state: MatchState, ownerId: string | null): Vec3 | null {
  if (!ownerId) return null;
  const owner = state.players.find((player) => player.id === ownerId);
  return owner ? { x: owner.position.x, y: 0.03, z: owner.position.z } : null;
}

function setterGuidance(
  state: MatchState,
): { setterId: string; setterPosition: Vec3; setterTarget: Vec3 } | null {
  const decision = decideTeammateRoles(state).find((candidate) => candidate.role === 'SET');
  if (!decision) return null;
  const setter = state.players.find((player) => player.id === decision.playerId);
  if (!setter) return null;

  return {
    setterId: setter.id,
    setterPosition: { x: setter.position.x, y: 0.03, z: setter.position.z },
    setterTarget: {
      x: clamp(decision.target.x, -3.4, 3.4),
      y: 0.03,
      z: clamp(decision.target.z, -4.2, -1.05),
    },
  };
}

function blockTarget(state: MatchState): Vec3 | null {
  if (!opponentSet(state)) return null;
  const attackers = state.players
    .filter((player) => player.side === 'away' && (player.role === 'ACE' || player.role === 'MIDDLE'))
    .sort((a, b) => {
      const aDistance = Math.hypot(a.position.x - state.ball.position.x, a.position.z - state.ball.position.z);
      const bDistance = Math.hypot(b.position.x - state.ball.position.x, b.position.z - state.ball.position.z);
      return aDistance - bDistance;
    });
  const attacker = attackers[0];
  return attacker
    ? { x: attacker.position.x, y: 0.03, z: 0.45 }
    : { x: state.ball.position.x, y: 0.03, z: 0.45 };
}

export function getReworkMarkerState(
  state: MatchState,
  focusPlayerId: string,
  serveAim: ReworkSwipe | null = null,
): ReworkMarkerState {
  const empty = emptyMarkers(focusPlayerId);
  if (state.rally.phase === 'POINT' || state.rally.phase === 'MATCH_OVER') {
    return empty;
  }

  const focus = state.players.find((player) => player.id === focusPlayerId);
  if (!focus) return empty;

  const server = currentServer(state);
  if (server?.id === focusPlayerId) {
    return {
      ...empty,
      serveTarget: getReworkServePreviewTarget(serveAim),
    };
  }

  if (incomingOpponentBall(state)) {
    const ownerId = chooseHomeReceiveOwner(state);
    if (ownerId) {
      const landing = predictLanding(state.ball);
      return {
        ...empty,
        receiveOwnerId: ownerId,
        receiveOwnerPosition: receiveOwnerPosition(state, ownerId),
        receiveLanding:
          ownerId === focusPlayerId
            ? { x: landing.x, y: 0.025, z: landing.z }
            : null,
      };
    }
  }

  if (firstTouchByHome(state)) {
    const setter = setterGuidance(state);
    if (setter) {
      return {
        ...empty,
        ...setter,
        approach: {
          x: clamp(focus.position.x, -3.1, 3.1),
          y: 0.025,
          z: APPROACH_PREP_Z,
        },
        approachStage: 'PREP',
      };
    }
  }

  if (teammateSet(state)) {
    const targetX = Math.max(-3.1, Math.min(3.1, state.ball.position.x));
    const inAttackZone = focus.position.z >= ATTACK_ZONE_Z;
    return {
      ...empty,
      approach: inAttackZone ? null : { x: targetX, y: 0.025, z: -1.05 },
      approachStage: 'GO',
      attackLanes: inAttackZone
        ? [
            { x: -3.35, y: 0.025, z: 6.7 },
            { x: 0, y: 0.025, z: 6.9 },
            { x: 3.35, y: 0.025, z: 6.7 },
          ]
        : [],
    };
  }

  return {
    ...empty,
    blockTarget: blockTarget(state),
  };
}
