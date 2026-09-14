import { performBlock } from '../actions/block';
import { performReceive } from '../actions/receive';
import { performServe } from '../actions/serve';
import { performSet } from '../actions/set';
import { performSpike, type AttackIntent } from '../actions/spike';
import { getMovementProfile } from '../characters/abilities';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import { COURT } from '../core/constants';
import { createMatch } from '../core/createMatch';
import { startRallyWithBall } from '../core/rally';
import { stepMatch } from '../core/stepMatch';
import type { MatchInput, MatchState, PlayerState, Vec3 } from '../core/types';
import type { CpuDifficulty } from '../ai/difficulty';
import { resolveReworkActions } from './actionResolver';
import { assistFocusPosition } from './movement';
import {
  stepCpuRally,
  tryAutomaticTeammateReceive,
} from './rallyAIExecutor';
import { decideTeammateRoles, type ReworkTeammateDecision } from './teammateAI';
import type {
  ReworkEvent,
  ReworkInput,
  ReworkRuntimeState,
  ReworkSwipe,
} from './types';

const FOCUS_PLAYER_ID = 'home-0' as const;
const PLAYER_GRAVITY = 22;
const MIN_BLOCK_PLAYER_HEIGHT = 0.28;
const SETTER_TARGET: Vec3 = { x: 0, y: 2.2, z: -1.6 };
const ATTACK_CONTACT_Z = -0.72;
const MATCH_INPUT_IDLE: MatchInput = {
  move: { x: 0, z: 0 },
  actionPressed: false,
  actionReleased: false,
  requestedPlayerId: null,
};

function characterFor(player: PlayerState) {
  return STARTER_ROSTER[player.characterId as CharacterId] ?? STARTER_ROSTER.kai;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distanceXZ(player: PlayerState, target: Vec3): number {
  return Math.hypot(player.position.x - target.x, player.position.z - target.z);
}

function movePlayerToward(player: PlayerState, target: Vec3, dt: number): PlayerState {
  const profile = getMovementProfile(characterFor(player));
  const maxDelta = profile.maxSpeed * Math.max(0, dt);
  const dx = target.x - player.position.x;
  const dz = target.z - player.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.001) return player;
  const scale = Math.min(1, maxDelta / distance);
  return {
    ...player,
    position: {
      ...player.position,
      x: player.position.x + dx * scale,
      z: player.position.z + dz * scale,
    },
  };
}

function focusAssistTarget(match: MatchState): Vec3 {
  const { ball } = match;
  if (ball.lastContact === 'SET' && ball.lastTouchedBy?.startsWith('home-')) {
    return { x: ball.position.x, y: 0, z: ATTACK_CONTACT_Z };
  }
  if (ball.position.z <= 0) {
    return { x: ball.position.x, y: 0, z: ball.position.z };
  }
  return { x: -2.6, y: 0, z: -4.8 };
}

function moveFocusPlayer(match: MatchState, input: ReworkInput, dt: number): MatchState {
  const focus = match.players.find((player) => player.id === FOCUS_PLAYER_ID);
  if (!focus || focus.isAirborne) return match;
  const target = focusAssistTarget(match);
  const next = assistFocusPosition(
    { x: focus.position.x, z: focus.position.z },
    { x: target.x, z: target.z },
    input.moveAxis,
    dt,
    getMovementProfile(characterFor(focus)).maxSpeed,
  );
  const nextPosition = {
    ...focus.position,
    x: clamp(next.x, -COURT.width / 2 + 0.25, COURT.width / 2 - 0.25),
    z: clamp(next.z, -COURT.length / 2 + 0.45, -0.35),
  };
  return {
    ...match,
    players: match.players.map((player) =>
      player.id === FOCUS_PLAYER_ID ? { ...player, position: nextPosition } : player,
    ),
  };
}

