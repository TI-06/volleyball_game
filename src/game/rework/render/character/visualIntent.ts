import type { MatchState, PlayerState, TeamSide } from '../../../core/types';
import type { ReworkEvent } from '../../types';

export type VisualIntent =
  | 'READY'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'MOVE_FORWARD'
  | 'MOVE_BACK'
  | 'RECEIVE'
  | 'SET'
  | 'SERVE'
  | 'SPIKE_APPROACH'
  | 'SPIKE_JUMP'
  | 'SPIKE_CONTACT'
  | 'BLOCK'
  | 'CELEBRATE'
  | 'FRUSTRATED';

export interface VisualIntentState {
  intent: VisualIntent;
  contactEvent: ReworkEvent | null;
}

const MOVE_THRESHOLD = 0.25;

function playerSideFromId(match: MatchState, actorId?: string): TeamSide | null {
  if (!actorId) return null;
  return match.players.find((player) => player.id === actorId)?.side ?? null;
}

function currentServer(match: MatchState): PlayerState | null {
  if (match.rally.phase !== 'SERVE_READY') return null;
  const side = match.rally.servingSide;
  const players = match.players.filter((player) => player.side === side);
  if (players.length === 0) return null;
  return players[match.rally.serverIndex[side] % players.length] ?? null;
}

function eventIntent(event: ReworkEvent): VisualIntent | null {
  if (event.type === 'RECEIVE') return 'RECEIVE';
  if (event.type === 'SET') return 'SET';
  if (event.type === 'SERVE') return 'SERVE';
  if (event.type === 'JUMP') return 'SPIKE_JUMP';
  if (event.type === 'SPIKE') return 'SPIKE_CONTACT';
  if (event.type === 'BLOCK') return 'BLOCK';
  return null;
}

function movementIntent(player: PlayerState): VisualIntent {
  const { x, z } = player.velocity;
  if (Math.abs(x) >= Math.abs(z) && Math.abs(x) > MOVE_THRESHOLD) {
    return x < 0 ? 'MOVE_LEFT' : 'MOVE_RIGHT';
  }
  if (Math.abs(z) > MOVE_THRESHOLD) {
    const towardNet = player.side === 'home' ? z > 0 : z < 0;
    return towardNet ? 'MOVE_FORWARD' : 'MOVE_BACK';
  }
  return 'READY';
}

export function resolveVisualIntent(
  match: MatchState,
  player: PlayerState,
  latestEvent: ReworkEvent | null,
): VisualIntentState {
  if (
    (match.rally.phase === 'POINT' || match.rally.phase === 'MATCH_OVER') &&
    match.rally.lastPointWinner
  ) {
    return {
      intent: match.rally.lastPointWinner === player.side ? 'CELEBRATE' : 'FRUSTRATED',
      contactEvent: null,
    };
  }

  if (latestEvent?.actorId === player.id) {
    const mapped = eventIntent(latestEvent);
    if (mapped) {
      return { intent: mapped, contactEvent: latestEvent };
    }
  }

  if (player.isAirborne) {
    return { intent: 'SPIKE_JUMP', contactEvent: null };
  }

  if (
    latestEvent?.type === 'SET' &&
    latestEvent.actorId !== player.id &&
    player.role === 'ACE' &&
    playerSideFromId(match, latestEvent.actorId) === player.side
  ) {
    return { intent: 'SPIKE_APPROACH', contactEvent: null };
  }

  if (currentServer(match)?.id === player.id) {
    return { intent: 'SERVE', contactEvent: null };
  }

  return { intent: movementIntent(player), contactEvent: null };
}
