import { performBlock } from '../actions/block';
import { performReceive } from '../actions/receive';
import { performServe } from '../actions/serve';
import { performSet, type SetTempo } from '../actions/set';
import { performSpike, type AttackIntent } from '../actions/spike';
import { chooseCpuServeTarget } from '../ai/serveTargeting';
import { DIFFICULTY_PROFILES, type CpuDifficulty } from '../ai/difficulty';
import { getMovementProfile } from '../characters/abilities';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import { startRallyWithBall } from '../core/rally';
import type { MatchState, PlayerState, Vec3 } from '../core/types';
import { resolveReworkActions } from './actionResolver';
import { decideCpuRoles, type ReworkCpuDecision } from './cpuAI';
import { decideTeammateRoles } from './teammateAI';
import type { ReworkCpuMemory, ReworkEvent } from './types';

const PLAYER_GRAVITY = 22;
const HOME_SETTER_TARGET: Vec3 = { x: 0, y: 2.2, z: -1.6 };
const AWAY_SETTER_TARGET: Vec3 = { x: 0, y: 2.2, z: 1.6 };
const CPU_ATTACK_CONTACT_MAX_Z = 1.05;

function characterFor(player: PlayerState) {
  return STARTER_ROSTER[player.characterId as CharacterId] ?? STARTER_ROSTER.shin;
}

function distanceXZ(player: PlayerState, target: Vec3): number {
  return Math.hypot(player.position.x - target.x, player.position.z - target.z);
}

function movePlayerToward(player: PlayerState, target: Vec3, dt: number): PlayerState {
  const speed = getMovementProfile(characterFor(player)).maxSpeed;
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.001) return player;
  const scale = Math.min(1, (speed * Math.max(0, dt)) / distance);
  return {
    ...player,
    position: {
      ...player.position,
      x: player.position.x + dx * scale,
      z: player.position.z + dz * scale,
    },
  };
}

function startPlayerJump(match: MatchState, playerId: string): MatchState {
  const player = match.players.find((candidate) => candidate.id === playerId);
  if (!player || player.isAirborne) return match;
  const profile = getMovementProfile(characterFor(player));
  const jumpVelocity = Math.sqrt(2 * PLAYER_GRAVITY * profile.jumpHeight);
  return {
    ...match,
    players: match.players.map((candidate) =>
      candidate.id === playerId
        ? {
            ...candidate,
            isAirborne: true,
            velocity: { ...candidate.velocity, y: jumpVelocity },
          }
        : candidate,
    ),
  };
}

export function tryAutomaticTeammateReceive(
  match: MatchState,
): { match: MatchState; event: ReworkEvent | null } {
  if (resolveReworkActions(match).play === 'RECEIVE') {
    return { match, event: null };
  }

  const decision = decideTeammateRoles(match).find((candidate) => candidate.role === 'RECEIVE');
  const receiver = decision
    ? match.players.find((player) => player.id === decision.playerId)
    : null;
  if (
    !receiver ||
    !(match.ball.lastTouchedBy?.startsWith('away-') ?? false) ||
    match.ball.position.z > 0 ||
    match.ball.position.y > 2.4 ||
    match.ball.velocity.y >= 0.8 ||
    distanceXZ(receiver, match.ball.position) > 1.7
  ) {
    return { match, event: null };
  }

  const setterTarget = receiver.id === 'home-1'
    ? { x: 1.8, y: 2.1, z: -1.8 }
    : HOME_SETTER_TARGET;
  const result = performReceive(
    match.ball,
    characterFor(receiver),
    receiver.id,
    setterTarget,
    0.035,
  );
  if (result.quality === 'MISS') return { match, event: null };
  return {
    match: { ...match, ball: result.ball },
    event: { type: 'RECEIVE', actorId: receiver.id, quality: result.quality },
  };
}

function updateCpuMemory(
  match: MatchState,
  decisions: readonly ReworkCpuDecision[],
  current: Record<string, ReworkCpuMemory>,
): Record<string, ReworkCpuMemory> {
  const next: Record<string, ReworkCpuMemory> = { ...current };
  for (const decision of decisions) {
    const previous = current[decision.playerId];
    if (!previous || previous.role !== decision.role) {
      const preservedReadyAt =
        previous?.role === 'APPROACH' && decision.role === 'BLOCK'
          ? previous.readyAt
          : null;
      next[decision.playerId] = {
        role: decision.role,
        readyAt: preservedReadyAt ?? match.time + decision.reactionDelay,
      };
    }
  }
  return next;
}

