import { performBlock } from '../actions/block';
import { performDive } from '../actions/dive';
import { performReceive } from '../actions/receive';
import { performServe } from '../actions/serve';
import { performSet, type SetTempo } from '../actions/set';
import { performSpike, type AttackIntent } from '../actions/spike';
import { decideAllyIntent } from '../ai/allyAI';
import { decideCpuIntent, type CpuIntent } from '../ai/cpuAI';
import {
  DIFFICULTY_PROFILES,
  type CpuDifficulty,
  type DifficultyProfile,
} from '../ai/difficulty';
import {
  createTendencyHistory,
  recordDefense,
  type TendencyHistory,
} from '../ai/tendencyTracker';
import { predictLanding } from '../ball/ballPhysics';
import { getMovementProfile } from '../characters/abilities';
import {
  STARTER_ROSTER,
  type CharacterDefinition,
  type CharacterId,
} from '../characters/roster';
import { COURT } from '../core/constants';
import { createMatch } from '../core/createMatch';
import { startRallyWithBall } from '../core/rally';
import { stepMatch } from '../core/stepMatch';
import type { MatchState, PlayerState, Vec3 } from '../core/types';
import { resolveAction } from '../input/actionResolver';
import {
  getSwitchCandidate,
  requestManualSwitch,
} from '../input/characterSwitch';
import type { ActionKind, PlayerInput, SwitchMode } from '../input/inputTypes';

const PLAYER_GRAVITY = 22;
const HOME_Z_MIN = -COURT.length / 2 + 0.25;
const HOME_Z_MAX = -0.28;
const AWAY_Z_MIN = 0.28;
const AWAY_Z_MAX = COURT.length / 2 - 0.25;
const X_MIN = -COURT.width / 2 + 0.2;
const X_MAX = COURT.width / 2 - 0.2;

export type RuntimeEventType =
  | 'SERVE'
  | 'RECEIVE'
  | 'DIVE'
  | 'SET'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK'
  | 'POINT';

export interface RuntimeEvent {
  type: RuntimeEventType;
  actorId: string | null;
  quality?: string;
  value?: number;
}

interface CpuDecisionMemory {
  intent: CpuIntent;
  nextDecisionAt: number;
  actionReadyAt: number;
}

export interface MatchRuntimeState {
  match: MatchState;
  controlledPlayerId: string;
  queuedPlayerId: string | null;
  switchMode: SwitchMode;
  difficulty: CpuDifficulty;
  history: TendencyHistory;
  cpuDecisions: Record<string, CpuDecisionMemory>;
  lastEvent: RuntimeEvent | null;
}

export interface RuntimeInput extends PlayerInput {
  selectedAttack?: AttackIntent;
  selectedSetTempo?: SetTempo;
}

export function createMatchRuntime(
  seed = 1,
  difficulty: CpuDifficulty = 'NORMAL',
  switchMode: SwitchMode = 'STANDARD',
): MatchRuntimeState {
  return {
    match: createMatch(seed),
    controlledPlayerId: 'home-0',
    queuedPlayerId: null,
    switchMode,
    difficulty,
    history: createTendencyHistory(),
    cpuDecisions: {},
    lastEvent: null,
  };
}

