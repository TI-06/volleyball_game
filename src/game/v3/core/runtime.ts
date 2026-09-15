import { attackIntentFromGesture, resolveJumpTiming, type V3AttackIntent } from '../actions/attack';
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
const RECEIVE_PREP_IDEAL_LEAD = 0.24;
const DIVE_EXTRA_REACH_METERS = 1.2;
const DIVE_ALIGNMENT_MIN = 0.35;

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

export interface V3RallyRuntime {
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

function landingTarget(seed: number, rallyIndex: number): V3Vec2 {
  return {
    x: 1.55 + sample01(seed, rallyIndex, 0x51ed270b) * 1.35,
    z: -5.25 - sample01(seed, rallyIndex, 0x68bc21eb) * 1.7,
  };
}

function rallyFor(seed: number, rallyIndex: number): V3RallyRuntime {
  return {
    landingTarget: landingTarget(seed, rallyIndex),
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
  return {
    seed: source.seed,
    time: 0,
    phase: 'DEFENSE_READ',
    controlledPlayerId: 'home-2',
    players: base.players,
    ball: {
      position: opponentBallAt(0, rally),
      velocity: { x: 0, y: 0, z: 0 },
    },
    score,
    rallyIndex,
    rally,
    forecast: forecastFor(0, rally, source.seed, rallyIndex),
    bufferedAction: null,
    lastEvent,
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
  return {
    seed: base.seed,
    time: 0,
    phase: base.phase,
    controlledPlayerId: base.controlledPlayerId,
    players: base.players,
    ball: {
      position: opponentBallAt(0, rally),
      velocity: { x: 0, y: 0, z: 0 },
    },
    score: { home: 0, away: 0 },
    rallyIndex: 0,
    rally,
    forecast: forecastFor(0, rally, base.seed, 0),
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

  if (input.actionPressed && (phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP')) {
    bufferedAction = bufferAction('ACTION', source.time);
    phase = 'RECEIVE_PREP';
  }

  if (input.divePressed && (phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP')) {
    const defender = players.find((player) => player.id === source.controlledPlayerId);
    const direction =
      normalizeDirection(input.move) ??
      (defender ? directionToward(defender.position, source.rally.landingTarget) : undefined);
    bufferedAction = bufferAction('DIVE', source.time, direction);
    phase = 'RECEIVE_PREP';
  }

  const nextTime = source.time + safeDt;

  if (
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

  if (input.jumpPressed && phase === 'ATTACK_APPROACH' && rally.idealJumpAt !== null) {
    const quality = resolveJumpTiming(source.time - rally.idealJumpAt);
    if (quality !== 'MISS') {
      phase = 'ATTACK_AIRBORNE';
      rally = { ...rally, jumpQuality: quality };
      lastEvent = { type: 'JUMP', quality, actorId: controlledPlayerId };
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
      phase === 'DEFENSE_READ' || phase === 'RECEIVE_PREP'
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
