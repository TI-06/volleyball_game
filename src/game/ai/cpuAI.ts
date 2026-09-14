import type { AttackIntent } from '../actions/spike';
import { predictLanding } from '../ball/ballPhysics';
import { getReadAssist } from '../characters/abilities';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import type { MatchState, PlayerState, Vec3 } from '../core/types';
import type { DifficultyProfile } from './difficulty';
import { dominantDefense, type TendencyHistory } from './tendencyTracker';

export type CpuAIState = 'SERVE' | 'RECEIVE' | 'SET' | 'APPROACH' | 'BLOCK' | 'COVER' | 'RECOVER';

export interface CpuIntent {
  state: CpuAIState;
  target: Vec3;
  attackIntent: AttackIntent | null;
  reactionDelay: number;
}

const BLOCK_READY_Z = 1.65;
const BLOCK_TARGET_Z = 0.55;

function hash01(seed: number, salt: string): number {
  let hash = seed >>> 0;
  for (let index = 0; index < salt.length; index += 1) {
    hash = Math.imul(hash ^ salt.charCodeAt(index), 16777619) >>> 0;
  }
  return hash / 0xffffffff;
}

function distanceXZ(player: PlayerState, target: Vec3): number {
  return Math.hypot(player.position.x - target.x, player.position.z - target.z);
}

function basePosition(player: PlayerState): Vec3 {
  const z = player.role === 'SETTER' ? 2.4 : 4.2;
  return { x: player.position.x, y: 0, z };
}

function characterFor(player: PlayerState) {
  return STARTER_ROSTER[player.characterId as CharacterId] ?? STARTER_ROSTER.shin;
}

function reactionDelay(
  state: MatchState,
  player: PlayerState | null,
  profile: DifficultyProfile,
): number {
  const playerId = player?.id ?? 'missing';
  const random = hash01(state.rngState, `${playerId}:${Math.floor(state.time * 4)}`);
  const base = profile.reactionDelay.min +
    (profile.reactionDelay.max - profile.reactionDelay.min) * random;
  if (!player) return base;
  const read = getReadAssist(characterFor(player));
  return Math.max(0.04, base + read.reactionBias * 0.45);
}

function closestAwayPlayer(state: MatchState, target: Vec3): PlayerState | null {
  return [...state.players]
    .filter((player) => player.side === 'away')
    .sort((a, b) => distanceXZ(a, target) - distanceXZ(b, target))[0] ?? null;
}

function chooseAttackIntent(
  state: MatchState,
  player: PlayerState,
  profile: DifficultyProfile,
  history: TendencyHistory,
): AttackIntent {
  if (profile.id === 'BEGINNER') return 'POWER';

  const home = state.players.filter((candidate) => candidate.side === 'home');
  const nearestBlocker = [...home]
    .filter((candidate) => Math.abs(candidate.position.z) <= 2.2)
    .sort((a, b) => Math.abs(a.position.x - player.position.x) - Math.abs(b.position.x - player.position.x))[0];
  const random = hash01(state.rngState, `attack:${player.id}:${state.score.home}:${state.score.away}`);

  if (profile.id === 'MASTER' && dominantDefense(history) === 'BLOCK' && random < profile.tendencyWeight) {
    return 'TIP';
  }

  if (profile.id === 'EXPERT' || profile.id === 'MASTER') {
    if (random < profile.tipChance) return 'TIP';
  }

  if (nearestBlocker && profile.blockerReadWeight > 0.4) {
    const blockerLeftOfAttacker = nearestBlocker.position.x < player.position.x;
    return blockerLeftOfAttacker ? 'LINE' : 'CROSS';
  }

  const leftDefenders = home.filter((candidate) => candidate.position.x < 0).length;
  const rightDefenders = home.length - leftDefenders;
  if (profile.openSpaceWeight >= 0.3 && leftDefenders !== rightDefenders) {
    return leftDefenders < rightDefenders ? 'CROSS' : 'LINE';
  }

  return random < 0.5 ? 'CROSS' : 'LINE';
}

