import { getReceiveAssist } from '../characters/abilities';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import { COURT } from '../core/constants';
import type { MatchState, Vec3 } from '../core/types';
import { BALL_GRAVITY, predictLanding } from './ballPhysics';

export interface LandingAssist {
  position: Vec3;
  radius: number;
  opacity: number;
}

function timeToFloor(state: MatchState): number {
  const ball = state.ball;
  const discriminant =
    ball.velocity.y * ball.velocity.y + 2 * BALL_GRAVITY * Math.max(0, ball.position.y);
  return Math.max(0, (ball.velocity.y + Math.sqrt(discriminant)) / BALL_GRAVITY);
}

export function getLandingAssist(
  state: MatchState,
  controlledPlayerId: string,
): LandingAssist | null {
  if (state.rally.phase !== 'RALLY' || !state.ball.inPlay || state.ball.velocity.z >= -0.05) {
    return null;
  }

  const player = state.players.find(
    (candidate) => candidate.id === controlledPlayerId && candidate.side === 'home',
  );
  if (!player) return null;

  const character = STARTER_ROSTER[player.characterId as CharacterId];
  if (!character) return null;
  const assist = getReceiveAssist(character);
  const visibilityLead = 0.45 + assist.predictionLead;
  if (timeToFloor(state) > visibilityLead) return null;

  const landing = predictLanding(state.ball);
  const insideHomeCourt =
    landing.z <= 0 &&
    landing.z >= -COURT.length / 2 &&
    Math.abs(landing.x) <= COURT.width / 2;
  if (!insideHomeCourt) return null;

  return {
    position: { x: landing.x, y: 0.025, z: landing.z },
    radius: 0.55 + assist.predictionError * 0.5,
    opacity: Math.min(0.86, 0.32 + assist.perfectWindow * 2.8),
  };
}
