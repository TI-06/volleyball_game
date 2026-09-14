import { performBlock } from '../actions/block';
import { performSet } from '../actions/set';
import { performSpike, type AttackIntent } from '../actions/spike';
import { DIFFICULTY_PROFILES } from '../ai/difficulty';
import { getMovementProfile } from '../characters/abilities';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import type { PlayerState, Vec3 } from '../core/types';
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
const CPU_BLOCK_ATTEMPT_RECOVERY = 0.28;
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

function setAbility(player: PlayerState): number {
  return characterFor(player).abilities.set;
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

function cpuTimingError(runtime: MatchRuntimeState): number {
  const profile = DIFFICULTY_PROFILES[runtime.difficulty];
  return (profile.predictionError + profile.decisionNoise) * 0.055;
}

function cpuAttackTarget(intent: AttackIntent): Vec3 {
  const x = intent === 'CROSS'
    ? -2.8
    : intent === 'LINE'
      ? 2.8
      : intent === 'BLOCK_OUT'
        ? 3.8
        : 0;
  return { x, y: 0.05, z: -6.6 };
}

function chooseSetAttacker(
  runtime: MatchRuntimeState,
  setterId: string,
): PlayerState | null {
  const { ball } = runtime.match;
  return (
    [...runtime.match.players]
      .filter(
        (player) =>
          player.side === 'away' &&
          player.id !== setterId &&
          (player.role === 'ACE' || player.role === 'MIDDLE'),
      )
      .sort(
        (a, b) =>
          Math.abs(a.position.x - ball.position.x) -
          Math.abs(b.position.x - ball.position.x),
      )[0] ?? null
  );
}

function settableCpuContact(runtime: MatchRuntimeState): boolean {
  const contact = runtime.match.ball.lastContact;
  return contact === 'RECEIVE' || contact === 'DIVE' || contact === 'BLOCK';
}

function chooseCpuSetter(runtime: MatchRuntimeState): PlayerState | null {
  const { match } = runtime;
  const memories = cpuMemories(runtime);
  const firstToucherId = match.ball.lastTouchedBy;

  return (
    [...match.players]
      .filter((player) => {
        const memory = memories[player.id];
        return (
          player.side === 'away' &&
          player.id !== firstToucherId &&
          memory?.intent.state === 'SET' &&
          match.time >= memory.actionReadyAt &&
          horizontalDistance(player, match.ball.position.x, match.ball.position.z) <= 2.55
        );
      })
      .sort((a, b) => {
        const aSetterBonus = a.role === 'SETTER' ? 1000 : 0;
        const bSetterBonus = b.role === 'SETTER' ? 1000 : 0;
        return (bSetterBonus + setAbility(b)) - (aSetterBonus + setAbility(a));
      })[0] ?? null
  );
}

function performCpuSetAssist(runtime: MatchRuntimeState): {
  runtime: MatchRuntimeState;
  event: RuntimeEvent | null;
} {
  const { match } = runtime;
  const { ball } = match;
  if (
    match.rally.phase !== 'RALLY' ||
    ball.position.z < 0 ||
    ball.position.y < 0.8 ||
    ball.position.y > 3 ||
    !(ball.lastTouchedBy?.startsWith('away-') ?? false) ||
    !settableCpuContact(runtime)
  ) {
    return { runtime, event: null };
  }

  const setter = chooseCpuSetter(runtime);
  if (!setter) return { runtime, event: null };

  // Let the original runtime handle the ordinary YU rising-set path.
  if (setter.role === 'SETTER' && ball.velocity.y > 0.15) {
    return { runtime, event: null };
  }

  const attacker = chooseSetAttacker(runtime, setter.id);
  if (!attacker) return { runtime, event: null };

  const memories = cpuMemories(runtime);
  const setterMemory = memories[setter.id];
  if (!setterMemory) return { runtime, event: null };

  const tempo = runtime.difficulty === 'BEGINNER'
    ? 'HIGH'
    : runtime.difficulty === 'MASTER'
      ? 'QUICK'
      : 'NORMAL';
  const result = performSet(
    ball,
    characterFor(setter),
    setter.id,
    { x: attacker.position.x, y: 3.15, z: 0.8 },
    cpuTimingError(runtime),
    tempo,
  );

  const nextMemories: Record<string, CpuMemoryShape> = { ...memories };
  if (setter.role === 'SETTER') {
    nextMemories[setter.id] = {
      ...setterMemory,
      actionReadyAt: match.time + setterMemory.intent.reactionDelay,
    };
  } else {
    delete nextMemories[setter.id];
  }
  for (const player of match.players) {
    if (
      player.side === 'away' &&
      player.id !== setter.id &&
      (player.role === 'ACE' || player.role === 'MIDDLE')
    ) {
      delete nextMemories[player.id];
    }
  }

  return {
    runtime: {
      ...runtime,
      match: { ...match, ball: result.ball },
      cpuDecisions: nextMemories as MatchRuntimeState['cpuDecisions'],
    },
    event: { type: 'SET', actorId: setter.id, quality: result.quality },
  };
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

function chooseBlockPrepJumper(runtime: MatchRuntimeState): PlayerState | null {
  const { ball } = runtime.match;
  if (
    ball.lastContact !== 'SET' ||
    !(ball.lastTouchedBy?.startsWith('home-') ?? false) ||
    ball.position.y < 2.1 ||
    ball.position.z > 0.8
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
          memory?.intent.state === 'APPROACH' &&
          runtime.match.time >= memory.actionReadyAt &&
          Math.abs(player.position.x - ball.position.x) <= 1.55 &&
          horizontalDistance(player, ball.position.x, 0.55) <= 2.2
        );
      })
      .sort(
        (a, b) =>
          horizontalDistance(a, ball.position.x, 0.55) -
          horizontalDistance(b, ball.position.x, 0.55),
      )[0] ?? null
  );
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
  const prepBlocker = chooseBlockPrepJumper(runtime);
  if (prepBlocker) {
    return { runtime: startCpuJump(runtime, prepBlocker), jumperId: prepBlocker.id };
  }

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

