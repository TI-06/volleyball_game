import type { CharacterDefinition } from '../characters/roster';
import type { BallState, ContactQuality, Vec3 } from '../core/types';
import { performReceive } from './receive';

const DOWNGRADE: Record<ContactQuality, ContactQuality> = {
  PERFECT: 'GREAT',
  GREAT: 'GOOD',
  GOOD: 'BAD',
  BAD: 'BAD',
  MISS: 'MISS',
};

export function performDive(
  ball: BallState,
  character: CharacterDefinition,
  playerId: string,
  setterTarget: Vec3,
  timingOffsetSeconds: number,
): {
  quality: ContactQuality;
  ball: BallState;
  recoverySeconds: number;
} {
  const receive = performReceive(
    ball,
    character,
    playerId,
    setterTarget,
    timingOffsetSeconds + 0.035,
  );
  const quality = DOWNGRADE[receive.quality];

  if (quality === 'MISS') {
    return { quality, ball: receive.ball, recoverySeconds: 0.78 };
  }

  const correctionScale = quality === 'GREAT' ? 0.9 : quality === 'GOOD' ? 0.78 : 0.62;

  return {
    quality,
    ball: {
      ...receive.ball,
      lastContact: 'DIVE',
      velocity: {
        x: receive.ball.velocity.x * correctionScale,
        y: receive.ball.velocity.y * correctionScale,
        z: receive.ball.velocity.z * correctionScale,
      },
    },
    recoverySeconds: character.trait === 'NEVER_DOWN' ? 0.42 : 0.68,
  };
}
