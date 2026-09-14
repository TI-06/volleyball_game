import { predictLanding } from '../ball/ballPhysics';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import type { MatchState, PlayerState, Vec3 } from '../core/types';

export type AllyAIState = 'RECEIVE' | 'SET' | 'APPROACH' | 'BLOCK' | 'COVER' | 'RECOVER';

export interface AllyIntent {
  state: AllyAIState;
  target: Vec3;
}

const SETTER_ROLE_BONUS = 16;
const SECOND_TOUCH_DISTANCE_WEIGHT = 8;
const HOME_SET_ZONE: Vec3 = { x: 0, y: 0, z: -1.1 };

function distanceXZ(player: PlayerState, target: Vec3): number {
  return Math.hypot(player.position.x - target.x, player.position.z - target.z);
}

function setAbility(player: PlayerState): number {
  return STARTER_ROSTER[player.characterId as CharacterId]?.abilities.set ?? 0;
}

function secondTouchScore(player: PlayerState, target: Vec3): number {
  return (
    setAbility(player) +
    (player.role === 'SETTER' ? SETTER_ROLE_BONUS : 0) -
    distanceXZ(player, target) * SECOND_TOUCH_DISTANCE_WEIGHT
  );
}

function basePosition(player: PlayerState): Vec3 {
  const z = player.role === 'SETTER' ? -2.4 : player.role === 'LIBERO' ? -5.8 : -3.8;
  return { x: player.position.x, y: 0, z };
}

function closestHomePlayer(state: MatchState, target: Vec3): PlayerState | null {
  const players = state.players.filter((player) => player.side === 'home');
  return [...players].sort((a, b) => {
    const aBias = a.role === 'LIBERO' ? -0.28 : 0;
    const bBias = b.role === 'LIBERO' ? -0.28 : 0;
    return distanceXZ(a, target) + aBias - (distanceXZ(b, target) + bBias);
  })[0] ?? null;
}

function isFirstTouchContact(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'RECEIVE' ||
    state.ball.lastContact === 'DIVE' ||
    state.ball.lastContact === 'BLOCK'
  );
}

function secondTouchPlayer(
  state: MatchState,
  lastToucherId: string,
  target: Vec3 = state.ball.position,
): PlayerState | null {
  return (
    [...state.players]
      .filter((player) => player.side === 'home' && player.id !== lastToucherId)
      .sort(
        (a, b) => secondTouchScore(b, target) - secondTouchScore(a, target),
      )[0] ?? null
  );
}

function projectedAttacker(state: MatchState, setterId: string): PlayerState | null {
  const target = predictLanding(state.ball);
  return (
    [...state.players]
      .filter((player) => player.side === 'home' && player.id !== setterId)
      .sort((a, b) => distanceXZ(a, target) - distanceXZ(b, target))[0] ?? null
  );
}

export function decideAllyIntent(state: MatchState, playerId: string): AllyIntent {
  const player = state.players.find((candidate) => candidate.id === playerId && candidate.side === 'home');
  if (!player) {
    return { state: 'RECOVER', target: { x: 0, y: 0, z: -4.5 } };
  }

  if (state.rally.phase === 'SERVE_READY' || state.rally.phase === 'POINT') {
    return { state: 'RECOVER', target: basePosition(player) };
  }

  const ballOnHomeSide = state.ball.position.z <= 0;
  const ballDescending = state.ball.velocity.y < 0;
  const landing = predictLanding(state.ball);
  const teammateTouched = state.ball.lastTouchedBy?.startsWith('home-') ?? false;

  if (ballOnHomeSide && ballDescending && !teammateTouched) {
    const receiver = closestHomePlayer(state, landing);
    if (receiver?.id === player.id) {
      return { state: 'RECEIVE', target: { ...landing, y: 0 } };
    }
    if (receiver) {
      const secondTouch = secondTouchPlayer(state, receiver.id, HOME_SET_ZONE);
      if (secondTouch?.id === player.id) {
        return { state: 'SET', target: HOME_SET_ZONE };
      }
    }
    return { state: 'COVER', target: basePosition(player) };
  }

  if (ballOnHomeSide && teammateTouched) {
    const lastToucherId = state.ball.lastTouchedBy!;

    if (isFirstTouchContact(state)) {
      const setter = secondTouchPlayer(state, lastToucherId);
      if (setter?.id === player.id) {
        return { state: 'SET', target: HOME_SET_ZONE };
      }
      if (player.id !== lastToucherId && player.role === 'ACE') {
        return {
          state: 'APPROACH',
          target: { x: player.position.x, y: 0, z: -0.85 },
        };
      }
      return { state: 'COVER', target: { x: 0, y: 0, z: -3.4 } };
    }

    if (state.ball.lastContact === 'SET') {
      const attacker = projectedAttacker(state, lastToucherId);
      if (attacker?.id === player.id) {
        return {
          state: 'APPROACH',
          target: { x: landing.x, y: 0, z: -0.85 },
        };
      }
      return { state: 'COVER', target: { x: 0, y: 0, z: -3.4 } };
    }

    return { state: 'COVER', target: basePosition(player) };
  }

  if (!ballOnHomeSide) {
    if (state.ball.lastContact === 'SERVE') {
      return { state: 'COVER', target: basePosition(player) };
    }
    if (
      (state.ball.lastContact === 'SET' || state.ball.lastContact === 'SPIKE') &&
      (player.role === 'ACE' || player.role === 'MIDDLE') &&
      Math.abs(player.position.z) < 3.2
    ) {
      return {
        state: 'BLOCK',
        target: { x: state.ball.position.x, y: 0, z: -0.55 },
      };
    }
    return { state: 'COVER', target: basePosition(player) };
  }

  return { state: 'RECOVER', target: basePosition(player) };
}
