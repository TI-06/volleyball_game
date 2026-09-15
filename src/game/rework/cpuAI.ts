import type { AttackIntent } from '../actions/spike';
import { decideCpuIntent } from '../ai/cpuAI';
import { DIFFICULTY_PROFILES, type CpuDifficulty } from '../ai/difficulty';
import { createTendencyHistory } from '../ai/tendencyTracker';
import { predictLanding } from '../ball/ballPhysics';
import type { MatchState, Vec3 } from '../core/types';
import { isLandingInsideSide } from './courtLanding';
import type { ReworkCpuRole } from './types';

export interface ReworkCpuDecision {
  playerId: string;
  role: ReworkCpuRole;
  target: Vec3;
  attackIntent: AttackIntent | null;
  reactionDelay: number;
}

const EMPTY_HISTORY = createTendencyHistory();
const AWAY_ATTACK_CONTACT_Z = 0.72;
const CPU_BLOCK_READY_Z = 1.8;
const NET_DEFENDER_SPACING = 1.2;
const NET_DEFENDER_MIN_X = -3.6;
const NET_DEFENDER_MAX_X = 3.6;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapRole(state: ReturnType<typeof decideCpuIntent>['state']): ReworkCpuRole {
  return state === 'RECOVER' ? 'COVER' : state;
}

function projectedAwaySetTargetX(state: MatchState): number {
  const { ball } = state;
  if (Math.abs(ball.velocity.z) < 0.05) return ball.position.x;
  const time = (AWAY_ATTACK_CONTACT_Z - ball.position.z) / ball.velocity.z;
  const safeTime = Math.max(0, Math.min(1.2, time));
  return ball.position.x + ball.velocity.x * safeTime;
}

function keepSetTargetAttacker(
  state: MatchState,
  decisions: ReworkCpuDecision[],
): ReworkCpuDecision[] {
  const awaySet =
    state.ball.lastContact === 'SET' &&
    (state.ball.lastTouchedBy?.startsWith('away-') ?? false);
  if (!awaySet) return decisions;

  const approach = decisions.filter((decision) => decision.role === 'APPROACH');
  if (approach.length <= 1) return decisions;

  const targetX = projectedAwaySetTargetX(state);
  const selected = [...approach].sort((a, b) => {
    const aPlayer = state.players.find((player) => player.id === a.playerId);
    const bPlayer = state.players.find((player) => player.id === b.playerId);
    const aError = aPlayer ? Math.abs(aPlayer.position.x - targetX) : Number.POSITIVE_INFINITY;
    const bError = bPlayer ? Math.abs(bPlayer.position.x - targetX) : Number.POSITIVE_INFINITY;
    return aError - bError;
  })[0];

  return decisions.filter(
    (decision) => decision.role !== 'APPROACH' || decision.playerId === selected?.playerId,
  );
}

function spreadNetDefenders(
  state: MatchState,
  decisions: ReworkCpuDecision[],
): ReworkCpuDecision[] {
  const defendingHomeAttack =
    state.ball.position.z < 0 &&
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false) &&
    state.ball.lastContact !== 'SERVE';
  if (!defendingHomeAttack) return decisions;

  const netDefenders = decisions
    .filter((decision) => {
      if (decision.role !== 'APPROACH' && decision.role !== 'BLOCK') return false;
      const player = state.players.find((candidate) => candidate.id === decision.playerId);
      return (
        player?.side === 'away' &&
        (player.role === 'ACE' || player.role === 'MIDDLE')
      );
    })
    .sort((a, b) => {
      const aPlayer = state.players.find((player) => player.id === a.playerId);
      const bPlayer = state.players.find((player) => player.id === b.playerId);
      const positionDelta = (aPlayer?.position.x ?? 0) - (bPlayer?.position.x ?? 0);
      return positionDelta !== 0 ? positionDelta : a.playerId.localeCompare(b.playerId);
    });

  if (netDefenders.length < 2) return decisions;

  const halfSpan = (NET_DEFENDER_SPACING * (netDefenders.length - 1)) / 2;
  const centerX = clamp(
    state.ball.position.x,
    NET_DEFENDER_MIN_X + halfSpan,
    NET_DEFENDER_MAX_X - halfSpan,
  );
  const targetXByPlayer = new Map(
    netDefenders.map((decision, index) => [
      decision.playerId,
      centerX + (index - (netDefenders.length - 1) / 2) * NET_DEFENDER_SPACING,
    ]),
  );

  return decisions.map((decision) => {
    const targetX = targetXByPlayer.get(decision.playerId);
    return targetX === undefined
      ? decision
      : { ...decision, target: { ...decision.target, x: targetX } };
  });
}

function requireNetApproachBeforeBlock(
  state: MatchState,
  decision: ReworkCpuDecision,
): ReworkCpuDecision {
  if (decision.role !== 'BLOCK') return decision;
  const player = state.players.find((candidate) => candidate.id === decision.playerId);
  if (!player || player.position.z <= CPU_BLOCK_READY_Z) return decision;

  return {
    ...decision,
    role: 'APPROACH',
    target: {
      x: decision.target.x,
      y: 0,
      z: 1.05,
    },
  };
}

function leavePredictedOutBall(
  state: MatchState,
  decision: ReworkCpuDecision,
): ReworkCpuDecision {
  if (decision.role !== 'RECEIVE') return decision;
  const incomingHomeBall =
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false) &&
    (state.ball.lastContact === 'SERVE' || state.ball.lastContact === 'SPIKE');
  if (!incomingHomeBall) return decision;

  const landing = predictLanding(state.ball);
  if (isLandingInsideSide(landing.x, landing.z, 'away')) return decision;

  const player = state.players.find((candidate) => candidate.id === decision.playerId);
  return {
    ...decision,
    role: 'COVER',
    target: player
      ? { x: player.position.x, y: 0, z: player.position.z }
      : decision.target,
  };
}

export function decideCpuRoles(
  state: MatchState,
  difficulty: CpuDifficulty,
): ReworkCpuDecision[] {
  const profile = DIFFICULTY_PROFILES[difficulty];
  const decisions = state.players
    .filter((player) => player.side === 'away')
    .map((player) => {
      const intent = decideCpuIntent(state, player.id, profile, EMPTY_HISTORY);
      const decision = requireNetApproachBeforeBlock(state, {
        playerId: player.id,
        role: mapRole(intent.state),
        target: intent.target,
        attackIntent: intent.attackIntent,
        reactionDelay: intent.reactionDelay,
      });
      return leavePredictedOutBall(state, decision);
    });

  return spreadNetDefenders(state, keepSetTargetAttacker(state, decisions));
}
