import type { AttackIntent } from '../actions/spike';
import { decideCpuIntent } from '../ai/cpuAI';
import { DIFFICULTY_PROFILES, type CpuDifficulty } from '../ai/difficulty';
import { createTendencyHistory } from '../ai/tendencyTracker';
import type { MatchState, Vec3 } from '../core/types';
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

export function decideCpuRoles(
  state: MatchState,
  difficulty: CpuDifficulty,
): ReworkCpuDecision[] {
  const profile = DIFFICULTY_PROFILES[difficulty];
  const decisions = state.players
    .filter((player) => player.side === 'away')
    .map((player) => {
      const intent = decideCpuIntent(state, player.id, profile, EMPTY_HISTORY);
      return {
        playerId: player.id,
        role: mapRole(intent.state),
        target: intent.target,
        attackIntent: intent.attackIntent,
        reactionDelay: intent.reactionDelay,
      };
    });

  return keepSetTargetAttacker(state, decisions);
}
