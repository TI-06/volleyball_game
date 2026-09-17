import { attackIntentFromGesture, resolveJumpTiming, type V3AttackIntent } from '../actions/attack';
import { resolveBlockResult, type V3BlockResult } from '../actions/block';
import { resolveReceiveQuality } from '../actions/receive';
import {
  bufferAction,
  isBufferedActionActive,
  type V3BufferedAction,
} from '../controls/inputBuffer';
import { createLandingForecast, type LandingForecast } from '../prediction/landingForecast';
import type {
  V3ContactQuality,
  V3PlayerState,
  V3RallyPhase,
  V3TeamSide,
  V3Vec2,
  V3Vec3,
} from '../types';
import { createV3PrototypeState } from './createV3State';
import { moveControlledPlayer } from './movement';

const PLAYER_SPEED_METERS_PER_SECOND = 5.2;
const OPPONENT_CONTACT_AT = 0.95;
const RECEIVE_CONTACT_AT = 1.95;
const SET_CONTACT_DELAY = 0.55;
const ATTACKER_SWITCH_DELAY = 0.15;
const JUMP_LEAD_AFTER_SET = 0.45;
const ATTACK_CONTACT_AFTER_JUMP = 0.34;
const JUMP_EARLY_EDGE_SECONDS = 0.3;
const RECEIVE_PREP_IDEAL_LEAD = 0.24;
const DIVE_EXTRA_REACH_METERS = 1.2;
const DIVE_ALIGNMENT_MIN = 0.35;
const QUICK_ATTACK_RATE = 0.22;
const QUICK_ATTACK_KIND_SALT = 0x8899;
const QUICK_ATTACK_LANE_SALT = 0x74d3;
const BLOCKER_NET_Z = -1.05;
const BLOCKER_START_OFFSET_X = 1.25;
const SERVE_IDEAL_CONTACT_AT = 0.72;
const SERVE_FLIGHT_SECONDS = 1.08;
const SERVE_BASELINE_Z = 8.25;
const SERVE_TARGET_X_SALT = 0x5e11;
const SERVE_TARGET_Z_SALT = 0x5e12;
const TOUCH_COVER_DURATION_SECONDS = 1.25;
const DEFLECT_COVER_DURATION_SECONDS = 0.85;
const BLOCK_CONTINUATION_SIDE_SALT = 0x4b10;
const BLOCK_CONTINUATION_DISTANCE_SALT = 0x4b11;
const BLOCK_CONTINUATION_DEPTH_SALT = 0x4b12;

export interface V3Score {
  home: number;
  away: number;
}

export interface V3RuntimeInput {
  move: V3Vec2;
  actionPressed: boolean;
  divePressed: boolean;
  jumpPressed: boolean;
  attackGesture: { x: number; y: number } | null;
}

export type V3RuntimeEvent =
  | { type: 'RECEIVE'; quality: V3ContactQuality; actorId: string }
  | { type: 'BLOCK'; result: V3BlockResult; actorId: string }
  | { type: 'SET'; actorId: string }
  | { type: 'JUMP'; quality: V3ContactQuality; actorId: string }
  | {
      type: 'ATTACK';
      quality: V3ContactQuality;
      intent: V3AttackIntent;
      actorId: string;
      point: 'home' | 'away';
    }
  | { type: 'POINT'; point: 'home' | 'away' };

export type V3DefenseKind = 'RECEIVE' | 'BLOCK';

export interface V3ServeRuntime {
  side: V3TeamSide;
  serverPlayerId: string;
  target: V3Vec2;
  idealContactAt: number;
  contactAt: number | null;
  landingAt: number;
}

export interface V3RallyRuntime {
  defenseKind: V3DefenseKind;
  blockLaneX: number | null;
  landingTarget: V3Vec2;
  opponentContactAt: number;
  receiveContactAt: number;
  setContactAt: number | null;
  attackerSwitchAt: number | null;
  idealJumpAt: number | null;
  attackContactAt: number | null;
  receivePosition: V3Vec2 | null;
  jumpQuality: V3ContactQuality | null;
}