function characterFor(player: PlayerState): CharacterDefinition {
  return STARTER_ROSTER[player.characterId as CharacterId] ?? STARTER_ROSTER.kai;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize2(x: number, z: number): { x: number; z: number; length: number } {
  const length = Math.hypot(x, z);
  if (length <= 0.0001) return { x: 0, z: 0, length: 0 };
  return { x: x / length, z: z / length, length };
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return current;
}

function timingOffsetAtHeight(match: MatchState, height: number): number {
  const velocityY = match.ball.velocity.y;
  const deltaY = height - match.ball.position.y;
  if (Math.abs(velocityY) < 0.2) {
    return Math.sign(deltaY || 1) * Math.min(0.6, Math.abs(deltaY) * 0.4);
  }
  return clamp(deltaY / velocityY, -0.6, 0.6);
}

function actionTimingOffset(match: MatchState, player: PlayerState, action: ActionKind): number {
  if (action === 'RECEIVE') return timingOffsetAtHeight(match, 0.9);
  if (action === 'DIVE') return timingOffsetAtHeight(match, 0.5);
  if (action === 'SET') return timingOffsetAtHeight(match, 2.05);
  if (action === 'SPIKE' || action === 'BLOCK') {
    return timingOffsetAtHeight(match, 2.05 + player.position.y);
  }
  return 0;
}

function movePlayerByVector(
  player: PlayerState,
  character: CharacterDefinition,
  move: { x: number; z: number },
  dt: number,
): PlayerState {
  const profile = getMovementProfile(character);
  const normalizedMove = normalize2(move.x, move.z);
  const inputMagnitude = Math.min(1, normalizedMove.length);
  const desiredX = normalizedMove.x * profile.maxSpeed * inputMagnitude;
  const desiredZ = normalizedMove.z * profile.maxSpeed * inputMagnitude;
  const accelerating = inputMagnitude > 0.03;
  const accel = accelerating ? profile.acceleration : profile.deceleration;

  const velocityX = approach(player.velocity.x, desiredX, accel * dt);
  const velocityZ = approach(player.velocity.z, desiredZ, accel * dt);
  let velocityY = player.velocity.y;
  let y = player.position.y;

  if (player.isAirborne || y > 0) {
    velocityY -= PLAYER_GRAVITY * dt;
    y += velocityY * dt;
    if (y <= 0) {
      y = 0;
      velocityY = 0;
    }
  }

  const isAirborne = y > 0.001;
  const zMin = player.side === 'home' ? HOME_Z_MIN : AWAY_Z_MIN;
  const zMax = player.side === 'home' ? HOME_Z_MAX : AWAY_Z_MAX;

  return {
    ...player,
    position: {
      x: clamp(player.position.x + velocityX * dt, X_MIN, X_MAX),
      y,
      z: clamp(player.position.z + velocityZ * dt, zMin, zMax),
    },
    velocity: { x: velocityX, y: velocityY, z: velocityZ },
    isAirborne,
  };
}

function movePlayerToward(
  player: PlayerState,
  character: CharacterDefinition,
  target: Vec3,
  dt: number,
): PlayerState {
  const delta = normalize2(target.x - player.position.x, target.z - player.position.z);
  const arrival = Math.min(1, delta.length / 1.2);
  return movePlayerByVector(
    player,
    character,
    { x: delta.x * arrival, z: delta.z * arrival },
    dt,
  );
}

function setPlayer(match: MatchState, updated: PlayerState): MatchState {
  return {
    ...match,
    players: match.players.map((player) => (player.id === updated.id ? updated : player)),
  };
}

function setterTarget(side: 'home' | 'away'): Vec3 {
  return { x: 0, y: 2.15, z: side === 'home' ? -1.2 : 1.2 };
}

function attackTarget(side: 'home' | 'away', intent: AttackIntent, aimX = 0): Vec3 {
  const z = side === 'home' ? 6.6 : -6.6;
  const intentX = intent === 'CROSS' ? -2.8 : intent === 'LINE' ? 2.8 : aimX;
  return { x: clamp(intentX, -4.1, 4.1), y: 0.05, z };
}

function homeSetAttacker(match: MatchState, setterId: string, aimX: number): PlayerState | null {
  return (
    [...match.players]
      .filter((candidate) => candidate.side === 'home' && candidate.id !== setterId)
      .sort(
        (a, b) =>
          Math.abs(a.position.x - aimX) - Math.abs(b.position.x - aimX),
      )[0] ?? null
  );
}

function jumpPlayer(match: MatchState, player: PlayerState): MatchState {
  if (player.isAirborne) return match;
  const profile = getMovementProfile(characterFor(player));
  const jumpVelocity = Math.sqrt(2 * PLAYER_GRAVITY * profile.jumpHeight);
  return setPlayer(match, {
    ...player,
    isAirborne: true,
    velocity: { ...player.velocity, y: jumpVelocity },
  });
}

function userServeParameters(input: RuntimeInput): {
  kind: 'FLOAT' | 'JUMP';
  power: number;
} {
  const swipe = input.swipe;
  if (!swipe) return { kind: 'FLOAT', power: 0.72 };
  const distance = Math.hypot(swipe.x, swipe.y);
  const kind = swipe.y <= -82 && distance >= 92 ? 'JUMP' : 'FLOAT';
  const durationPower = 0.46 + swipe.durationMs / 900;
  const distancePower = distance / 420;
  return {
    kind,
    power: clamp(durationPower + distancePower, 0.46, 1),
  };
}

function performUserAction(
  runtime: MatchRuntimeState,
  input: RuntimeInput,
): MatchRuntimeState {
  const player = runtime.match.players.find(
    (candidate) => candidate.id === runtime.controlledPlayerId,
  );
  if (!player) return runtime;
  const character = characterFor(player);
  const action = resolveAction(runtime.match, player.id);
  if (!action) return runtime;

  let match = runtime.match;
  let event: RuntimeEvent = { type: action, actorId: player.id };
  const timingOffset = actionTimingOffset(match, player, action);

  if (action === 'SERVE') {
    const target = {
      x: clamp(input.aim.x, -4, 4),
      y: 0,
      z: clamp(input.aim.z || 6.2, 1.5, 8.2),
    };
    const serve = userServeParameters(input);
    const ball = performServe(match.ball, player, target, serve.kind, serve.power);
    match = startRallyWithBall(match, ball);
  } else if (action === 'RECEIVE') {
    const result = performReceive(
      match.ball,
      character,
      player.id,
      setterTarget('home'),
      timingOffset,
    );
    match = { ...match, ball: result.ball };
    event = { ...event, quality: result.quality };
  } else if (action === 'DIVE') {
    const result = performDive(
      match.ball,
      character,
      player.id,
      setterTarget('home'),
      timingOffset,
    );
    match = {
      ...match,
      ball: result.ball,
      players: match.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, actionLockUntil: match.time + result.recoverySeconds }
          : candidate,
      ),
    };
    event = { ...event, quality: result.quality };
  } else if (action === 'SET') {
    const attacker = homeSetAttacker(match, player.id, input.aim.x);
    if (attacker) {
      const result = performSet(
        match.ball,
        character,
        player.id,
        { x: attacker.position.x, y: 3.15, z: -0.75 },
        timingOffset,
        input.selectedSetTempo ?? 'NORMAL',
      );
      match = { ...match, ball: result.ball };
      event = { ...event, quality: result.quality };
    }
  } else if (action === 'JUMP') {
    match = jumpPlayer(match, player);
  } else if (action === 'SPIKE') {
    const intent = input.selectedAttack ?? 'POWER';
    const result = performSpike(
      match.ball,
      character,
      player.id,
      attackTarget('home', intent, input.aim.x),
      timingOffset,
      intent,
    );
    match = { ...match, ball: result.ball };
    event = {
      ...event,
      quality: result.quality,
      value: result.speedMetersPerSecond * 3.6,
    };
  } else if (action === 'BLOCK') {
    if (!player.isAirborne) {
      match = jumpPlayer(match, player);
    } else {
      const result = performBlock(
        match.ball,
        character,
        player.id,
        timingOffset,
        match.ball.position.x - player.position.x,
      );
      match = { ...match, ball: result.ball };
      event = { ...event, quality: result.quality };
    }
    return {
      ...runtime,
      match,
      history: recordDefense(runtime.history, 'BLOCK'),
      lastEvent: event,
    };
  }

  return { ...runtime, match, lastEvent: event };
}

