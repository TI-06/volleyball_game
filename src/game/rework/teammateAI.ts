import { predictLanding } from '../ball/ballPhysics';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import type { MatchState, PlayerState, Vec3 } from '../core/types';

export type ReworkTeammateRole = 'RECEIVE' | 'SET' | 'COVER' | 'APPROACH' | 'BASE';

export interface ReworkTeammateDecision {
  playerId: 'home-1' | 'home-2';
  role: ReworkTeammateRole;
  target: Vec3;
}

const REN_BASE: Vec3 = { x: 0, y: 0, z: -2.0 };
const HINA_BASE: Vec3 = { x: 2.6, y: 0, z: -5.4 };
const COVER_TARGET: Vec3 = { x: 0, y: 0, z: -3.3 };
const RECEIVE_ABILITY_DISTANCE_BONUS = 0.012;

function firstTouchByHome(state: MatchState): boolean {
  return (
    (state.ball.lastContact === 'RECEIVE' ||
      state.ball.lastContact === 'DIVE' ||
      state.ball.lastContact === 'BLOCK') &&
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false)
  );
}

function setTarget(state: MatchState): Vec3 {
  return {
    x: state.ball.position.x,
    y: 0,
    z: Math.min(-0.8, state.ball.position.z),
  };
}

function decision(
  playerId: 'home-1' | 'home-2',
  role: ReworkTeammateRole,
  target: Vec3,
): ReworkTeammateDecision {
  return { playerId, role, target };
}

function receiveAbility(player: PlayerState): number {
  return STARTER_ROSTER[player.characterId as CharacterId]?.abilities.receive ?? 0;
}

function receiveScore(player: PlayerState, landing: Vec3): number {
  const distance = Math.hypot(
    player.position.x - landing.x,
    player.position.z - landing.z,
  );
  return distance - receiveAbility(player) * RECEIVE_ABILITY_DISTANCE_BONUS;
}

function chooseTeammateReceiver(
  state: MatchState,
  landing: Vec3,
): 'home-1' | 'home-2' {
  const candidates = state.players.filter(
    (player): player is PlayerState & { id: 'home-1' | 'home-2' } =>
      player.id === 'home-1' || player.id === 'home-2',
  );
  const selected = [...candidates].sort((a, b) => {
    const scoreDelta = receiveScore(a, landing) - receiveScore(b, landing);
    if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
    return a.id.localeCompare(b.id);
  })[0];
  return selected?.id ?? 'home-2';
}

export function decideTeammateRoles(state: MatchState): ReworkTeammateDecision[] {
  if (firstTouchByHome(state)) {
    if (state.ball.lastTouchedBy === 'home-0') {
      return [
        decision('home-1', 'SET', setTarget(state)),
        decision('home-2', 'COVER', COVER_TARGET),
      ];
    }

    if (state.ball.lastTouchedBy === 'home-1') {
      return [
        decision('home-1', 'COVER', COVER_TARGET),
        decision('home-2', 'SET', setTarget(state)),
      ];
    }

    if (state.ball.lastTouchedBy === 'home-2') {
      return [
        decision('home-1', 'SET', setTarget(state)),
        decision('home-2', 'COVER', COVER_TARGET),
      ];
    }
  }

  const opponentAttack =
    (state.ball.lastTouchedBy?.startsWith('away-') ?? false) &&
    (state.ball.lastContact === 'SERVE' || state.ball.lastContact === 'SPIKE');

  if (opponentAttack) {
    const landing = predictLanding(state.ball);
    const receiverId = chooseTeammateReceiver(state, landing);
    const coverId: 'home-1' | 'home-2' = receiverId === 'home-1' ? 'home-2' : 'home-1';
    return [
      decision(receiverId, 'RECEIVE', {
        x: landing.x,
        y: 0,
        z: Math.min(-0.6, landing.z),
      }),
      decision(coverId, 'COVER', COVER_TARGET),
    ];
  }

  return [
    decision('home-1', 'BASE', REN_BASE),
    decision('home-2', 'BASE', HINA_BASE),
  ];
}
