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

function mapRole(state: ReturnType<typeof decideCpuIntent>['state']): ReworkCpuRole {
  return state === 'RECOVER' ? 'COVER' : state;
}

export function decideCpuRoles(
  state: MatchState,
  difficulty: CpuDifficulty,
): ReworkCpuDecision[] {
  const profile = DIFFICULTY_PROFILES[difficulty];
  return state.players
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
}
