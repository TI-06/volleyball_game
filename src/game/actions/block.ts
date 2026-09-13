import { getBlockReach } from '../characters/abilities';
import type { CharacterDefinition } from '../characters/roster';
import type { BallState, ContactQuality } from '../core/types';
import { classifyContactTiming } from './timing';

export interface BlockResult {
  quality: ContactQuality;
  touched: boolean;
  ball: BallState;
}

export function performBlock(
  ball: BallState,
  character: CharacterDefinition,
  blockerId: string,
  timingOffsetSeconds: number,
  horizontalErrorMeters: number,
): BlockResult {
  const timing = classifyContactTiming(
    timingOffsetSeconds,
    0.055 + character.abilities.block * 0.0009,
  );
  const reach = getBlockReach(character);

  if (timing === 'MISS' || Math.abs(horizontalErrorMeters) > reach) {
    return { quality: 'MISS', touched: false, ball };
  }

  const reboundScale: Record<Exclude<ContactQuality, 'MISS'>, number> = {
    PERFECT: 0.74,
    GREAT: 0.56,
    GOOD: 0.4,
    BAD: 0.25,
  };
  const scale = reboundScale[timing];

  return {
    quality: timing,
    touched: true,
    ball: {
      ...ball,
      velocity: {
        x: ball.velocity.x * 0.72,
        y: Math.max(2.4, Math.abs(ball.velocity.y) * 0.34),
        z: -ball.velocity.z * scale,
      },
      spin: {
        x: ball.spin.x * 0.45,
        y: ball.spin.y * 0.45,
        z: ball.spin.z * 0.45,
      },
      lastTouchedBy: blockerId,
      inPlay: true,
    },
  };
}
