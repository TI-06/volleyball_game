import { getSpikeTimingWindow } from '../characters/abilities';
import type { CharacterDefinition } from '../characters/roster';
import type { BallState, ContactQuality, Vec3 } from '../core/types';
import { classifyContactTiming, CONTACT_POWER_MULTIPLIER } from './timing';

export type AttackIntent = 'POWER' | 'CROSS' | 'LINE' | 'TIP' | 'BLOCK_OUT';

const INTENT_SPEED: Record<AttackIntent, number> = {
  POWER: 1,
  CROSS: 0.94,
  LINE: 0.96,
  TIP: 0.28,
  BLOCK_OUT: 0.84,
};

export interface SpikeResult {
  quality: ContactQuality;
  ball: BallState;
  speedMetersPerSecond: number;
}

function normalize(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function performSpike(
  ball: BallState,
  character: CharacterDefinition,
  attackerId: string,
  target: Vec3,
  timingOffsetSeconds: number,
  intent: AttackIntent,
): SpikeResult {
  const blockOutTimingBonus =
    character.trait === 'TOOL_THE_BLOCK' && intent === 'BLOCK_OUT' ? 0.025 : 0;
  const quality = classifyContactTiming(
    timingOffsetSeconds,
    getSpikeTimingWindow(character) + (ball.attackTimingBonus ?? 0) + blockOutTimingBonus,
  );

  if (quality === 'MISS') {
    return { quality, ball: { ...ball, attackTimingBonus: 0 }, speedMetersPerSecond: 0 };
  }

  const rawSpeed = 16 + character.abilities.power * 0.18;
  const heavyFinishBonus =
    character.trait === 'HEAVY_FINISH' && quality === 'PERFECT' ? 1.08 : 1;
  const blockOutBonus =
    character.trait === 'TOOL_THE_BLOCK' && intent === 'BLOCK_OUT' ? 1.05 : 1;
  const speed =
    rawSpeed *
    CONTACT_POWER_MULTIPLIER[quality] *
    INTENT_SPEED[intent] *
    heavyFinishBonus *
    blockOutBonus;
  const direction = normalize({
    x: target.x - ball.position.x,
    y: target.y - ball.position.y,
    z: target.z - ball.position.z,
  });
  const forwardSign = Math.sign(direction.z) || 1;

  return {
    quality,
    speedMetersPerSecond: speed,
    ball: {
      ...ball,
      velocity: {
        x: direction.x * speed,
        y: direction.y * speed,
        z: direction.z * speed,
      },
      spin: intent === 'TIP' ? { x: 0, y: 0, z: 0 } : { x: 22 * forwardSign, y: 0, z: 0 },
      inPlay: true,
      lastTouchedBy: attackerId,
      attackTimingBonus: 0,
    },
  };
}