function moveTeams(runtime: MatchRuntimeState, input: RuntimeInput, dt: number): MatchRuntimeState {
  const match = runtime.match;
  const profile = DIFFICULTY_PROFILES[runtime.difficulty];
  const cpuDecisions = { ...runtime.cpuDecisions };

  const players = match.players.map((player) => {
    const character = characterFor(player);
    if (player.id === runtime.controlledPlayerId) {
      return movePlayerByVector(player, character, input.move, dt);
    }
    if (player.side === 'home') {
      const intent = decideAllyIntent(match, player.id);
      return movePlayerToward(player, character, intent.target, dt);
    }

    let memory = cpuDecisions[player.id];
    if (!memory || match.time >= memory.nextDecisionAt) {
      const intent = decideCpuIntent(match, player.id, profile, runtime.history);
      const intentChanged = !memory || memory.intent.state !== intent.state;
      memory = {
        intent,
        nextDecisionAt: match.time + intent.reactionDelay,
        actionReadyAt: intentChanged
          ? match.time + intent.reactionDelay
          : memory.actionReadyAt,
      };
      cpuDecisions[player.id] = memory;
    }
    return movePlayerToward(player, character, memory.intent.target, dt);
  });

  return {
    ...runtime,
    cpuDecisions,
    match: { ...match, players },
  };
}