function integratePlayerVerticals(match: MatchState, dt: number): MatchState {
  let changed = false;
  const players = match.players.map((player) => {
    if (!player.isAirborne) return player;
    const velocityY = player.velocity.y - PLAYER_GRAVITY * dt;
    const y = player.position.y + velocityY * dt;
    changed = true;
    if (y <= 0) {
      return {
        ...player,
        isAirborne: false,
        position: { ...player.position, y: 0 },
        velocity: { ...player.velocity, y: 0 },
      };
    }
    return {
      ...player,
      position: { ...player.position, y },
      velocity: { ...player.velocity, y: velocityY },
    };
  });
  return changed ? { ...match, players } : match;
}

function startFocusJump(match: MatchState): MatchState {
  const focus = match.players.find((player) => player.id === FOCUS_PLAYER_ID);
  if (!focus || focus.isAirborne) return match;
  const movement = getMovementProfile(characterFor(focus));
  const jumpVelocity = Math.sqrt(2 * PLAYER_GRAVITY * movement.jumpHeight);
  return {
    ...match,
    players: match.players.map((player) =>
      player.id === focus.id
        ? {
            ...player,
            isAirborne: true,
            velocity: { ...player.velocity, y: jumpVelocity },
          }
        : player,
    ),
  };
}

function teammateMovementTarget(
  decision: ReworkTeammateDecision,
  match: MatchState,
): Vec3 {
  if (decision.role === 'SET') {
    return {
      x: clamp(match.ball.position.x, -3.4, 3.4),
      y: 0,
      z: clamp(match.ball.position.z, -4.2, -1.05),
    };
  }
  return decision.target;
}

function moveTeammates(match: MatchState, dt: number): MatchState {
  const decisions = decideTeammateRoles(match);
  if (decisions.length === 0) return match;
  return {
    ...match,
    players: match.players.map((player) => {
      const decision = decisions.find((candidate) => candidate.playerId === player.id);
      if (!decision || player.isAirborne) return player;
      return movePlayerToward(player, teammateMovementTarget(decision, match), dt);
    }),
  };
}

function firstTouchSettable(match: MatchState): boolean {
  return (
    (match.ball.lastContact === 'RECEIVE' ||
      match.ball.lastContact === 'DIVE' ||
      match.ball.lastContact === 'BLOCK') &&
    (match.ball.lastTouchedBy?.startsWith('home-') ?? false)
  );
}

function tryTeammateSet(match: MatchState): { match: MatchState; event: ReworkEvent | null } {
  if (!firstTouchSettable(match) || !match.ball.inPlay) {
    return { match, event: null };
  }
  const decision = decideTeammateRoles(match).find((candidate) => candidate.role === 'SET');
  if (!decision) return { match, event: null };
  const setter = match.players.find((player) => player.id === decision.playerId);
  const focus = match.players.find((player) => player.id === FOCUS_PLAYER_ID);
  if (!setter || !focus) return { match, event: null };
  if (
    distanceXZ(setter, match.ball.position) > 1.35 ||
    match.ball.position.y < 0.85 ||
    match.ball.position.y > 3.3
  ) {
    return { match, event: null };
  }

  const target: Vec3 = {
    x: clamp(focus.position.x, -3.4, 3.4),
    y: 3.2,
    z: ATTACK_CONTACT_Z,
  };
  const result = performSet(
    match.ball,
    characterFor(setter),
    setter.id,
    target,
    0.018,
    'NORMAL',
  );
  if (result.quality === 'MISS') return { match, event: null };
  return {
    match: { ...match, ball: result.ball },
    event: { type: 'SET', actorId: setter.id, quality: result.quality },
  };
}

function receiveTimingOffset(match: MatchState): number {
  return Math.abs(match.ball.position.y - 1.05) * 0.06;
}

function spikeTimingOffset(match: MatchState, focus: PlayerState): number {
  const idealContactHeight = 2.45 + focus.position.y;
  return Math.abs(match.ball.position.y - idealContactHeight) * 0.045;
}

function blockTimingOffset(focus: PlayerState): number {
  return Math.abs(focus.position.y - 0.72) * 0.22;
}

