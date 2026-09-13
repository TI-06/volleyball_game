import { correctReceiveTrajectory } from '../ball/ballCorrection';
import { getReceiveAssist } from '../characters/abilities';
import type { CharacterDefinition } from '../characters/roster';
import type { BallState, ContactQuality, Vec3 } from '../core/types';
import { classifyContactTiming } from './timing';

export interface ReceiveResult {
  quality: ContactQuality;
  ball: BallState;
}

export function performReceive(
  ball: BallState,
  character: CharacterDefinition,
  receiverId: string,
  setterTarget: Vec3,
  timingOffsetSeconds: number,
): ReceiveResult {
  const assist = getReceiveAssist(character);
  const quality = classifyContactTiming(timingOffsetSeconds, assist.perfectWindow);
  const corrected = correctReceiveTrajectory(ball, setterTarget, quality);

  return {
    quality,
    ball:
      quality === 'MISS'
        ? { ...corrected, attackTimingBonus: 0 }
        : {
            ...corrected,
            lastTouchedBy: receiverId,
            inPlay: true,
            attackTimingBonus: 0,
          },
  };
}