function nearestPlayer(
  match: MatchState,
  side: 'home' | 'away',
  target: Vec3,
  predicate: (player: PlayerState) => boolean = () => true,
): PlayerState | null {
  return (
    [...match.players]
      .filter((player) => player.side === side && predicate(player))
      .sort(
        (a, b) =>
          Math.hypot(a.position.x - target.x, a.position.z - target.z) -
          Math.hypot(b.position.x - target.x, b.position.z - target.z),
      )[0] ?? null
  );
}

function cpuTimingError(profile: DifficultyProfile): number {
  return (profile.predictionError + profile.decisionNoise) * 0.055;
}

function cpuReceiveReach(profile: DifficultyProfile): number {
  return clamp(2.28 - profile.predictionError * 0.28, 1.82, 2.24);
}

function cpuActionReady(runtime: MatchRuntimeState, playerId: string): boolean {
  const memory = runtime.cpuDecisions[playerId];
  return Boolean(memory && runtime.match.time >= memory.actionReadyAt);
}

function consumeCpuAction(runtime: MatchRuntimeState, playerId: string): MatchRuntimeState {
  const memory = runtime.cpuDecisions[playerId];
  if (!memory) return runtime;
  return {
    ...runtime,
    cpuDecisions: {
      ...runtime.cpuDecisions,
      [playerId]: {
        ...memory,
        actionReadyAt: runtime.match.time + memory.intent.reactionDelay,
      },
    },
  };
}