function ready(
  match: MatchState,
  memory: Record<string, ReworkCpuMemory>,
  playerId: string,
): boolean {
  return match.time >= (memory[playerId]?.readyAt ?? Number.POSITIVE_INFINITY);
}

function moveCpuPlayers(
  match: MatchState,
  decisions: readonly ReworkCpuDecision[],
  memory: Record<string, ReworkCpuMemory>,
  dt: number,
): MatchState {
  return {
    ...match,
    players: match.players.map((player) => {
      if (player.side !== 'away' || player.isAirborne || !ready(match, memory, player.id)) {
        return player;
      }
      const decision = decisions.find((candidate) => candidate.playerId === player.id);
      return decision ? movePlayerToward(player, decision.target, dt) : player;
    }),
  };
}

function cpuTimingOffset(difficulty: CpuDifficulty, scale: number): number {
  const profile = DIFFICULTY_PROFILES[difficulty];
  return 0.018 + profile.predictionError * scale + profile.decisionNoise * 0.02;
}

function setTempo(difficulty: CpuDifficulty): SetTempo {
  if (difficulty === 'BEGINNER') return 'HIGH';
  if (difficulty === 'MASTER') return 'QUICK';
  return 'NORMAL';
}

function cpuAttackTarget(intent: AttackIntent | null): Vec3 {
  if (intent === 'TIP') return { x: 0, y: 2.0, z: -4.7 };
  if (intent === 'LINE') return { x: -3.2, y: 0.75, z: -6.7 };
  if (intent === 'CROSS') return { x: 3.2, y: 0.75, z: -6.7 };
  if (intent === 'BLOCK_OUT') return { x: 3.8, y: 0.9, z: -5.8 };
  return { x: 0, y: 0.75, z: -6.8 };
}

function attackerRank(player: PlayerState | undefined): number {
  if (!player) return 99;
  if (player.role === 'ACE') return 0;
  if (player.role === 'MIDDLE') return 1;
  return 2;
}

function tryCpuServe(
  match: MatchState,
  difficulty: CpuDifficulty,
  decisions: readonly ReworkCpuDecision[],
  memory: Record<string, ReworkCpuMemory>,
): { match: MatchState; event: ReworkEvent | null } {
  const decision = decisions.find(
    (candidate) => candidate.role === 'SERVE' && ready(match, memory, candidate.playerId),
  );
  const server = decision
    ? match.players.find((player) => player.id === decision.playerId)
    : null;
  if (!server || match.rally.phase !== 'SERVE_READY' || match.rally.servingSide !== 'away') {
    return { match, event: null };
  }

  const receivers = match.players
    .filter((player) => player.side === 'home')
    .map((player) => ({
      id: player.id,
      x: player.position.x,
      z: player.position.z,
      receive: characterFor(player).abilities.receive,
    }));
  const target = chooseCpuServeTarget(
    difficulty,
    match.seed,
    match.score.home + match.score.away,
    receivers,
  );
  const ball = performServe(match.ball, server, target, 'FLOAT', 0.68);
  return {
    match: startRallyWithBall(match, ball),
    event: { type: 'SERVE', actorId: server.id },
  };
}

function tryCpuReceive(
  match: MatchState,
  difficulty: CpuDifficulty,
  decisions: readonly ReworkCpuDecision[],
  memory: Record<string, ReworkCpuMemory>,
): { match: MatchState; event: ReworkEvent | null } {
  const decision = decisions.find(
    (candidate) => candidate.role === 'RECEIVE' && ready(match, memory, candidate.playerId),
  );
  const receiver = decision
    ? match.players.find((player) => player.id === decision.playerId)
    : null;
  if (
    !receiver ||
    !(match.ball.lastTouchedBy?.startsWith('home-') ?? false) ||
    match.ball.position.z < 0 ||
    match.ball.position.y > 2.5 ||
    match.ball.velocity.y >= 1 ||
    distanceXZ(receiver, match.ball.position) > 1.75
  ) {
    return { match, event: null };
  }

  const result = performReceive(
    match.ball,
    characterFor(receiver),
    receiver.id,
    AWAY_SETTER_TARGET,
    cpuTimingOffset(difficulty, 0.065),
  );
  if (result.quality === 'MISS') return { match, event: null };
  return {
    match: { ...match, ball: result.ball },
    event: { type: 'RECEIVE', actorId: receiver.id, quality: result.quality },
  };
}