function performPreparedCpuBlock(runtime: MatchRuntimeState): {
  runtime: MatchRuntimeState;
  event: RuntimeEvent | null;
} {
  const { match } = runtime;
  const { ball } = match;
  if (
    match.rally.phase !== 'RALLY' ||
    ball.lastContact !== 'SPIKE' ||
    !(ball.lastTouchedBy?.startsWith('home-') ?? false) ||
    ball.velocity.z <= 0 ||
    Math.abs(ball.position.z) > 1.8 ||
    ball.position.y < 1.65
  ) {
    return { runtime, event: null };
  }

  const memories = cpuMemories(runtime);
  const blocker = (
    [...match.players]
      .filter((player) => {
        const memory = memories[player.id];
        return (
          player.side === 'away' &&
          (player.role === 'ACE' || player.role === 'MIDDLE') &&
          player.isAirborne &&
          player.position.z <= CPU_BLOCK_READY_Z &&
          (memory?.intent.state === 'APPROACH' || memory?.intent.state === 'BLOCK') &&
          match.time >= memory.actionReadyAt &&
          Math.abs(player.position.x - ball.position.x) <= 1.3
        );
      })
      .sort(
        (a, b) =>
          horizontalDistance(a, ball.position.x, ball.position.z) -
          horizontalDistance(b, ball.position.x, ball.position.z),
      )[0] ?? null
  );
  if (!blocker) return { runtime, event: null };

  const memory = memories[blocker.id];
  if (!memory) return { runtime, event: null };
  const result = performBlock(
    ball,
    characterFor(blocker),
    blocker.id,
    cpuTimingError(runtime),
    ball.position.x - blocker.position.x,
  );
  const readyAt = match.time + Math.max(
    CPU_BLOCK_ATTEMPT_RECOVERY,
    memory.intent.reactionDelay,
  );
  const recoverIntent: CpuIntent = {
    state: 'RECOVER',
    target: { x: blocker.position.x, y: 0, z: blocker.position.z },
    attackIntent: null,
    reactionDelay: memory.intent.reactionDelay,
  };

  return {
    runtime: {
      ...runtime,
      match: result.touched ? { ...match, ball: result.ball } : match,
      cpuDecisions: {
        ...runtime.cpuDecisions,
        [blocker.id]: {
          intent: recoverIntent,
          nextDecisionAt: readyAt,
          actionReadyAt: readyAt,
        },
      },
    },
    event: result.touched
      ? { type: 'BLOCK', actorId: blocker.id, quality: result.quality }
      : null,
  };
}

