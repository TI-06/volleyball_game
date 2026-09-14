import { predictLanding } from '../../ball/ballPhysics';
import type { MatchState, PlayerState, Vec3 } from '../../core/types';
import { chooseHomeReceiveOwner } from '../receiveOwnership';
import { getReworkServePreviewTarget, type ReworkServePreviewTarget } from '../serveAim';
import type { ReworkSwipe } from '../types';

export interface ReworkMarkerState {
  focusedPlayerId: string;
  receiveOwnerId: string | null;
  receiveOwnerPosition: Vec3 | null;
  receiveLanding: Vec3 | null;
  serveTarget: ReworkServePreviewTarget | null;
  approach: Vec3 | null;
  attackLanes: Vec3[];
  blockTarget: Vec3 | null;
}

const ATTACK_ZONE_Z = -2.2;

function emptyMarkers(focusPlayerId: string): ReworkMarkerState {
  return {
    focusedPlayerId: focusPlayerId,
    receiveOwnerId: null,
    receiveOwnerPosition: null,
    receiveLanding: null,
    serveTarget: null,
    approach: null,
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

  if (teammateSet(state)) {
    const targetX = Math.max(-3.1, Math.min(3.1, state.ball.position.x));
    const inAttackZone = focus.position.z >= ATTACK_ZONE_Z;
    return {
      ...empty,
      approach: inAttackZone ? null : { x: targetX, y: 0.025, z: -1.05 },
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