function firstTouchByAway(match: MatchState): boolean {
  return (
    (match.ball.lastContact === 'RECEIVE' ||
      match.ball.lastContact === 'DIVE' ||
      match.ball.lastContact === 'BLOCK') &&
    (match.ball.lastTouchedBy?.startsWith('away-') ?? false)
  );
}

function tryCpuSet(
  match: MatchState,
  difficulty: CpuDifficulty,
  decisions: readonly ReworkCpuDecision[],
  memory: Record<string, ReworkCpuMemory>,
): { match: MatchState; event: ReworkEvent | null } {
  if (!firstTouchByAway(match)) return { match, event: null };
  const decision = decisions.find(
    (candidate) => candidate.role === 'SET' && ready(match, memory, candidate.playerId),
  );
  const setter = decision
    ? match.players.find((player) => player.id === decision.playerId)
    : null;
  if (
    !setter ||
    match.ball.position.y < 0.8 ||
    match.ball.position.y > 3.4 ||
    distanceXZ(setter, match.ball.position) > 1.5
  ) {
    return { match, event: null };
  }

  const attackerDecision = decisions
    .filter((candidate) => candidate.role === 'APPROACH')
    .sort((a, b) => {
      const aPlayer = match.players.find((player) => player.id === a.playerId);
      const bPlayer = match.players.find((player) => player.id === b.playerId);
      const rankDelta = attackerRank(aPlayer) - attackerRank(bPlayer);
      if (rankDelta !== 0) return rankDelta;
      return (
        (aPlayer ? distanceXZ(aPlayer, match.ball.position) : 999) -
        (bPlayer ? distanceXZ(bPlayer, match.ball.position) : 999)
      );
    })[0];
  const attacker = attackerDecision
    ? match.players.find((player) => player.id === attackerDecision.playerId)
    : null;
  if (!attacker) return { match, event: null };

  const result = performSet(
    match.ball,
    characterFor(setter),
    setter.id,
    { x: attacker.position.x, y: 3.2, z: 0.72 },
    cpuTimingOffset(difficulty, 0.035),
    setTempo(difficulty),
  );
  if (result.quality === 'MISS') return { match, event: null };
  return {
    match: { ...match, ball: result.ball },
    event: { type: 'SET', actorId: setter.id, quality: result.quality },
  };
}

