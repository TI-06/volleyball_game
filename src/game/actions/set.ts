import { BALL_GRAVITY } from '../ball/ballPhysics';
import { getSetAssist } from '../characters/abilities';
import type { CharacterDefinition } from '../characters/roster';
import type { BallState, ContactQuality, Vec3 } from '../core/types';
import { classifyContactTiming } from './timing';

export type SetTempo = 'QUICK' | 'NORMAL' | 'HIGH';

const FLIGHT_TIME: Record<SetTempo, number> = {
  QUICK: 0.46,
  NORMAL: 0.72,
  HIGH: 1.05,
};

export interface SetResult {
  quality: ContactQuality;
  ball: BallState;
}

function nextAttackTimingBonus(
  character: CharacterDefinition,
  quality: ContactQuality,
): number {
  if (quality === 'PERFECT') {
    return character.trait === 'CLEAN_CONNECTION' ? 0.045 : 0.018;
  }
  if (quality === 'GREAT') {
    return character.trait === 'CLEAN_CONNECTION' ? 0.018 : 0.008;
  }
  return 0;
}

export function performSet(
  ball: BallState,
  character: CharacterDefinition,
  setterId: string,
  target: Vec3,
  timingOffsetSeconds: number,
  tempo: SetTempo,
): SetResult {
  const assist = getSetAssist(character);
  const quality = classifyContactTiming(
    timingOffsetSeconds,
    0.065 + assist.perfectWindowBonus,
  );

  if (quality === 'MISS') {
    return { quality, ball };
  }

  const qualityScale: Record<Exclude<ContactQuality, 'MISS'>, number> = {
    PERFECT: 1,
    GREAT: 0.9,
    GOOD: 0.76,
    BAD: 0.58,
  };
  const scale = qualityScale[quality];
  const tempoScale = character.trait === 'FAST_TEMPO' && tempo === 'QUICK' ? 0.82 : 1;
  const t = FLIGHT_TIME[tempo] * tempoScale;
  const ideal = {
    x: (target.x - ball.position.x) / t,
    y: (target.y - ball.position.y + 0.5 * BALL_GRAVITY * t * t) / t,
    z: (target.z - ball.position.z) / t,
  };

  return {
    quality,
    ball: {
      ...ball,
      velocity: {
        x: ball.velocity.x + (ideal.x - ball.velocity.x) * scale,
        y: ball.velocity.y + (ideal.y - ball.velocity.y) * scale,
        z: ball.velocity.z + (ideal.z - ball.velocity.z) * scale,
      },
      spin: { x: 0, y: 0, z: 0 },
      inPlay: true,
      lastTouchedBy: setterId,
      attackTimingBonus: nextAttackTimingBonus(character, quality),
    },
  };
}