function attackFromSwipe(swipe: ReworkSwipe): { intent: AttackIntent; target: Vec3 } {
  const distance = Math.hypot(swipe.x, swipe.y);
  if (distance < 42) {
    return { intent: 'TIP', target: { x: 0, y: 2.0, z: 4.7 } };
  }
  if (swipe.x > 62) {
    return { intent: 'LINE', target: { x: -3.2, y: 0.75, z: 6.7 } };
  }
  if (swipe.x < -62) {
    return { intent: 'CROSS', target: { x: 3.2, y: 0.75, z: 6.7 } };
  }
  return { intent: 'POWER', target: { x: 0, y: 0.75, z: 6.8 } };
}

function servePower(holdSeconds: number): number {
  return clamp(0.58 + Math.max(0, holdSeconds) * 0.5, 0.58, 0.9);
}

function serveTarget(swipe: ReworkSwipe | null): Vec3 {
  const lane = clamp((swipe?.x ?? 0) / 80, -1, 1);
  return { x: -lane * 3.4, y: 0, z: 6.7 };
}

function opponentAttackSequence(match: MatchState): boolean {
  if (match.rally.phase !== 'RALLY' && match.rally.phase !== 'SERVING') return false;
  if (!(match.ball.lastTouchedBy?.startsWith('away-') ?? false)) return false;
  return match.ball.lastContact === 'SET' || match.ball.lastContact === 'SPIKE';
}

function tryFocusBlock(match: MatchState): { match: MatchState; event: ReworkEvent | null } {
  const focus = match.players.find((player) => player.id === FOCUS_PLAYER_ID);
  const { ball } = match;
  if (
    !focus?.isAirborne ||
    focus.position.y < MIN_BLOCK_PLAYER_HEIGHT ||
    ball.lastContact !== 'SPIKE' ||
    !(ball.lastTouchedBy?.startsWith('away-') ?? false) ||
    ball.velocity.z >= -0.05 ||
    focus.position.z < -1.8 ||
    Math.abs(ball.position.z) > 1.8 ||
    ball.position.y < 1.65 ||
    Math.abs(focus.position.x - ball.position.x) > 1.4
  ) {
    return { match, event: null };
  }

  const result = performBlock(
    ball,
    STARTER_ROSTER.kai,
    focus.id,
    blockTimingOffset(focus),
    ball.position.x - focus.position.x,
  );
  if (!result.touched) return { match, event: null };
  return {
    match: { ...match, ball: result.ball },
    event: { type: 'BLOCK', actorId: focus.id, quality: result.quality },
  };
}

function applyUserAction(
  match: MatchState,
  input: ReworkInput,
): { match: MatchState; event: ReworkEvent | null } {
  const actions = resolveReworkActions(match);
  const focus = match.players.find((player) => player.id === FOCUS_PLAYER_ID);
  if (!focus) return { match, event: null };

  if (input.playPressed && actions.play === 'RECEIVE') {
    const result = performReceive(
      match.ball,
      STARTER_ROSTER.kai,
      focus.id,
      SETTER_TARGET,
      receiveTimingOffset(match),
    );
    return {
      match: { ...match, ball: result.ball },
      event: { type: 'RECEIVE', actorId: focus.id, quality: result.quality },
    };
  }

  if (input.powerPressed && actions.power === 'JUMP') {
    return {
      match: startFocusJump(match),
      event: { type: 'JUMP', actorId: focus.id },
    };
  }

  if (input.powerSwipe && actions.power === 'SPIKE') {
    const attack = attackFromSwipe(input.powerSwipe);
    const result = performSpike(
      match.ball,
      STARTER_ROSTER.kai,
      focus.id,
      attack.target,
      spikeTimingOffset(match, focus),
      attack.intent,
    );
    return {
      match: { ...match, ball: result.ball },
      event: {
        type: 'SPIKE',
        actorId: focus.id,
        quality: result.quality,
        value: result.speedMetersPerSecond * 3.6,
      },
    };
  }

  return { match, event: null };
}

function withResolvedActions(runtime: ReworkRuntimeState): ReworkRuntimeState {
  const actions = resolveReworkActions(runtime.match);
  return {
    ...runtime,
    playLabel: actions.play,
    powerLabel: actions.power,
  };
}

