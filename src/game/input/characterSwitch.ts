import { predictLanding } from '../ball/ballPhysics';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import type { MatchState, PlayerState } from '../core/types';
import type { ManualSwitchResult, SwitchDecision, SwitchMode } from './inputTypes';

const AUTO_WARNING_LEAD = 0.35;
const ATTACK_HANDOFF_LEAD = 0.08;
const SETTER_ROLE_BONUS = 16;
const SECOND_TOUCH_DISTANCE_WEIGHT = 8;

function distanceXZ(player: PlayerState, x: number, z: number): number {
  return Math.hypot(player.position.x - x, player.position.z - z);
}

function setAbility(player: PlayerState): number {
  return STARTER_ROSTER[player.characterId as CharacterId]?.abilities.set ?? 0;
}

function secondTouchScore(player: PlayerState, x: number, z: number): number {
  return (
    setAbility(player) +
    (player.role === 'SETTER' ? SETTER_ROLE_BONUS : 0) -
    distanceXZ(player, x, z) * SECOND_TOUCH_DISTANCE_WEIGHT
  );
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

function isFirstTouchContact(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'RECEIVE' ||
    state.ball.lastContact === 'DIVE' ||
    state.ball.lastContact === 'BLOCK'
  );
}

function secondTouchCandidate(
  state: MatchState,
  lastToucher: PlayerState,
): PlayerState | null {
  const target = state.ball.position;
  return (
    [...homePlayers(state)]
      .filter((player) => player.id !== lastToucher.id)
      .sort(
        (a, b) =>
          secondTouchScore(b, target.x, target.z) -
          secondTouchScore(a, target.x, target.z),
      )[0] ?? null
  );
}

function projectedAttacker(state: MatchState, setterId: string): PlayerState | null {
  const target = predictLanding(state.ball);
  return (
    [...homePlayers(state)]
      .filter((player) => player.id !== setterId)
      .sort(
        (a, b) =>
          distanceXZ(a, target.x, target.z) -
          distanceXZ(b, target.x, target.z),
      )[0] ?? null
  );
}

function offensiveCandidate(state: MatchState): PlayerState | null {
  const lastTouchedBy = state.ball.lastTouchedBy;
  if (!lastTouchedBy?.startsWith('home-')) {
    return null;
  }

  const players = homePlayers(state);
  const lastToucher = players.find((player) => player.id === lastTouchedBy);
  if (!lastToucher) return null;

  if (isFirstTouchContact(state)) {
    return secondTouchCandidate(state, lastToucher);
  }

  if (state.ball.lastContact === 'SET') {
    return projectedAttacker(state, lastToucher.id);
  }

  return null;
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

function offenseLead(state: MatchState, offense: PlayerState | null): number {
  if (!offense) return AUTO_WARNING_LEAD;
  return state.ball.lastContact === 'SET'
    ? ATTACK_HANDOFF_LEAD
    : AUTO_WARNING_LEAD;
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

  if (state.rally.phase === 'POINT' || state.rally.phase === 'MATCH_OVER') {
    return { playerId: null, warningLead: 0, reason: 'NO_CANDIDATE' };
  }

  if (state.rally.phase === 'SERVE_READY' && state.rally.servingSide === 'away') {
    return { playerId: null, warningLead: AUTO_WARNING_LEAD, reason: 'NO_CANDIDATE' };
  }

  const serve = serveCandidate(state);
  const offense = offensiveCandidate(state);
  const candidate = serve ?? offense ?? targetCandidate(state);
  const warningLead = serve ? AUTO_WARNING_LEAD : offenseLead(state, offense);

  if (!candidate) {
    return { playerId: null, warningLead: AUTO_WARNING_LEAD, reason: 'NO_CANDIDATE' };
  }

  if (candidate.id === options.currentPlayerId) {
    return { playerId: candidate.id, warningLead, reason: 'CURRENT_PLAYER' };
  }

  if (options.mode === 'STANDARD' && options.strongMovement) {
    return { playerId: null, warningLead, reason: 'HELD_BY_INPUT' };
  }

  return {
    playerId: candidate.id,
    warningLead,
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
