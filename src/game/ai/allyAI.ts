import { predictLanding } from '../ball/ballPhysics';
import type { MatchState, PlayerState, Vec3 } from '../core/types';

export type AllyAIState = 'RECEIVE' | 'SET' | 'APPROACH' | 'BLOCK' | 'COVER' | 'RECOVER';

export interface AllyIntent {
  state: AllyAIState;
  target: Vec3;
}

function distanceXZ(player: PlayerState, target: Vec3): number {
  return Math.hypot(player.position.x - target.x, player.position.z - target.z);
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
    if (player.role === 'SETTER') {
      return { state: 'SET', target: { x: 0, y: 0, z: -1.25 } };
    }
    return { state: 'COVER', target: basePosition(player) };
  }

  if (ballOnHomeSide && teammateTouched) {
    const lastToucher = state.players.find((candidate) => candidate.id === state.ball.lastTouchedBy);

    if (lastToucher?.role === 'SETTER') {
      const attacker = projectedAttacker(state, lastToucher.id);
      if (attacker?.id === player.id) {
        return {
          state: 'APPROACH',
          target: { x: landing.x, y: 0, z: -0.85 },
        };
      }
      return { state: 'COVER', target: { x: 0, y: 0, z: -3.4 } };
    }

    if (player.role === 'SETTER' && state.ball.lastTouchedBy !== player.id) {
      return { state: 'SET', target: { x: 0, y: 0, z: -1.1 } };
    }
    if (player.role === 'ACE') {
      return {
        state: 'APPROACH',
        target: { x: player.position.x, y: 0, z: -0.85 },
      };
    }
    return { state: 'COVER', target: { x: 0, y: 0, z: -3.4 } };
  }

  if (!ballOnHomeSide) {
    if ((player.role === 'ACE' || player.role === 'MIDDLE') && Math.abs(player.position.z) < 3.2) {
      return {
        state: 'BLOCK',
        target: { x: state.ball.position.x, y: 0, z: -0.55 },
      };
    }
    return { state: 'COVER', target: basePosition(player) };
  }

  return { state: 'RECOVER', target: basePosition(player) };
}