function performCpuAction(runtime: MatchRuntimeState): MatchRuntimeState {
  let match = runtime.match;
  const profile = DIFFICULTY_PROFILES[runtime.difficulty];

  if (match.rally.phase === 'SERVE_READY' && match.rally.servingSide === 'away') {
    const away = match.players.filter((player) => player.side === 'away');
    const server = away[match.rally.serverIndex.away % away.length];
    if (!server || !cpuActionReady(runtime, server.id)) return runtime;
    const weakReceiver = runtime.difficulty === 'BEGINNER'
      ? null
      : [...match.players]
          .filter((player) => player.side === 'home')
          .sort(
            (a, b) =>
              characterFor(a).abilities.receive - characterFor(b).abilities.receive,
          )[0];
    const target = weakReceiver
      ? { x: weakReceiver.position.x, y: 0, z: weakReceiver.position.z }
      : { x: 0, y: 0, z: -5.6 };
    const ball = performServe(match.ball, server, target, profile.id === 'BEGINNER' ? 'FLOAT' : 'JUMP', 0.68);
    return consumeCpuAction(
      {
        ...runtime,
        match: startRallyWithBall(match, ball),
        lastEvent: { type: 'SERVE', actorId: server.id },
      },
      server.id,
    );
  }

  if (match.rally.phase !== 'RALLY') return runtime;

  const ball = match.ball;
  const lastTouchHome = ball.lastTouchedBy?.startsWith('home-') ?? false;
  const lastTouchAway = ball.lastTouchedBy?.startsWith('away-') ?? false;

  if (lastTouchHome && ball.velocity.z > 0 && Math.abs(ball.position.z) < 1.8 && ball.position.y > 1.8) {
    const blocker = nearestPlayer(
      match,
      'away',
      ball.position,
      (player) => player.role === 'MIDDLE' || player.role === 'ACE',
    );
    if (
      blocker &&
      cpuActionReady(runtime, blocker.id) &&
      Math.abs(blocker.position.x - ball.position.x) <= 1.3
    ) {
      const result = performBlock(
        ball,
        characterFor(blocker),
        blocker.id,
        cpuTimingError(profile) * 1.7,
        ball.position.x - blocker.position.x,
      );
      const consumed = consumeCpuAction(runtime, blocker.id);
      if (result.touched) {
        return {
          ...consumed,
          match: { ...match, ball: result.ball },
          lastEvent: { type: 'BLOCK', actorId: blocker.id, quality: result.quality },
        };
      }
      return consumed;
    }
  }

  if (ball.position.z >= 0 && ball.velocity.y < 0 && lastTouchHome && ball.position.y <= 1.65) {
    const landing = predictLanding(ball);
    const receiver = nearestPlayer(match, 'away', landing);
    if (receiver && cpuActionReady(runtime, receiver.id)) {
      const distance = Math.hypot(
        receiver.position.x - landing.x,
        receiver.position.z - landing.z,
      );
      if (distance <= cpuReceiveReach(profile)) {
        const result = performReceive(
          ball,
          characterFor(receiver),
          receiver.id,
          setterTarget('away'),
          cpuTimingError(profile),
        );
        return consumeCpuAction(
          {
            ...runtime,
            match: { ...match, ball: result.ball },
            lastEvent: { type: 'RECEIVE', actorId: receiver.id, quality: result.quality },
          },
          receiver.id,
        );
      }
    }
  }

  if (lastTouchAway && ball.velocity.y > 0) {
    const lastToucher = match.players.find((player) => player.id === ball.lastTouchedBy);
    if (lastToucher?.role !== 'SETTER' && ball.position.y <= 2.75) {
      const setter = match.players.find(
        (player) => player.side === 'away' && player.role === 'SETTER',
      );
      if (setter && cpuActionReady(runtime, setter.id)) {
        const distance = Math.hypot(
          setter.position.x - ball.position.x,
          setter.position.z - ball.position.z,
        );
        if (distance <= 2.5) {
          const attacker = nearestPlayer(
            match,
            'away',
            { x: ball.position.x, y: 0, z: 0.9 },
            (player) => player.role === 'ACE' || player.role === 'MIDDLE',
          );
          if (attacker) {
            const result = performSet(
              ball,
              characterFor(setter),
              setter.id,
              { x: attacker.position.x, y: 3.15, z: 0.8 },
              cpuTimingError(profile),
              profile.id === 'BEGINNER' ? 'HIGH' : profile.id === 'MASTER' ? 'QUICK' : 'NORMAL',
            );
            return consumeCpuAction(
              {
                ...runtime,
                match: { ...match, ball: result.ball },
                lastEvent: { type: 'SET', actorId: setter.id, quality: result.quality },
              },
              setter.id,
            );
          }
        }
      }
    }
  }

  if (lastTouchAway) {
    const setter = match.players.find((player) => player.id === ball.lastTouchedBy);
    if (setter?.role === 'SETTER' && ball.position.y >= 2.1) {
      const attacker = nearestPlayer(
        match,
        'away',
        ball.position,
        (player) => player.role === 'ACE' || player.role === 'MIDDLE',
      );
      if (attacker && cpuActionReady(runtime, attacker.id)) {
        const distance = Math.hypot(
          attacker.position.x - ball.position.x,
          attacker.position.z - ball.position.z,
        );
        if (distance <= 2.45) {
          const decision = decideCpuIntent(match, attacker.id, profile, runtime.history);
          const intent = decision.attackIntent ?? 'POWER';
          const result = performSpike(
            ball,
            characterFor(attacker),
            attacker.id,
            attackTarget('away', intent),
            cpuTimingError(profile),
            intent,
          );
          return consumeCpuAction(
            {
              ...runtime,
              match: { ...match, ball: result.ball },
              lastEvent: {
                type: 'SPIKE',
                actorId: attacker.id,
                quality: result.quality,
                value: result.speedMetersPerSecond * 3.6,
              },
            },
            attacker.id,
          );
        }
      }
    }
  }

  return runtime;
}

