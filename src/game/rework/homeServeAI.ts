import { performServe } from '../actions/serve';
import { startRallyWithBall } from '../core/rally';
import type { MatchState, Vec3 } from '../core/types';
import type { ReworkEvent } from './types';

const FOCUS_PLAYER_ID = 'home-0';

function currentHomeServer(match: MatchState) {
  if (match.rally.phase !== 'SERVE_READY' || match.rally.servingSide !== 'home') {
    return null;
  }
  const home = match.players.filter((player) => player.side === 'home');
  return home[match.rally.serverIndex.home % home.length] ?? null;
}

function teammateServeTarget(match: MatchState, serverId: string): Vec3 {
  const rallyIndex = match.score.home + match.score.away;
  const idIndex = Number(serverId.split('-')[1]) || 0;
  const laneIndex = (rallyIndex + idIndex) % 3;
  const x = laneIndex === 0 ? -2.5 : laneIndex === 2 ? 2.5 : 0;
  return { x, y: 0, z: 6.6 };
}

export function tryAutomaticHomeServe(
  match: MatchState,
): { match: MatchState; event: ReworkEvent | null } {
  const server = currentHomeServer(match);
  if (!server || server.id === FOCUS_PLAYER_ID) {
    return { match, event: null };
  }

  const ball = performServe(
    match.ball,
    server,
    teammateServeTarget(match, server.id),
    'FLOAT',
    0.64,
  );
  return {
    match: startRallyWithBall(match, ball),
    event: { type: 'SERVE', actorId: server.id },
  };
}
