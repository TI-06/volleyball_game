import { BALL_GRAVITY } from '../ball/ballPhysics';
import type { Vec3 } from '../core/types';

export interface ServeTrajectoryInput {
  origin: Vec3;
  target: Vec3;
  aggression: number;
  netHeight: number;
}

export interface ServeTrajectory {
  velocity: Vec3;
  flightSeconds: number;
  predictedNetHeight: number;
}

const MIN_FLIGHT_SECONDS = 0.72;
const MAX_FLIGHT_SECONDS = 1.65;
const LOW_AGGRESSION_CLEARANCE = 0.46;
const HIGH_AGGRESSION_CLEARANCE = 0.28;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function predictServePosition(origin: Vec3, velocity: Vec3, seconds: number): Vec3 {
  return {
    x: origin.x + velocity.x * seconds,
    y: origin.y + velocity.y * seconds - 0.5 * BALL_GRAVITY * seconds * seconds,
    z: origin.z + velocity.z * seconds,
  };
}

function requiredFlightSecondsForNetClearance(
  input: ServeTrajectoryInput,
  desiredNetHeight: number,
): number {
  const deltaZ = input.target.z - input.origin.z;
  if (Math.abs(deltaZ) < 0.001) {
    return MIN_FLIGHT_SECONDS;
  }

  const netFraction = clamp((0 - input.origin.z) / deltaZ, 0, 1);
  if (netFraction <= 0 || netFraction >= 1) {
    return MIN_FLIGHT_SECONDS;
  }

  const linearHeight =
    input.origin.y * (1 - netFraction) + input.target.y * netFraction;
  const liftCoefficient = BALL_GRAVITY * netFraction * (1 - netFraction);
  const requiredLift = Math.max(0, desiredNetHeight - linearHeight);

  return Math.sqrt((2 * requiredLift) / liftCoefficient);
}

export function solveServeTrajectory(input: ServeTrajectoryInput): ServeTrajectory {
  const aggression = clamp01(input.aggression);
  const desiredClearance = lerp(
    LOW_AGGRESSION_CLEARANCE,
    HIGH_AGGRESSION_CLEARANCE,
    aggression,
  );
  const desiredNetHeight = input.netHeight + desiredClearance;
  const paceFlightSeconds = lerp(1.3, 1.1, aggression);
  const clearanceFlightSeconds = requiredFlightSecondsForNetClearance(
    input,
    desiredNetHeight,
  );
  const flightSeconds = clamp(
    Math.max(paceFlightSeconds, clearanceFlightSeconds),
    MIN_FLIGHT_SECONDS,
    MAX_FLIGHT_SECONDS,
  );

  const velocity = {
    x: (input.target.x - input.origin.x) / flightSeconds,
    y:
      (input.target.y -
        input.origin.y +
        0.5 * BALL_GRAVITY * flightSeconds * flightSeconds) /
      flightSeconds,
    z: (input.target.z - input.origin.z) / flightSeconds,
  };

  const deltaZ = input.target.z - input.origin.z;
  const netFraction =
    Math.abs(deltaZ) < 0.001 ? 0 : clamp((0 - input.origin.z) / deltaZ, 0, 1);
  const netT = flightSeconds * netFraction;
  const predictedNetHeight = predictServePosition(input.origin, velocity, netT).y;

  return {
    velocity,
    flightSeconds,
    predictedNetHeight,
  };
}
