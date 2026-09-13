import type { CharacterDefinition } from './roster';

function clampAbility(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function normalized(value: number): number {
  return clampAbility(value) / 100;
}

function lerp(min: number, max: number, amount: number): number {
  return min + (max - min) * amount;
}

export interface ReceiveAssist {
  predictionLead: number;
  predictionError: number;
  perfectWindow: number;
}

export interface MovementProfile {
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
  turnRate: number;
  jumpHeight: number;
  jumpAcceleration: number;
}

export function getReceiveAssist(character: CharacterDefinition): ReceiveAssist {
  const value = normalized(character.abilities.receive);
  return {
    predictionLead: lerp(0.25, 0.85, value),
    predictionError: lerp(1.35, 0.15, value),
    perfectWindow: lerp(0.055, 0.18, value),
  };
}

export function getSpikeTimingWindow(character: CharacterDefinition): number {
  return lerp(0.07, 0.19, normalized(character.abilities.spike));
}

export function getBlockReach(character: CharacterDefinition): number {
  return lerp(0.28, 0.62, normalized(character.abilities.block));
}

export function getSetAssist(character: CharacterDefinition): {
  targetError: number;
  perfectWindowBonus: number;
} {
  const value = normalized(character.abilities.set);
  return {
    targetError: lerp(0.9, 0.12, value),
    perfectWindowBonus: lerp(0.01, 0.085, value),
  };
}

export function getReadAssist(character: CharacterDefinition): {
  reactionBias: number;
  predictionErrorScale: number;
} {
  const value = normalized(character.abilities.read);
  return {
    reactionBias: lerp(0.12, 0, value),
    predictionErrorScale: lerp(1.35, 0.65, value),
  };
}

export function getMovementProfile(character: CharacterDefinition): MovementProfile {
  const speed = normalized(character.abilities.speed);
  const jump = normalized(character.abilities.jump);
  return {
    maxSpeed: lerp(5.8, 9.4, speed),
    acceleration: lerp(16, 30, speed),
    deceleration: lerp(18, 32, speed),
    turnRate: lerp(5.5, 10.5, speed),
    jumpHeight: lerp(0.72, 1.34, jump),
    jumpAcceleration: lerp(10.5, 16.5, jump),
  };
}