export function createReworkRuntime(
  seed: number,
  difficulty: CpuDifficulty,
): ReworkRuntimeState {
  return withResolvedActions({
    match: createMatch(seed),
    difficulty,
    focusPlayerId: FOCUS_PLAYER_ID,
    playLabel: 'NONE',
    powerLabel: 'NONE',
    blockHoldStartedAt: null,
    powerHoldStartedAt: null,
    cpuMemory: {},
    lastEvent: null,
  });
}

export function stepReworkRuntime(
  source: ReworkRuntimeState,
  input: ReworkInput,
  dt: number,
): ReworkRuntimeState {
  if (!Number.isFinite(dt) || dt <= 0 || source.match.winner) {
    return source;
  }

  const scoreBefore = source.match.score;
  let match = integratePlayerVerticals(source.match, dt);
  match = moveFocusPlayer(match, input, dt);
  match = moveTeammates(match, dt);

  const teammateReceive = tryAutomaticTeammateReceive(match);
  match = teammateReceive.match;

  const setAssist = teammateReceive.event
    ? { match, event: null as ReworkEvent | null }
    : tryTeammateSet(match);
  match = setAssist.match;

  const cpu = stepCpuRally(match, source.difficulty, source.cpuMemory, dt);
  match = cpu.match;
  let cpuMemory = cpu.cpuMemory;

  let blockHoldStartedAt = source.blockHoldStartedAt;
  let powerHoldStartedAt = source.powerHoldStartedAt;
  let powerEvent: ReworkEvent | null = null;
  const actionsBeforePower = resolveReworkActions(match);

  if (input.powerCancelled) {
    blockHoldStartedAt = null;
    powerHoldStartedAt = null;
  }

  if (!input.powerCancelled && input.powerPressed && actionsBeforePower.power === 'SERVE' && powerHoldStartedAt === null) {
    powerHoldStartedAt = match.time;
  }
  if (!input.powerCancelled && input.powerPressed && actionsBeforePower.power === 'BLOCK_READY' && blockHoldStartedAt === null) {
    blockHoldStartedAt = match.time;
  }

  if (!input.powerCancelled && input.powerReleased && actionsBeforePower.power === 'SERVE' && powerHoldStartedAt !== null) {
    const focus = match.players.find((player) => player.id === FOCUS_PLAYER_ID);
    if (focus) {
      const ball = performServe(
        match.ball,
        focus,
        serveTarget(input.powerSwipe),
        'FLOAT',
        servePower(match.time - powerHoldStartedAt),
      );
      match = startRallyWithBall(match, ball);
      powerEvent = { type: 'SERVE', actorId: focus.id };
    }
    powerHoldStartedAt = null;
  } else if (!input.powerCancelled && input.powerReleased && blockHoldStartedAt !== null) {
    if (opponentAttackSequence(match)) {
      match = startFocusJump(match);
      powerEvent = { type: 'JUMP', actorId: FOCUS_PLAYER_ID };
    }
    blockHoldStartedAt = null;
  }

  if (blockHoldStartedAt !== null && !opponentAttackSequence(match)) {
    blockHoldStartedAt = null;
  }
  if (powerHoldStartedAt !== null && resolveReworkActions(match).power !== 'SERVE') {
    powerHoldStartedAt = null;
  }

  const block = tryFocusBlock(match);
  match = block.match;

  const userAction = applyUserAction(match, input);
  match = userAction.match;

  match = stepMatch(match, MATCH_INPUT_IDLE, dt);

  let event =
    block.event ??
    powerEvent ??
    userAction.event ??
    cpu.event ??
    teammateReceive.event ??
    setAssist.event;

  if (
    match.score.home !== scoreBefore.home ||
    match.score.away !== scoreBefore.away
  ) {
    event = {
      type: 'POINT',
      value: match.score.home > scoreBefore.home ? 1 : -1,
    };
  }

  if (match.rally.phase === 'POINT' || match.rally.phase === 'MATCH_OVER') {
    blockHoldStartedAt = null;
    powerHoldStartedAt = null;
    cpuMemory = {};
  }

  return withResolvedActions({
    ...source,
    match,
    blockHoldStartedAt,
    powerHoldStartedAt,
    cpuMemory,
    lastEvent: event,
  });
}
