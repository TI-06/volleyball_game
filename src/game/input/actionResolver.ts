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

function isCurrentServer(state: MatchState, player: PlayerState): boolean {
  if (state.rally.servingSide !== player.side) {
    return false;
  }

  const sidePlayers = state.players.filter((candidate) => candidate.side === player.side);
  const server = sidePlayers[state.rally.serverIndex[player.side] % sidePlayers.length];
  return server?.id === player.id;
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

  if (player.isAirborne) {
    if (nearNet && !ownSide && ballHigh && distance <= 2.1) {
      return 'BLOCK';
    }
    if (ownSide && ballHigh && distance <= 2.2) {
      return 'SPIKE';
    }
    return null;
  }

  if (nearNet && !ownSide && ballHigh && distance <= 2.8) {
    return 'BLOCK';
  }

  if (ownSide && ballDescending) {
    if (distance <= 1.65) {
      return 'RECEIVE';
    }
    if (distance <= 3.4) {
      return 'DIVE';
    }
  }

  if (player.role === 'SETTER' && ownSide && state.ball.position.y >= 0.9 && distance <= 2.25) {
    return 'SET';
  }

  const lastTouchWasTeammate = state.ball.lastTouchedBy?.startsWith(`${player.side}-`) ?? false;
  if (!player.isAirborne && lastTouchWasTeammate && state.ball.velocity.y > 0 && distance <= 3.2) {
    return 'JUMP';
  }

  return null;
}
