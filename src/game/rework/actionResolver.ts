import type { MatchState, PlayerState } from '../core/types';
import { chooseHomeReceiveOwner } from './receiveOwnership';
import type { ReworkActionLabel } from './types';

const FOCUS_PLAYER_ID = 'home-0';
const MIN_SPIKE_PLAYER_HEIGHT = 0.28;
const MIN_ATTACK_PLAYER_Z = -2.2;
const MIN_ATTACK_BALL_Z = -2.4;
const MAX_ATTACK_JUMP_DISTANCE = 1.8;
const MAX_SPIKE_CONTACT_DISTANCE = 1.15;

export interface ReworkActionSlots {
  play: ReworkActionLabel;
  power: ReworkActionLabel;
}

function distanceXZ(player: PlayerState, x: number, z: number): number {
  return Math.hypot(player.position.x - x, player.position.z - z);
}

function currentHomeServer(state: MatchState): PlayerState | null {
  if (state.rally.phase !== 'SERVE_READY' || state.rally.servingSide !== 'home') {
    return null;
  }
  const home = state.players.filter((player) => player.side === 'home');
  return home[state.rally.serverIndex.home % home.length] ?? null;
}

function lastTouchByHome(state: MatchState): boolean {
  return state.ball.lastTouchedBy?.startsWith('home-') ?? false;
}

function isFirstTouchContact(state: MatchState): boolean {
  return state.ball.lastContact === 'RECEIVE' || state.ball.lastContact === 'DIVE' || state.ball.lastContact === 'BLOCK';
}

export function resolveReworkActions(state: MatchState): ReworkActionSlots {
  const none: ReworkActionSlots = { play: 'NONE', power: 'NONE' };
  if (state.winner || state.rally.phase === 'POINT' || state.rally.phase === 'MATCH_OVER') {
    return none;
  }

  const focus = state.players.find((player) => player.id === FOCUS_PLAYER_ID);
  if (!focus) return none;

  if (state.rally.phase === 'SERVE_READY') {
    return currentHomeServer(state)?.id === focus.id
      ? { play: 'NONE', power: 'SERVE' }
      : none;
  }

  if (state.rally.phase !== 'RALLY' && state.rally.phase !== 'SERVING') {
    return none;
  }

  const { ball } = state;
  const distance = distanceXZ(focus, ball.position.x, ball.position.z);
  const ownSide = ball.position.z <= 0;
  const teammateTouched = lastTouchByHome(state);
  const otherTeammateTouched = teammateTouched && ball.lastTouchedBy !== focus.id;

  if (
    !focus.isAirborne &&
    !teammateTouched &&
    ownSide &&
    ball.velocity.z < -0.05 &&
    ball.velocity.y < 0.8 &&
    ball.position.y <= 2.5 &&
    distance <= 2.5 &&
    chooseHomeReceiveOwner(state) === focus.id
  ) {
    return { play: 'RECEIVE', power: 'NONE' };
  }

  if (
    !focus.isAirborne &&
    otherTeammateTouched &&
    isFirstTouchContact(state) &&
    ownSide &&
    ball.position.y >= 0.9 &&
    distance <= 1.9
  ) {
    return { play: 'SET', power: 'NONE' };
  }

  if (
    ball.lastContact === 'SET' &&
    otherTeammateTouched &&
    ownSide &&
    ball.position.y >= 2.0 &&
    ball.position.z >= MIN_ATTACK_BALL_Z &&
    focus.position.z >= MIN_ATTACK_PLAYER_Z
  ) {
    if (!focus.isAirborne) {
      return distance <= MAX_ATTACK_JUMP_DISTANCE
        ? { play: 'NONE', power: 'JUMP' }
        : none;
    }
    return focus.position.y >= MIN_SPIKE_PLAYER_HEIGHT && distance <= MAX_SPIKE_CONTACT_DISTANCE
      ? { play: 'NONE', power: 'SPIKE' }
      : none;
  }

  if (
    !focus.isAirborne &&
    ball.lastContact === 'SET' &&
    (ball.lastTouchedBy?.startsWith('away-') ?? false) &&
    focus.position.z >= -1.8 &&
    ball.position.z >= 0 &&
    ball.position.y >= 2.0 &&
    Math.abs(focus.position.x - ball.position.x) <= 2.2
  ) {
    return { play: 'NONE', power: 'BLOCK_READY' };
  }

  return none;
}
