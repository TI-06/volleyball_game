import type { MatchState, PlayerState } from '../core/types';
import type { ActionKind } from './inputTypes';

function distanceXZ(player: PlayerState, x: number, z: number): number {
  return Math.hypot(player.position.x - x, player.position.z - z);
}

function isBallOnSide(state: MatchState, player: PlayerState): boolean {
  if (player.side === 'home') {
    return state.ball.position.z <= 0;
  }
  return state.ball.position.z >= 0;
}

function isBallTravelingTowardPlayer(state: MatchState, player: PlayerState): boolean {
  return player.side === 'home' ? state.ball.velocity.z < -0.05 : state.ball.velocity.z > 0.05;
}

function isCurrentServer(state: MatchState, player: PlayerState): boolean {
  if (state.rally.servingSide !== player.side) {
    return false;
  }

  const sidePlayers = state.players.filter((candidate) => candidate.side === player.side);
  const server = sidePlayers[state.rally.serverIndex[player.side] % sidePlayers.length];
  return server?.id === player.id;
}

function isFirstTouchContact(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'RECEIVE' ||
    state.ball.lastContact === 'DIVE' ||
    state.ball.lastContact === 'BLOCK'
  );
}

export function resolveAction(
  state: MatchState,
  controlledPlayerId: string,
): ActionKind | null {
  const player = state.players.find((candidate) => candidate.id === controlledPlayerId);
  if (!player || state.winner || state.rally.phase === 'POINT' || state.rally.phase === 'MATCH_OVER') {
    return null;
  }

  if (state.rally.phase === 'SERVE_READY') {
    return isCurrentServer(state, player) ? 'SERVE' : null;
  }

  if (player.actionLockUntil > state.time) {
    return null;
  }

  const distance = distanceXZ(player, state.ball.position.x, state.ball.position.z);
  const nearNet = Math.abs(player.position.z) <= 1.7;
  const ballHigh = state.ball.position.y >= 2.1;
  const ballDescending = state.ball.velocity.y < 0;
  const ownSide = isBallOnSide(state, player);
  const incoming = isBallTravelingTowardPlayer(state, player);
  const blockableAttack = state.ball.lastContact === 'SPIKE';
  const canPrepareBlock = state.ball.lastContact === 'SET' || blockableAttack;
  const lastTouchWasTeammate = state.ball.lastTouchedBy?.startsWith(`${player.side}-`) ?? false;
  const lastTouchWasOtherTeammate =
    lastTouchWasTeammate && state.ball.lastTouchedBy !== player.id;

  if (player.isAirborne) {
    if (
      nearNet &&
      !ownSide &&
      incoming &&
      ballHigh &&
      blockableAttack &&
      distance <= 2.1
    ) {
      return 'BLOCK';
    }
    if (ownSide && lastTouchWasOtherTeammate && state.ball.lastContact === 'SET' && ballHigh && distance <= 2.2) {
      return 'SPIKE';
    }
    return null;
  }

  if (nearNet && !ownSide && incoming && ballHigh && canPrepareBlock && distance <= 2.8) {
    return 'JUMP';
  }

  if (ownSide && incoming && ballDescending && !lastTouchWasTeammate) {
    if (distance <= 1.65) {
      return 'RECEIVE';
    }
    if (distance <= 3.4) {
      return 'DIVE';
    }
  }

  const secondTouchAvailable =
    ownSide &&
    lastTouchWasOtherTeammate &&
    isFirstTouchContact(state) &&
    state.ball.position.y >= 0.9;
  const setReach = player.role === 'SETTER' ? 2.25 : 1.85;
  if (secondTouchAvailable && distance <= setReach) {
    return 'SET';
  }

  if (
    ownSide &&
    !player.isAirborne &&
    lastTouchWasOtherTeammate &&
    state.ball.lastContact === 'SET' &&
    ballHigh &&
    distance <= 3.2
  ) {
    return 'JUMP';
  }

  return null;
}
