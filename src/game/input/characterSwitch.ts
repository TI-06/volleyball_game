import { predictLanding } from '../ball/ballPhysics';
import type { MatchState, PlayerState } from '../core/types';
import type { ManualSwitchResult, SwitchDecision, SwitchMode } from './inputTypes';

const AUTO_WARNING_LEAD = 0.35;

function distanceXZ(player: PlayerState, x: number, z: number): number {
  return Math.hypot(player.position.x - x, player.position.z - z);
}

function homePlayers(state: MatchState): PlayerState[] {
  return state.players.filter((player) => player.side === 'home');
}

function serveCandidate(state: MatchState): PlayerState | null {
  if (state.rally.phase !== 'SERVE_READY' || state.rally.servingSide !== 'home') {
    return null;
  }

  const players = homePlayers(state);
  return players[state.rally.serverIndex.home % players.length] ?? null;
}

function offensiveCandidate(state: MatchState): PlayerState | null {
  const lastTouchedBy = state.ball.lastTouchedBy;
  if (!lastTouchedBy?.startsWith('home-') || state.ball.velocity.y < 0) {
    return null;
  }

  const players = homePlayers(state);
  const lastToucher = players.find((player) => player.id === lastTouchedBy);
  if (!lastToucher) return null;

  if (lastToucher.role !== 'SETTER') {
    return players.find((player) => player.role === 'SETTER') ?? null;
  }

  return (
    [...players]
      .filter((player) => player.role === 'ACE' || player.role === 'MIDDLE')
      .sort((a, b) => Math.abs(a.position.z) - Math.abs(b.position.z))[0] ?? null
  );
}

function targetCandidate(state: MatchState): PlayerState | null {
  const landing = predictLanding(state.ball);
  const players = homePlayers(state);
  if (players.length === 0) {
    return null;
  }

  return [...players].sort((a, b) => {
    const aRoleBonus = a.role === 'LIBERO' ? -0.3 : 0;
    const bRoleBonus = b.role === 'LIBERO' ? -0.3 : 0;
    const aDistance = distanceXZ(a, landing.x, landing.z) + aRoleBonus;
    const bDistance = distanceXZ(b, landing.x, landing.z) + bRoleBonus;
    return aDistance - bDistance;
  })[0] ?? null;
}

export function getSwitchCandidate(
  state: MatchState,
  options: {
    mode: SwitchMode;
    currentPlayerId: string;
    strongMovement?: boolean;
  },
): SwitchDecision {
  if (options.mode === 'MANUAL') {
    return { playerId: null, warningLead: 0, reason: 'MANUAL_MODE' };
  }

  const serve = serveCandidate(state);
  const offense = offensiveCandidate(state);
  const candidate = serve ?? offense ?? targetCandidate(state);
  if (!candidate) {
    return { playerId: null, warningLead: AUTO_WARNING_LEAD, reason: 'NO_CANDIDATE' };
  }

  if (candidate.id === options.currentPlayerId) {
    return { playerId: candidate.id, warningLead: AUTO_WARNING_LEAD, reason: 'CURRENT_PLAYER' };
  }

  if (options.mode === 'STANDARD' && options.strongMovement) {
    return { playerId: null, warningLead: AUTO_WARNING_LEAD, reason: 'HELD_BY_INPUT' };
  }

  return {
    playerId: candidate.id,
    warningLead: AUTO_WARNING_LEAD,
    reason: serve ? 'SERVE' : 'BALL_TARGET',
  };
}

export function requestManualSwitch(
  state: MatchState,
  currentPlayerId: string,
  requestedPlayerId: string,
): ManualSwitchResult {
  const requested = state.players.find(
    (player) => player.id === requestedPlayerId && player.side === 'home',
  );
  const current = state.players.find((player) => player.id === currentPlayerId);

  if (!requested || !current || requested.id === current.id) {
    return { activePlayerId: currentPlayerId, queuedPlayerId: null };
  }

  const cannotCancel = current.isAirborne || current.actionLockUntil > state.time;
  if (cannotCancel) {
    return { activePlayerId: currentPlayerId, queuedPlayerId: requested.id };
  }

  return { activePlayerId: requested.id, queuedPlayerId: null };
}