function tryCpuBlockOrAttack(
  match: MatchState,
  difficulty: CpuDifficulty,
  decisions: readonly ReworkCpuDecision[],
  memory: Record<string, ReworkCpuMemory>,
): { match: MatchState; event: ReworkEvent | null } {
  const homeSet =
    match.ball.lastContact === 'SET' &&
    (match.ball.lastTouchedBy?.startsWith('home-') ?? false);
  if (homeSet && match.ball.position.y >= 2.4 && match.ball.velocity.y <= 2.2) {
    const prep = decisions.find((candidate) => {
      const player = match.players.find((item) => item.id === candidate.playerId);
      return (
        candidate.role === 'APPROACH' &&
        player?.side === 'away' &&
        (player.role === 'ACE' || player.role === 'MIDDLE') &&
        !player.isAirborne &&
        player.position.z <= 1.8 &&
        ready(match, memory, candidate.playerId)
      );
    });
    if (prep) {
      return {
        match: startPlayerJump(match, prep.playerId),
        event: { type: 'JUMP', actorId: prep.playerId },
      };
    }
  }

  const blockDecision = decisions.find(
    (candidate) => candidate.role === 'BLOCK' && ready(match, memory, candidate.playerId),
  );
  const blocker = blockDecision
    ? match.players.find((player) => player.id === blockDecision.playerId)
    : null;
  if (
    blocker &&
    match.ball.lastContact === 'SPIKE' &&
    (match.ball.lastTouchedBy?.startsWith('home-') ?? false) &&
    match.ball.velocity.z > 0 &&
    Math.abs(match.ball.position.z) <= 1.8 &&
    Math.abs(blocker.position.x - match.ball.position.x) <= 1.4
  ) {
    if (!blocker.isAirborne) {
      return {
        match: startPlayerJump(match, blocker.id),
        event: { type: 'JUMP', actorId: blocker.id },
      };
    }
    const result = performBlock(
      match.ball,
      characterFor(blocker),
      blocker.id,
      cpuTimingOffset(difficulty, 0.055),
      match.ball.position.x - blocker.position.x,
    );
    if (result.touched) {
      return {
        match: { ...match, ball: result.ball },
        event: { type: 'BLOCK', actorId: blocker.id, quality: result.quality },
      };
    }
  }

  const attackDecision = decisions
    .filter((candidate) => candidate.role === 'APPROACH' && ready(match, memory, candidate.playerId))
    .sort((a, b) => {
      const aPlayer = match.players.find((player) => player.id === a.playerId);
      const bPlayer = match.players.find((player) => player.id === b.playerId);
      const rankDelta = attackerRank(aPlayer) - attackerRank(bPlayer);
      if (rankDelta !== 0) return rankDelta;
      return a.playerId.localeCompare(b.playerId);
    })[0];
  const attacker = attackDecision
    ? match.players.find((player) => player.id === attackDecision.playerId)
    : null;
  if (
    !attacker ||
    match.ball.lastContact !== 'SET' ||
    !(match.ball.lastTouchedBy?.startsWith('away-') ?? false)
  ) {
    return { match, event: null };
  }

  if (
    !attacker.isAirborne &&
    match.ball.position.z <= 2.5 &&
    match.ball.position.z >= 0 &&
    match.ball.position.y >= 2.1 &&
    attacker.position.z <= 2.2 &&
    Math.abs(attacker.position.x - match.ball.position.x) <= 2.0
  ) {
    return {
      match: startPlayerJump(match, attacker.id),
      event: { type: 'JUMP', actorId: attacker.id },
    };
  }

  if (
    attacker.isAirborne &&
    attacker.position.y >= 0.28 &&
    match.ball.position.z <= CPU_ATTACK_CONTACT_MAX_Z &&
    match.ball.position.z >= 0 &&
    match.ball.position.y >= 2.0 &&
    distanceXZ(attacker, match.ball.position) <= 2.5
  ) {
    const result = performSpike(
      match.ball,
      characterFor(attacker),
      attacker.id,
      cpuAttackTarget(attackDecision?.attackIntent ?? null),
      cpuTimingOffset(difficulty, 0.03),
      attackDecision?.attackIntent ?? 'POWER',
    );
    return {
      match: { ...match, ball: result.ball },
      event: {
        type: 'SPIKE',
        actorId: attacker.id,
        quality: result.quality,
        value: result.speedMetersPerSecond * 3.6,
      },
    };
  }

  return { match, event: null };
}

export function stepCpuRally(
  source: MatchState,
  difficulty: CpuDifficulty,
  currentMemory: Record<string, ReworkCpuMemory>,
  dt: number,
): {
  match: MatchState;
  event: ReworkEvent | null;
  cpuMemory: Record<string, ReworkCpuMemory>;
} {
  const decisions = decideCpuRoles(source, difficulty);
  const cpuMemory = updateCpuMemory(source, decisions, currentMemory);
  let match = moveCpuPlayers(source, decisions, cpuMemory, dt);

  const serve = tryCpuServe(match, difficulty, decisions, cpuMemory);
  if (serve.event) return { ...serve, cpuMemory };
  match = serve.match;

  const receive = tryCpuReceive(match, difficulty, decisions, cpuMemory);
  if (receive.event) return { ...receive, cpuMemory };
  match = receive.match;

  const set = tryCpuSet(match, difficulty, decisions, cpuMemory);
  if (set.event) return { ...set, cpuMemory };
  match = set.match;

  const attack = tryCpuBlockOrAttack(match, difficulty, decisions, cpuMemory);
  return { ...attack, cpuMemory };
}