export interface V3RuntimeState {
  seed: number;
  time: number;
  phase: V3RallyPhase;
  controlledPlayerId: string;
  players: V3PlayerState[];
  ball: { position: V3Vec3; velocity: V3Vec3 };
  score: V3Score;
  rallyIndex: number;
  rally: V3RallyRuntime;
  serve: V3ServeRuntime | null;
  forecast: LandingForecast | null;
  bufferedAction: V3BufferedAction | null;
  lastEvent: V3RuntimeEvent | null;
}

export function emptyV3RuntimeInput(): V3RuntimeInput {
  return {
    move: { x: 0, z: 0 },
    actionPressed: false,
    divePressed: false,
    jumpPressed: false,
    attackGesture: null,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function normalizeDirection(direction: V3Vec2): V3Vec2 | undefined {
  const length = Math.hypot(direction.x, direction.z);
  if (!Number.isFinite(length) || length < 0.01) return undefined;
  return { x: direction.x / length, z: direction.z / length };
}

function directionToward(from: V3Vec2, to: V3Vec2): V3Vec2 | undefined {
  return normalizeDirection({ x: to.x - from.x, z: to.z - from.z });
}

function sample01(seed: number, rallyIndex: number, salt: number): number {
  let value = (seed ^ Math.imul(rallyIndex + 1, 0x9e3779b1) ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97) >>> 0;
  value ^= value >>> 15;
  return (value >>> 0) / 0x100000000;
}

function serveTarget(seed: number, rallyIndex: number, side: V3TeamSide): V3Vec2 {
  const x = lerp(-2.8, 2.8, sample01(seed, rallyIndex, SERVE_TARGET_X_SALT));
  const depth = 5.15 + sample01(seed, rallyIndex, SERVE_TARGET_Z_SALT) * 1.55;
  return { x, z: side === 'home' ? depth : -depth };
}

function serveFor(seed: number, rallyIndex: number, side: V3TeamSide): V3ServeRuntime {
  const idealContactAt = SERVE_IDEAL_CONTACT_AT;
  return {
    side,
    serverPlayerId: side === 'home' ? 'home-0' : 'away-0',
    target: serveTarget(seed, rallyIndex, side),
    idealContactAt,
    contactAt: side === 'away' ? idealContactAt : null,
    landingAt: idealContactAt + SERVE_FLIGHT_SECONDS,
  };
}

function playersForServe(players: V3PlayerState[], serve: V3ServeRuntime): V3PlayerState[] {
  return players.map((player) =>
    player.id === serve.serverPlayerId
      ? {
          ...player,
          position: {
            x: 0,
            z: serve.side === 'home' ? -SERVE_BASELINE_Z : SERVE_BASELINE_Z,
          },
        }
      : player,
  );
}

function serveReadyBallAt(serve: V3ServeRuntime, time: number): V3Vec3 {
  const direction = serve.side === 'home' ? -1 : 1;
  const toss = clamp01(time / Math.max(0.001, serve.idealContactAt));
  return {
    x: 0,
    y: 1.35 + Math.sin(toss * Math.PI * 0.5) * 1.05,
    z: direction * SERVE_BASELINE_Z,
  };
}

function serveFlightBallAt(serve: V3ServeRuntime, time: number): V3Vec3 {
  const contactAt = serve.contactAt ?? serve.idealContactAt;
  const t = clamp01((time - contactAt) / Math.max(0.001, serve.landingAt - contactAt));
  const startZ = serve.side === 'home' ? -SERVE_BASELINE_Z : SERVE_BASELINE_Z;
  return {
    x: lerp(0, serve.target.x, t),
    y: lerp(2.4, 1.05, t) + 4 * t * (1 - t) * 0.95,
    z: lerp(startZ, serve.target.z, t),
  };
}

function serveForecastFor(
  time: number,
  serve: V3ServeRuntime,
  seed: number,
  rallyIndex: number,
): LandingForecast {
  const contactAt = serve.contactAt ?? serve.idealContactAt;
  const flightProgress = clamp01(
    (time - contactAt) / Math.max(0.001, serve.landingAt - contactAt),
  );
  return createLandingForecast({
    stage: flightProgress < 0.5 ? 'CONTACT_READ' : 'FLIGHT_CONFIRMED',
    readOrigin: { x: 0, z: serve.side === 'away' ? -4.7 : 4.7 },
    actualLanding: serve.target,
    noiseSample: sample01(seed, rallyIndex, 0x5e13) * 2 - 1,
  });
}

function landingTarget(seed: number, rallyIndex: number): V3Vec2 {
  return {
    x: 1.55 + sample01(seed, rallyIndex, 0x51ed270b) * 1.35,
    z: -5.25 - sample01(seed, rallyIndex, 0x68bc21eb) * 1.7,
  };
}

function blockContinuationTarget(
  result: Exclude<V3BlockResult, 'STUFF'>,
  seed: number,
  rallyIndex: number,
  blockLaneX: number | null,
): V3Vec2 {
  const base = landingTarget(seed, rallyIndex);
  if (result === 'MISS') return base;

  if (result === 'TOUCH') {
    const lane = blockLaneX ?? 0;
    return {
      x: clamp(lerp(base.x, lane, 0.65), -3.5, 3.5),
      z: -3.55 - sample01(seed, rallyIndex, BLOCK_CONTINUATION_DEPTH_SALT) * 0.55,
    };
  }

  const lane = blockLaneX ?? 0;
  const side = sample01(seed, rallyIndex, BLOCK_CONTINUATION_SIDE_SALT) < 0.5 ? -1 : 1;
  const distance =
    1.8 + sample01(seed, rallyIndex, BLOCK_CONTINUATION_DISTANCE_SALT) * 0.65;
  return {
    x: clamp(lane + side * distance, -3.65, 3.65),
    z: -4.45 - sample01(seed, rallyIndex, BLOCK_CONTINUATION_DEPTH_SALT) * 0.75,
  };
}

function blockContinuationDuration(result: Exclude<V3BlockResult, 'STUFF'>): number {
  if (result === 'TOUCH') return TOUCH_COVER_DURATION_SECONDS;
  if (result === 'DEFLECT') return DEFLECT_COVER_DURATION_SECONDS;
  return RECEIVE_CONTACT_AT - OPPONENT_CONTACT_AT;
}

function defenseKindFor(seed: number, rallyIndex: number): V3DefenseKind {
  return sample01(seed, rallyIndex, QUICK_ATTACK_KIND_SALT) < QUICK_ATTACK_RATE
    ? 'BLOCK'
    : 'RECEIVE';
}

function blockLaneFor(seed: number, rallyIndex: number): number {
  return lerp(-2.2, 2.2, sample01(seed, rallyIndex, QUICK_ATTACK_LANE_SALT));
}

function rallyFor(seed: number, rallyIndex: number): V3RallyRuntime {
  const defenseKind = defenseKindFor(seed, rallyIndex);
  const blockLaneX = defenseKind === 'BLOCK' ? blockLaneFor(seed, rallyIndex) : null;
  return {
    defenseKind,
    blockLaneX,
    landingTarget:
      defenseKind === 'BLOCK' && blockLaneX !== null
        ? { x: blockLaneX, z: -0.9 }
        : landingTarget(seed, rallyIndex),
    opponentContactAt: OPPONENT_CONTACT_AT,
    receiveContactAt: RECEIVE_CONTACT_AT,
    setContactAt: null,
    attackerSwitchAt: null,
    idealJumpAt: null,
    attackContactAt: null,
    receivePosition: null,
    jumpQuality: null,
  };
}

function controlledPlayerForRally(rally: V3RallyRuntime): string {
  return rally.defenseKind === 'BLOCK' ? 'home-0' : 'home-2';
}

function playersForRally(players: V3PlayerState[], rally: V3RallyRuntime): V3PlayerState[] {
  const blockLaneX = rally.blockLaneX;
  if (rally.defenseKind !== 'BLOCK' || blockLaneX === null) return players;
  return players.map((player) =>
    player.id === 'home-0'
      ? {
          ...player,
          position: {
            x: Math.min(3.55, blockLaneX + BLOCKER_START_OFFSET_X),
            z: BLOCKER_NET_Z,
          },
        }
      : player,
  );
}

function forecastStage(time: number, rally: V3RallyRuntime) {
  if (time < 0.38) return 'SET_READ' as const;
  if (time < 0.74) return 'APPROACH_READ' as const;
  if (time < rally.opponentContactAt) return 'CONTACT_READ' as const;
  return 'FLIGHT_CONFIRMED' as const;
}

function forecastFor(time: number, rally: V3RallyRuntime, seed: number, rallyIndex: number) {
  if (time > rally.receiveContactAt) return null;
  const stage = forecastStage(time, rally);
  return createLandingForecast({
    stage,
    readOrigin: { x: 0.35, z: -4.25 },
    actualLanding: rally.landingTarget,
    noiseSample: sample01(seed, rallyIndex, 0x02e5be93) * 2 - 1,
  });
}

function opponentBallAt(time: number, rally: V3RallyRuntime): V3Vec3 {
  if (time < rally.opponentContactAt) {
    const t = clamp01(time / rally.opponentContactAt);
    return {
      x: lerp(0.25, -1.15, t),
      y: 2.45 + Math.sin(t * Math.PI) * 0.68,
      z: lerp(2.85, 0.9, t),
    };
  }
  const t = clamp01(
    (time - rally.opponentContactAt) /
      Math.max(0.001, rally.receiveContactAt - rally.opponentContactAt),
  );
  return {
    x: lerp(-1.15, rally.landingTarget.x, t),
    y: lerp(3.05, 1.05, t) + 4 * t * (1 - t) * 0.32,
    z: lerp(0.9, rally.landingTarget.z, t),
  };
}

function passBallAt(time: number, rally: V3RallyRuntime): V3Vec3 {
  const setAt = rally.setContactAt ?? time;
  const startAt = rally.receiveContactAt;
  const t = clamp01((time - startAt) / Math.max(0.001, setAt - startAt));
  const start = rally.receivePosition ?? rally.landingTarget;
  return {
    x: lerp(start.x, 0, t),
    y: lerp(1.05, 2.25, t) + 4 * t * (1 - t) * 0.7,
    z: lerp(start.z, -2.0, t),
  };
}

function setBallAt(time: number, rally: V3RallyRuntime): V3Vec3 {
  const setAt = rally.setContactAt ?? time;
  const contactAt = rally.attackContactAt ?? setAt + 0.8;
  const t = clamp01((time - setAt) / Math.max(0.001, contactAt - setAt));
  return {
    x: lerp(0, -2.55, t),
    y: lerp(2.25, 2.85, t) + 4 * t * (1 - t) * 1.0,
    z: lerp(-2.0, -0.82, t),
  };
}

function ballFor(state: V3RuntimeState, nextTime: number): V3Vec3 {
  if (state.phase === 'SERVE_READY' && state.serve) {
    return serveReadyBallAt(state.serve, nextTime);
  }
  if (state.phase === 'SERVE_FLIGHT' && state.serve) {
    return serveFlightBallAt(state.serve, nextTime);
  }
  if (state.phase === 'DEFENSE_READ' || state.phase === 'RECEIVE_PREP') {
    return opponentBallAt(nextTime, state.rally);
  }
  if (state.phase === 'SET_BUILDUP') {
    if (state.rally.setContactAt !== null && nextTime >= state.rally.setContactAt) {
      return setBallAt(nextTime, state.rally);
    }
    return passBallAt(nextTime, state.rally);
  }
  if (state.phase === 'ATTACK_APPROACH' || state.phase === 'ATTACK_AIRBORNE') {
    return setBallAt(nextTime, state.rally);
  }
  return state.ball.position;
}

function movementSpeed(input: V3Vec2): number {
  return Math.min(1, Math.hypot(input.x, input.z)) * PLAYER_SPEED_METERS_PER_SECOND;
}

function moveControlled(state: V3RuntimeState, input: V3RuntimeInput, dt: number): V3PlayerState[] {
  return state.players.map((player) =>
    player.id === state.controlledPlayerId
      ? {
          ...player,
          position: moveControlledPlayer(
            player.position,
            input.move,
            PLAYER_SPEED_METERS_PER_SECOND,
            dt,
          ),
        }
      : player,
  );
}

function diveAdjustedDistance(
  action: V3BufferedAction,
  defenderPosition: V3Vec2,
  landing: V3Vec2,
  distance: number,
): number {
  if (action.kind !== 'DIVE' || !action.direction || distance <= 0.001) return distance;
  const toward = directionToward(defenderPosition, landing);
  const diveDirection = normalizeDirection(action.direction);
  if (!toward || !diveDirection) return distance;
  const alignment = toward.x * diveDirection.x + toward.z * diveDirection.z;
  if (alignment < DIVE_ALIGNMENT_MIN) return distance;
  return Math.max(0, distance - DIVE_EXTRA_REACH_METERS * alignment);
}

function resetForNextRally(
  source: V3RuntimeState,
  score: V3Score,
  lastEvent: V3RuntimeEvent,
): V3RuntimeState {
  const rallyIndex = source.rallyIndex + 1;
  const base = createV3PrototypeState(source.seed + rallyIndex);
  const rally = rallyFor(source.seed, rallyIndex);
  const players = playersForRally(base.players, rally);
  return {
    seed: source.seed,
    time: 0,
    phase: 'DEFENSE_READ',
    controlledPlayerId: controlledPlayerForRally(rally),
    players,
    ball: {
      position: opponentBallAt(0, rally),
      velocity: { x: 0, y: 0, z: 0 },
    },
    score,
    rallyIndex,
    rally,
    serve: null,
    forecast: forecastFor(0, rally, source.seed, rallyIndex),
    bufferedAction: null,
    lastEvent,
  };
}

function resolveBlockContact(source: V3RuntimeState, players: V3PlayerState[]): V3RuntimeState {
  const blocker = players.find((player) => player.id === 'home-0');
  const action = source.bufferedAction;
  const active =
    action?.kind === 'JUMP_BLOCK' &&
    isBufferedActionActive(action, source.rally.opponentContactAt);
  const result: V3BlockResult =
    active && blocker && source.rally.blockLaneX !== null
      ? resolveBlockResult({
          timingOffsetSeconds: action.createdAt - source.rally.opponentContactAt,
          lateralErrorMeters: blocker.position.x - source.rally.blockLaneX,
        })
      : 'MISS';
  const event: V3RuntimeEvent = { type: 'BLOCK', result, actorId: 'home-0' };

  if (result === 'STUFF') {
    return resetForNextRally(
      { ...source, players, time: source.rally.opponentContactAt },
      { home: source.score.home + 1, away: source.score.away },
      event,
    );
  }

  const receiveTarget = blockContinuationTarget(
    result,
    source.seed,
    source.rallyIndex,
    source.rally.blockLaneX,
  );
  const receiveContactAt =
    source.rally.opponentContactAt + blockContinuationDuration(result);
  const rally: V3RallyRuntime = {
    ...source.rally,
    defenseKind: 'RECEIVE',
    blockLaneX: null,
    landingTarget: receiveTarget,
    receiveContactAt,
    setContactAt: null,
    attackerSwitchAt: null,
    idealJumpAt: null,
    attackContactAt: null,
    receivePosition: null,
    jumpQuality: null,
  };
  const contactAt = source.rally.opponentContactAt;
  return {
    ...source,
    time: contactAt,
    phase: 'DEFENSE_READ',
    controlledPlayerId: 'home-2',
    players,
    ball: {
      position: opponentBallAt(contactAt, source.rally),
      velocity: { x: 0, y: 0, z: 0 },
    },
    rally,
    forecast: forecastFor(contactAt, rally, source.seed, source.rallyIndex),
    bufferedAction: null,
    lastEvent: event,
  };
}

function resolveReceiveContact(
  source: V3RuntimeState,
  input: V3RuntimeInput,
  players: V3PlayerState[],
): V3RuntimeState {
  const action = source.bufferedAction;
  const defender = players.find((player) => player.id === source.controlledPlayerId);
  const active = action ? isBufferedActionActive(action, source.rally.receiveContactAt) : false;
  const receiveAction = action?.kind === 'ACTION' || action?.kind === 'DIVE';
  if (!active || !defender || !action || !receiveAction) {
    return resetForNextRally(
      source,
      { home: source.score.home, away: source.score.away + 1 },
      { type: 'POINT', point: 'away' },
    );
  }

  const rawDistance = Math.hypot(
    defender.position.x - source.rally.landingTarget.x,
    defender.position.z - source.rally.landingTarget.z,
  );
  const distance = diveAdjustedDistance(
    action,
    defender.position,
    source.rally.landingTarget,
    rawDistance,
  );
  const preparationLead = source.rally.receiveContactAt - action.createdAt;
  const timingOffset = Math.max(0, Math.abs(preparationLead - RECEIVE_PREP_IDEAL_LEAD));
  const quality = resolveReceiveQuality({
    timingOffsetSeconds: timingOffset,
    distanceMeters: distance,
    movementSpeedMetersPerSecond: movementSpeed(input.move),
  });
  if (quality === 'MISS') {
    return resetForNextRally(
      source,
      { home: source.score.home, away: source.score.away + 1 },
      { type: 'POINT', point: 'away' },
    );
  }

  const setContactAt = source.rally.receiveContactAt + SET_CONTACT_DELAY;
  return {
    ...source,
    time: source.rally.receiveContactAt,
    phase: 'SET_BUILDUP',
    controlledPlayerId: source.controlledPlayerId,
    players,
    ball: {
      position: { x: defender.position.x, y: 1.05, z: defender.position.z },
      velocity: { x: 0, y: 0, z: 0 },
    },
    rally: {
      ...source.rally,
      setContactAt,
      attackerSwitchAt: source.rally.receiveContactAt + ATTACKER_SWITCH_DELAY,
      idealJumpAt: setContactAt + JUMP_LEAD_AFTER_SET,
      attackContactAt: setContactAt + JUMP_LEAD_AFTER_SET + ATTACK_CONTACT_AFTER_JUMP,
      receivePosition: { ...defender.position },
    },
    serve: null,
    forecast: null,
    bufferedAction: null,
    lastEvent: { type: 'RECEIVE', quality, actorId: defender.id },
  };
}

function attackRoll(seed: number, rallyIndex: number, intent: V3AttackIntent): number {
  const saltByIntent: Record<V3AttackIntent, number> = {
    TIP: 0x31b4,
    LINE: 0x4281,
    CROSS: 0x59d2,
    POWER: 0x6a73,
  };
  return sample01(seed, rallyIndex, saltByIntent[intent]);
}

function resolveAttack(source: V3RuntimeState, intent: V3AttackIntent): V3RuntimeState {
  const quality = source.rally.jumpQuality ?? 'BAD';
  const threshold = quality === 'PERFECT' ? 0.82 : quality === 'GOOD' ? 0.7 : quality === 'BAD' ? 0.52 : 0;
  const homePoint = attackRoll(source.seed, source.rallyIndex, intent) < threshold;
  const point = homePoint ? 'home' : 'away';
  return resetForNextRally(
    source,
    {
      home: source.score.home + (homePoint ? 1 : 0),
      away: source.score.away + (homePoint ? 0 : 1),
    },
    {
      type: 'ATTACK',
      quality,
      intent,
      actorId: source.controlledPlayerId,
      point,
    },
  );
}

export function createV3Runtime(seed = 1): V3RuntimeState {
  const base = createV3PrototypeState(seed);
  const rally = rallyFor(base.seed, 0);
  const players = playersForRally(base.players, rally);
  return {
    seed: base.seed,
    time: 0,
    phase: base.phase,
    controlledPlayerId: controlledPlayerForRally(rally),
    players,
    ball: {
      position: opponentBallAt(0, rally),
      velocity: { x: 0, y: 0, z: 0 },
    },
    score: { home: 0, away: 0 },
    rallyIndex: 0,
    rally,
    serve: null,
    forecast: forecastFor(0, rally, base.seed, 0),
    bufferedAction: null,
    lastEvent: null,
  };
}

export function createV3MatchRuntime(
  seed = 1,
  servingSide: V3TeamSide = 'away',
): V3RuntimeState {
  const base = createV3PrototypeState(seed);
  const serve = serveFor(base.seed, 0, servingSide);
  const baseRally = rallyFor(base.seed, 0);
  const rally: V3RallyRuntime = {
    ...baseRally,
    defenseKind: 'RECEIVE',
    blockLaneX: null,
    landingTarget: { ...serve.target },
    receiveContactAt: serve.landingAt,
  };
  const players = playersForServe(base.players, serve);

  return {
    seed: base.seed,
    time: 0,
    phase: 'SERVE_READY',
    controlledPlayerId: servingSide === 'home' ? 'home-0' : 'home-2',
    players,
    ball: {
      position: serveReadyBallAt(serve, 0),
      velocity: { x: 0, y: 0, z: 0 },
    },
    score: { home: 0, away: 0 },
    rallyIndex: 0,
    rally,
    serve,
    forecast: null,
    bufferedAction: null,
    lastEvent: null,
  };
}

export function stepV3Runtime(
  source: V3RuntimeState,
  input: V3RuntimeInput,
  dt: number,
): V3RuntimeState {
  if (!Number.isFinite(dt) || dt <= 0) return source;

  const safeDt = Math.min(dt, 0.05);
  const players = moveControlled(source, input, safeDt);
  let bufferedAction = source.bufferedAction;
  let phase = source.phase;
  let lastEvent: V3RuntimeEvent | null = source.lastEvent;

  if (
    source.serve?.side === 'away' &&
    phase === 'SERVE_FLIGHT' &&
    input.actionPressed
  ) {
    bufferedAction = bufferAction('ACTION', source.time);
  }

  if (
    source.serve?.side === 'away' &&
    phase === 'SERVE_FLIGHT' &&
    input.divePressed
  ) {
    bufferedAction = bufferAction('DIVE', source.time, normalizeDirection(input.move));
  }

  if (
    source.rally.defenseKind === 'RECEIVE' &&
    input.actionPressed &&
    (phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP')
  ) {
    bufferedAction = bufferAction('ACTION', source.time);
    phase = 'RECEIVE_PREP';
  }

  if (
    source.rally.defenseKind === 'RECEIVE' &&
    input.divePressed &&
    (phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP')
  ) {
    const direction = normalizeDirection(input.move);
    bufferedAction = bufferAction('DIVE', source.time, direction);
    phase = 'RECEIVE_PREP';
  }

  if (
    source.rally.defenseKind === 'BLOCK' &&
    input.jumpPressed &&
    phase === 'DEFENSE_READ'
  ) {
    bufferedAction = bufferAction('JUMP_BLOCK', source.time);
  }

  const nextTime = source.time + safeDt;

  if (
    source.serve?.side === 'away' &&
    phase === 'SERVE_READY' &&
    source.time < source.serve.idealContactAt &&
    nextTime >= source.serve.idealContactAt
  ) {
    phase = 'SERVE_FLIGHT';
  }

  if (
    source.serve?.side === 'away' &&
    phase === 'SERVE_FLIGHT' &&
    source.time < source.serve.landingAt &&
    nextTime >= source.serve.landingAt
  ) {
    return resolveReceiveContact(
      { ...source, phase, bufferedAction, time: source.time },
      input,
      players,
    );
  }

  if (
    source.rally.defenseKind === 'BLOCK' &&
    phase === 'DEFENSE_READ' &&
    source.time < source.rally.opponentContactAt &&
    nextTime >= source.rally.opponentContactAt
  ) {
    return resolveBlockContact({ ...source, phase, bufferedAction }, players);
  }

  if (
    source.rally.defenseKind === 'RECEIVE' &&
    (phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP') &&
    source.time < source.rally.receiveContactAt &&
    nextTime >= source.rally.receiveContactAt
  ) {
    return resolveReceiveContact({ ...source, phase, bufferedAction }, input, players);
  }

  let controlledPlayerId = source.controlledPlayerId;
  let rally = source.rally;

  if (
    phase === 'SET_BUILDUP' &&
    rally.attackerSwitchAt !== null &&
    nextTime >= rally.attackerSwitchAt
  ) {
    controlledPlayerId = 'home-0';
  }

  if (
    phase === 'SET_BUILDUP' &&
    rally.setContactAt !== null &&
    source.time < rally.setContactAt &&
    nextTime >= rally.setContactAt
  ) {
    phase = 'ATTACK_APPROACH';
    lastEvent = { type: 'SET', actorId: 'home-1' };
  }

  if (input.jumpPressed && rally.idealJumpAt !== null) {
    const canQueueEarly =
      phase === 'ATTACK_APPROACH' ||
      (phase === 'SET_BUILDUP' && controlledPlayerId === 'home-0');
    const quality = resolveJumpTiming(source.time - rally.idealJumpAt);

    if (phase === 'ATTACK_APPROACH' && quality !== 'MISS') {
      phase = 'ATTACK_AIRBORNE';
      rally = { ...rally, jumpQuality: quality };
      bufferedAction = null;
      lastEvent = { type: 'JUMP', quality, actorId: controlledPlayerId };
    } else if (canQueueEarly && source.time < rally.idealJumpAt - JUMP_EARLY_EDGE_SECONDS) {
      bufferedAction = bufferAction('JUMP_BLOCK', source.time);
    }
  }

  if (
    phase === 'ATTACK_APPROACH' &&
    rally.idealJumpAt !== null &&
    bufferedAction?.kind === 'JUMP_BLOCK'
  ) {
    const earlyEdgeAt = rally.idealJumpAt - JUMP_EARLY_EDGE_SECONDS;
    if (nextTime >= earlyEdgeAt && isBufferedActionActive(bufferedAction, earlyEdgeAt)) {
      const quality = resolveJumpTiming(-JUMP_EARLY_EDGE_SECONDS);
      phase = 'ATTACK_AIRBORNE';
      rally = { ...rally, jumpQuality: quality };
      bufferedAction = null;
      lastEvent = { type: 'JUMP', quality, actorId: controlledPlayerId };
    } else if (nextTime > bufferedAction.expiresAt) {
      bufferedAction = null;
    }
  }

  if (input.attackGesture && phase === 'ATTACK_AIRBORNE') {
    return resolveAttack(
      {
        ...source,
        time: nextTime,
        phase,
        controlledPlayerId,
        players,
        rally,
        bufferedAction,
      },
      attackIntentFromGesture(input.attackGesture),
    );
  }

  const intermediate: V3RuntimeState = {
    ...source,
    time: nextTime,
    phase,
    controlledPlayerId,
    players,
    rally,
    bufferedAction,
    lastEvent,
    forecast:
      phase === 'SERVE_FLIGHT' && source.serve?.side === 'away'
        ? serveForecastFor(nextTime, source.serve, source.seed, source.rallyIndex)
        : phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP'
          ? forecastFor(nextTime, rally, source.seed, source.rallyIndex)
          : null,
    ball: source.ball,
  };

  const position = ballFor(intermediate, nextTime);
  const previous = source.ball.position;
  intermediate.ball = {
    position,
    velocity: {
      x: (position.x - previous.x) / safeDt,
      y: (position.y - previous.y) / safeDt,
      z: (position.z - previous.z) / safeDt,
    },
  };
  return intermediate;
}
