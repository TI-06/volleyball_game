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
  if (ball.lastContact !== 'SPIKE') {
    return { quality: 'MISS', touched: false, ball };
  }

  const wallTimingBonus = character.trait === 'WALL' ? 0.025 : 0;
  const timing = classifyContactTiming(
    timingOffsetSeconds,
    0.055 + character.abilities.block * 0.0009 + wallTimingBonus,
  );
  const reach = getBlockReach(character);

  if (timing === 'MISS' || Math.abs(horizontalErrorMeters) > reach) {
    return { quality: 'MISS', touched: false, ball };
  }

  const reboundScale: Record<Exclude<ContactQuality, 'MISS'>, number> = {
    PERFECT: 0.82,
    GREAT: 0.58,
    GOOD: 0.42,
    BAD: 0.28,
  };
  const reboundY: Record<Exclude<ContactQuality, 'MISS'>, number> = {
    PERFECT: -3.4,
    GREAT: 0.85,
    GOOD: 2.2,
    BAD: 3.05,
  };
  const scale = reboundScale[timing];

  return {
    quality: timing,
    touched: true,
    ball: {
      ...ball,
      velocity: {
        x: ball.velocity.x * 0.72,
        y: reboundY[timing],
        z: -ball.velocity.z * scale,
      },
      spin: {
        x: ball.spin.x * 0.45,
        y: ball.spin.y * 0.45,
        z: ball.spin.z * 0.45,
      },
      lastTouchedBy: blockerId,
      lastContact: 'BLOCK',
      inPlay: true,
      attackTimingBonus: 0,
    },
  };
}
