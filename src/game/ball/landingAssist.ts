import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import { COURT } from '../core/constants';
import type { MatchState, Vec3 } from '../core/types';
import { predictLanding } from './ballPhysics';

export interface LandingAssist {
  position: Vec3;
  radius: number;
  opacity: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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

  const landing = predictLanding(state.ball);
  const insideHomeCourt =
    landing.z <= 0 &&
    landing.z >= -COURT.length / 2 &&
    Math.abs(landing.x) <= COURT.width / 2;
  if (!insideHomeCourt) return null;

  const character = STARTER_ROSTER[player.characterId as CharacterId];
  if (!character) return null;

  const receive = clamp01(character.abilities.receive / 100);
  return {
    position: { x: landing.x, y: 0.025, z: landing.z },
    radius: 1.35 - receive * 0.75,
    opacity: 0.26 + receive * 0.56,
  };
}
