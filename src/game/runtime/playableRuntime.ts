import { getMovementProfile } from '../characters/abilities';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import type { PlayerState } from '../core/types';
import type { CpuIntent } from '../ai/cpuAI';
import {
  createMatchRuntime,
  getCurrentAction,
  requestRuntimeSwitch,
  stepMatchRuntime as stepBaseRuntime,
  type MatchRuntimeState,
  type RuntimeEvent,
  type RuntimeInput,
} from './matchRuntime';

const PLAYER_GRAVITY = 22;
const CPU_CONTACT_DELAY_AFTER_JUMP = 0.075;
const CPU_BLOCK_READY_Z = 1.8;
const PLAYER_CONTACT_READ_RESET = 0.05;

interface CpuMemoryShape {
  intent: CpuIntent;
  nextDecisionAt: number;
  actionReadyAt: number;
}

export {
  createMatchRuntime,
  getCurrentAction,
  requestRuntimeSwitch,
};
export type {
  MatchRuntimeState,
  RuntimeEvent,
  RuntimeInput,
};

function characterFor(player: PlayerState) {
  return STARTER_ROSTER[player.characterId as CharacterId] ?? STARTER_ROSTER.shin;
}

function cpuMemories(runtime: MatchRuntimeState): Record<string, CpuMemoryShape> {
  return runtime.cpuDecisions as Record<string, CpuMemoryShape>;
}

function playerReceivingContact(
  runtime: MatchRuntimeState,
  input: RuntimeInput,
): boolean {
  if (!input.actionPressed) return false;
  const action = getCurrentAction(runtime);
  return action === 'RECEIVE' || action === 'DIVE';
}

function coverIntent(player: PlayerState): CpuIntent {
  return {
    state: 'COVER',
    target: { x: player.position.x, y: 0, z: player.position.z },
    attackIntent: null,
    reactionDelay: PLAYER_CONTACT_READ_RESET,
  };
}

function clearStaleBlockIntent(
  runtime: MatchRuntimeState,
  input: RuntimeInput,
): MatchRuntimeState {
  const receivingNow = playerReceivingContact(runtime, input);
  if (runtime.match.ball.lastContact === 'SPIKE' && !receivingNow) {
    return runtime;
  }

  const memories = cpuMemories(runtime);
  const next: Record<string, CpuMemoryShape> = { ...memories };
  let changed = false;

  if (receivingNow) {
    for (const player of runtime.match.players) {
      if (
        player.side !== 'away' ||
        (player.role !== 'ACE' && player.role !== 'MIDDLE')
      ) {
        continue;
      }
      next[player.id] = {
        intent: coverIntent(player),
        nextDecisionAt: runtime.match.time + PLAYER_CONTACT_READ_RESET,
        actionReadyAt: runtime.match.time + PLAYER_CONTACT_READ_RESET,
      };
      changed = true;
    }
  } else {
    for (const [playerId, memory] of Object.entries(memories)) {
      if (memory.intent.state !== 'BLOCK') continue;
      delete next[playerId];
      changed = true;
    }
  }

  return changed
    ? { ...runtime, cpuDecisions: next as MatchRuntimeState['cpuDecisions'] }
    : runtime;
}

function horizontalDistance(player: PlayerState, x: number, z: number): number {
  return Math.hypot(player.position.x - x, player.position.z - z);
}

function startCpuJump(
  runtime: MatchRuntimeState,
  player: PlayerState,
): MatchRuntimeState {
  if (player.isAirborne) return runtime;

  const movement = getMovementProfile(characterFor(player));
  const jumpVelocity = Math.sqrt(2 * PLAYER_GRAVITY * movement.jumpHeight);
  const memories = cpuMemories(runtime);
  const memory = memories[player.id];

  return {
    ...runtime,
    match: {
      ...runtime.match,
      players: runtime.match.players.map((candidate) =>
        candidate.id === player.id
          ? {
              ...candidate,
              isAirborne: true,
              velocity: { ...candidate.velocity, y: jumpVelocity },
            }
          : candidate,
      ),
    },
    cpuDecisions: memory
      ? {
          ...runtime.cpuDecisions,
          [player.id]: {
            ...memory,
            actionReadyAt: Math.max(
              memory.actionReadyAt,
              runtime.match.time + CPU_CONTACT_DELAY_AFTER_JUMP,
            ),
          },
        }
      : runtime.cpuDecisions,
  };
}

function chooseBlockJumper(runtime: MatchRuntimeState): PlayerState | null {
  const { ball } = runtime.match;
  if (
    ball.lastContact !== 'SPIKE' ||
    !(ball.lastTouchedBy?.startsWith('home-') ?? false) ||
    ball.velocity.z <= 0 ||
    Math.abs(ball.position.z) > 2.4 ||
    ball.position.y < 1.8
  ) {
    return null;
  }

  const memories = cpuMemories(runtime);
  return (
    [...runtime.match.players]
      .filter((player) => {
        const memory = memories[player.id];
        return (
          player.side === 'away' &&
          (player.role === 'ACE' || player.role === 'MIDDLE') &&
          !player.isAirborne &&
          player.position.z <= CPU_BLOCK_READY_Z &&
          memory?.intent.state === 'BLOCK' &&
          runtime.match.time >= memory.actionReadyAt &&
          Math.abs(player.position.x - ball.position.x) <= 1.55
        );
      })
      .sort(
        (a, b) =>
          horizontalDistance(a, ball.position.x, ball.position.z) -
          horizontalDistance(b, ball.position.x, ball.position.z),
      )[0] ?? null
  );
}

function chooseAttackJumper(runtime: MatchRuntimeState): PlayerState | null {
  const { ball } = runtime.match;
  if (
    ball.lastContact !== 'SET' ||
    !(ball.lastTouchedBy?.startsWith('away-') ?? false) ||
    ball.position.z < 0 ||
    ball.position.y < 2
  ) {
    return null;
  }

  const memories = cpuMemories(runtime);
  return (
    [...runtime.match.players]
      .filter((player) => {
        const memory = memories[player.id];
        return (
          player.side === 'away' &&
          (player.role === 'ACE' || player.role === 'MIDDLE') &&
          !player.isAirborne &&
          memory?.intent.state === 'APPROACH' &&
          runtime.match.time >= memory.actionReadyAt &&
          horizontalDistance(player, ball.position.x, ball.position.z) <= 2.8
        );
      })
      .sort(
        (a, b) =>
          horizontalDistance(a, ball.position.x, ball.position.z) -
          horizontalDistance(b, ball.position.x, ball.position.z),
      )[0] ?? null
  );
}

function prepareCpuJump(runtime: MatchRuntimeState): {
  runtime: MatchRuntimeState;
  jumperId: string | null;
} {
  const blocker = chooseBlockJumper(runtime);
  if (blocker) {
    return { runtime: startCpuJump(runtime, blocker), jumperId: blocker.id };
  }

  const attacker = chooseAttackJumper(runtime);
  if (attacker) {
    return { runtime: startCpuJump(runtime, attacker), jumperId: attacker.id };
  }

  return { runtime, jumperId: null };
}

export function stepMatchRuntime(
  source: MatchRuntimeState,
  input: RuntimeInput,
  dt: number,
): MatchRuntimeState {
  const guarded = clearStaleBlockIntent(source, input);
  const prepared = prepareCpuJump(guarded);
  const stepped = stepBaseRuntime(prepared.runtime, input, dt);

  if (prepared.jumperId && stepped.lastEvent === null) {
    return {
      ...stepped,
      lastEvent: { type: 'JUMP', actorId: prepared.jumperId },
    };
  }

  return stepped;
}
