import { predictLanding } from '../ball/ballPhysics';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import { COURT } from '../core/constants';
import type { MatchState, PlayerState } from '../core/types';

export type HomeReceiveOwner = 'home-0' | 'home-1' | 'home-2';

const RECEIVE_ABILITY_DISTANCE_BONUS = 0.012;
const FOCUS_PLAYER_CONTROL_BIAS = 0.45;

function receiveAbility(player: PlayerState): number {
  return STARTER_ROSTER[player.characterId as CharacterId]?.abilities.receive ?? 0;
}

function receiveScore(player: PlayerState, landingX: number, landingZ: number): number {
  const distance = Math.hypot(
    player.position.x - landingX,
    player.position.z - landingZ,
  );
  const focusBias = player.id === 'home-0' ? FOCUS_PLAYER_CONTROL_BIAS : 0;
  return distance - receiveAbility(player) * RECEIVE_ABILITY_DISTANCE_BONUS - focusBias;
}

function landsInsideHomeCourt(x: number, z: number): boolean {
  return (
    Math.abs(x) <= COURT.width / 2 &&
    z <= 0 &&
    z >= -COURT.length / 2
  );
}

export function chooseHomeReceiveOwner(state: MatchState): HomeReceiveOwner | null {
  const landing = predictLanding(state.ball);
  if (!landsInsideHomeCourt(landing.x, landing.z)) return null;

  const candidates = state.players.filter(
    (player): player is PlayerState & { id: HomeReceiveOwner } =>
      player.id === 'home-0' || player.id === 'home-1' || player.id === 'home-2',
  );

  const selected = [...candidates].sort((a, b) => {
    const scoreDelta = receiveScore(a, landing.x, landing.z) - receiveScore(b, landing.x, landing.z);
    if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
    return a.id.localeCompare(b.id);
  })[0];

  return selected?.id ?? 'home-0';
}
