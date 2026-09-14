import { predictLanding } from '../../ball/ballPhysics';
import type { MatchState, Vec3 } from '../../core/types';

export interface ReworkMarkerState {
  receiveLanding: Vec3 | null;
  approach: Vec3 | null;
  attackLanes: Vec3[];
  blockTarget: Vec3 | null;
}

function teammateSet(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'SET' &&
    (state.ball.lastTouchedBy?.startsWith('home-') ?? false)
  );
}

function opponentSet(state: MatchState): boolean {
  return (
    state.ball.lastContact === 'SET' &&
    (state.ball.lastTouchedBy?.startsWith('away-') ?? false)
  );
}

function incomingOpponentBall(state: MatchState): boolean {
  if (!(state.ball.lastTouchedBy?.startsWith('away-') ?? false)) return false;
  const landing = predictLanding(state.ball);
  return landing.z < 0 && state.ball.inPlay;
}

function blockTarget(state: MatchState): Vec3 | null {
  if (!opponentSet(state)) return null;
  const attackers = state.players
    .filter((player) => player.side === 'away' && (player.role === 'ACE' || player.role === 'MIDDLE'))
    .sort((a, b) => {
      const aDistance = Math.hypot(a.position.x - state.ball.position.x, a.position.z - state.ball.position.z);
      const bDistance = Math.hypot(b.position.x - state.ball.position.x, b.position.z - state.ball.position.z);
      return aDistance - bDistance;
    });
  const attacker = attackers[0];
  return attacker
    ? { x: attacker.position.x, y: 0.03, z: 0.45 }
    : { x: state.ball.position.x, y: 0.03, z: 0.45 };
}

export function getReworkMarkerState(
  state: MatchState,
  focusPlayerId: string,
): ReworkMarkerState {
  if (state.rally.phase === 'POINT' || state.rally.phase === 'MATCH_OVER') {
    return { receiveLanding: null, approach: null, attackLanes: [], blockTarget: null };
  }

  const focus = state.players.find((player) => player.id === focusPlayerId);
  if (!focus) {
    return { receiveLanding: null, approach: null, attackLanes: [], blockTarget: null };
  }

  if (incomingOpponentBall(state)) {
    const landing = predictLanding(state.ball);
    return {
      receiveLanding: { x: landing.x, y: 0.025, z: landing.z },
      approach: null,
      attackLanes: [],
      blockTarget: null,
    };
  }

  if (teammateSet(state)) {
    const targetX = Math.max(-3.1, Math.min(3.1, state.ball.position.x));
    return {
      receiveLanding: null,
      approach: { x: targetX, y: 0.025, z: -1.05 },
      attackLanes: [
        { x: -3.35, y: 0.025, z: 6.7 },
        { x: 0, y: 0.025, z: 6.9 },
        { x: 3.35, y: 0.025, z: 6.7 },
      ],
      blockTarget: null,
    };
  }

  return {
    receiveLanding: null,
    approach: null,
    attackLanes: [],
    blockTarget: blockTarget(state),
  };
}