export function decideCpuIntent(
  state: MatchState,
  playerId: string,
  profile: DifficultyProfile,
  history: TendencyHistory,
): CpuIntent {
  const player = state.players.find((candidate) => candidate.id === playerId && candidate.side === 'away') ?? null;
  const delay = reactionDelay(state, player, profile);

  if (!player) {
    return {
      state: 'RECOVER',
      target: { x: 0, y: 0, z: 4.5 },
      attackIntent: null,
      reactionDelay: delay,
    };
  }

  if (state.rally.phase === 'SERVE_READY' && state.rally.servingSide === 'away') {
    const away = state.players.filter((candidate) => candidate.side === 'away');
    const server = away[state.rally.serverIndex.away % away.length];
    if (server?.id === player.id) {
      return {
        state: 'SERVE',
        target: { x: player.position.x, y: 0, z: player.position.z },
        attackIntent: null,
        reactionDelay: delay,
      };
    }
  }

  if (state.rally.phase === 'POINT' || state.rally.phase === 'SERVE_READY') {
    return { state: 'RECOVER', target: basePosition(player), attackIntent: null, reactionDelay: delay };
  }

  const ballOnAwaySide = state.ball.position.z >= 0;
  const landing = predictLanding(state.ball);
  const teammateTouched = state.ball.lastTouchedBy?.startsWith('away-') ?? false;
  const opponentTouched = state.ball.lastTouchedBy?.startsWith('home-') ?? false;

  if (ballOnAwaySide && state.ball.velocity.y < 0 && !teammateTouched) {
    const receiver = closestAwayPlayer(state, landing);
    if (receiver?.id === player.id) {
      const read = getReadAssist(characterFor(player));
      const errorScale = profile.predictionError * read.predictionErrorScale;
      const errorX = (hash01(state.rngState, `px:${player.id}`) - 0.5) * errorScale;
      const errorZ = (hash01(state.rngState, `pz:${player.id}`) - 0.5) * errorScale;
      return {
        state: 'RECEIVE',
        target: { x: landing.x + errorX, y: 0, z: landing.z + errorZ },
        attackIntent: null,
        reactionDelay: delay,
      };
    }
    if (player.role === 'SETTER') {
      return {
        state: 'SET',
        target: { x: 0, y: 0, z: 1.2 },
        attackIntent: null,
        reactionDelay: delay,
      };
    }
    return { state: 'COVER', target: basePosition(player), attackIntent: null, reactionDelay: delay };
  }

  if (ballOnAwaySide && teammateTouched) {
    const lastToucher = state.players.find((candidate) => candidate.id === state.ball.lastTouchedBy);
    if (lastToucher?.role !== 'SETTER' && player.role === 'SETTER' && state.ball.lastTouchedBy !== player.id) {
      return {
        state: 'SET',
        target: { x: 0, y: 0, z: 1.05 },
        attackIntent: null,
        reactionDelay: delay,
      };
    }
    if (lastToucher?.role === 'SETTER' && (player.role === 'ACE' || player.role === 'MIDDLE')) {
      return {
        state: 'APPROACH',
        target: { x: player.position.x, y: 0, z: 0.85 },
        attackIntent: chooseAttackIntent(state, player, profile, history),
        reactionDelay: delay,
      };
    }
    return { state: 'COVER', target: basePosition(player), attackIntent: null, reactionDelay: delay };
  }

  if (!ballOnAwaySide && (player.role === 'ACE' || player.role === 'MIDDLE')) {
    if (!opponentTouched || state.ball.lastContact === 'SERVE') {
      return { state: 'COVER', target: basePosition(player), attackIntent: null, reactionDelay: delay };
    }
    const target = { x: state.ball.position.x, y: 0, z: BLOCK_TARGET_Z };
    return {
      state:
        state.ball.lastContact === 'SPIKE' && player.position.z <= BLOCK_READY_Z
          ? 'BLOCK'
          : 'APPROACH',
      target,
      attackIntent: null,
      reactionDelay: delay,
    };
  }

  return { state: 'COVER', target: basePosition(player), attackIntent: null, reactionDelay: delay };
}