function performEmergencyCpuSpike(runtime: MatchRuntimeState): {
  runtime: MatchRuntimeState;
  event: RuntimeEvent | null;
} {
  const { match } = runtime;
  const { ball } = match;
  if (
    match.rally.phase !== 'RALLY' ||
    ball.lastContact !== 'SET' ||
    !(ball.lastTouchedBy?.startsWith('away-') ?? false) ||
    ball.position.z < 0 ||
    ball.position.y < 2.05
  ) {
    return { runtime, event: null };
  }

  const emergencySetter = match.players.find((player) => player.id === ball.lastTouchedBy);
  if (!emergencySetter || emergencySetter.role === 'SETTER') {
    return { runtime, event: null };
  }

  const memories = cpuMemories(runtime);
  const attacker = (
    [...match.players]
      .filter((player) => {
        const memory = memories[player.id];
        return (
          player.side === 'away' &&
          player.id !== emergencySetter.id &&
          (player.role === 'ACE' || player.role === 'MIDDLE') &&
          player.isAirborne &&
          memory?.intent.state === 'APPROACH' &&
          match.time >= memory.actionReadyAt &&
          horizontalDistance(player, ball.position.x, ball.position.z) <= 2.45
        );
      })
      .sort(
        (a, b) =>
          horizontalDistance(a, ball.position.x, ball.position.z) -
          horizontalDistance(b, ball.position.x, ball.position.z),
      )[0] ?? null
  );
  if (!attacker) return { runtime, event: null };

  const memory = memories[attacker.id];
  if (!memory) return { runtime, event: null };
  const intent = memory.intent.attackIntent ?? 'POWER';
  const result = performSpike(
    ball,
    characterFor(attacker),
    attacker.id,
    cpuAttackTarget(intent),
    cpuTimingError(runtime),
    intent,
  );

  return {
    runtime: {
      ...runtime,
      match: { ...match, ball: result.ball },
      cpuDecisions: {
        ...runtime.cpuDecisions,
        [attacker.id]: {
          ...memory,
          actionReadyAt: match.time + memory.intent.reactionDelay,
        },
      },
    },
    event: {
      type: 'SPIKE',
      actorId: attacker.id,
      quality: result.quality,
      value: result.speedMetersPerSecond * 3.6,
    },
  };
}

export function stepMatchRuntime(
  source: MatchRuntimeState,
  input: RuntimeInput,
  dt: number,
): MatchRuntimeState {
  const guarded = clearStaleBlockIntent(source, input);
  const setAssist = performCpuSetAssist(guarded);
  const prepared = prepareCpuJump(setAssist.runtime);
  const preparedBlock = performPreparedCpuBlock(prepared.runtime);
  const emergencySpike = performEmergencyCpuSpike(preparedBlock.runtime);
  const stepped = stepBaseRuntime(emergencySpike.runtime, input, dt);

  if (stepped.lastEvent === null) {
    if (preparedBlock.event) {
      return { ...stepped, lastEvent: preparedBlock.event };
    }
    if (emergencySpike.event) {
      return { ...stepped, lastEvent: emergencySpike.event };
    }
    if (prepared.jumperId) {
      return {
        ...stepped,
        lastEvent: { type: 'JUMP', actorId: prepared.jumperId },
      };
    }
    if (setAssist.event) {
      return { ...stepped, lastEvent: setAssist.event };
    }
  }

  return stepped;
}