function resetFormation(match: MatchState): MatchState {
  const lanes = [-2.6, 0, 2.6] as const;
  return {
    ...match,
    players: match.players.map((player) => {
      const index = Number(player.id.split('-')[1] ?? 0);
      const sideSign = player.side === 'home' ? -1 : 1;
      return {
        ...player,
        position: { x: lanes[index] ?? 0, y: 0, z: sideSign * 5.5 },
        velocity: { x: 0, y: 0, z: 0 },
        isAirborne: false,
        actionLockUntil: 0,
      };
    }),
  };
}

function applyAutomaticSwitch(runtime: MatchRuntimeState, input: RuntimeInput): MatchRuntimeState {
  if (runtime.queuedPlayerId) {
    const current = runtime.match.players.find(
      (player) => player.id === runtime.controlledPlayerId,
    );
    if (current && !current.isAirborne && current.actionLockUntil <= runtime.match.time) {
      return {
        ...runtime,
        controlledPlayerId: runtime.queuedPlayerId,
        queuedPlayerId: null,
      };
    }
  }

  const moveStrength = Math.hypot(input.move.x, input.move.z);
  const decision = getSwitchCandidate(runtime.match, {
    mode: runtime.switchMode,
    currentPlayerId: runtime.controlledPlayerId,
    strongMovement: moveStrength >= 0.7,
  });
  if (!decision.playerId || decision.playerId === runtime.controlledPlayerId) {
    return runtime;
  }

  return { ...runtime, controlledPlayerId: decision.playerId };
}

export function requestRuntimeSwitch(
  runtime: MatchRuntimeState,
  requestedPlayerId: string,
): MatchRuntimeState {
  const result = requestManualSwitch(
    runtime.match,
    runtime.controlledPlayerId,
    requestedPlayerId,
  );
  return {
    ...runtime,
    controlledPlayerId: result.activePlayerId,
    queuedPlayerId: result.queuedPlayerId,
  };
}

export function stepMatchRuntime(
  source: MatchRuntimeState,
  input: RuntimeInput,
  dt: number,
): MatchRuntimeState {
  if (!Number.isFinite(dt) || dt <= 0) return source;

  let runtime: MatchRuntimeState = { ...source, lastEvent: null };
  runtime = applyAutomaticSwitch(runtime, input);
  runtime = moveTeams(runtime, input, dt);

  if (input.actionPressed) {
    runtime = performUserAction(runtime, input);
  }

  runtime = performCpuAction(runtime);
  const previousPhase = runtime.match.rally.phase;
  const previousHomeScore = runtime.match.score.home;
  const previousAwayScore = runtime.match.score.away;
  const match = stepMatch(
    runtime.match,
    {
      move: input.move,
      actionPressed: input.actionPressed,
      actionReleased: input.actionReleased,
      requestedPlayerId: input.requestedPlayerId,
    },
    dt,
  );

  runtime = { ...runtime, match };

  const scoreChanged =
    match.score.home !== previousHomeScore || match.score.away !== previousAwayScore;
  if (scoreChanged) {
    runtime = {
      ...runtime,
      lastEvent: { type: 'POINT', actorId: match.ball.lastTouchedBy },
    };
  }

  if (previousPhase === 'POINT' && match.rally.phase === 'SERVE_READY') {
    runtime = {
      ...runtime,
      cpuDecisions: {},
      match: resetFormation(match),
    };
  }

  return runtime;
}

export function getCurrentAction(runtime: MatchRuntimeState): ActionKind | null {
  return resolveAction(runtime.match, runtime.controlledPlayerId);
}
