import { performServe } from '../actions/serve';
import { startRallyWithBall } from '../core/rally';
import type { ReworkRuntimeState } from './types';

export function prepareReworkTutorial(source: ReworkRuntimeState): ReworkRuntimeState {
  const kai = source.match.players.find((player) => player.id === source.focusPlayerId);
  const server = source.match.players.find((player) => player.id === 'away-0');
  if (!kai || !server) return source;

  const match = {
    ...source.match,
    rally: {
      ...source.match.rally,
      phase: 'SERVE_READY' as const,
      servingSide: 'away' as const,
      serverIndex: { ...source.match.rally.serverIndex, away: 0 },
    },
  };
  const ball = performServe(
    match.ball,
    server,
    { x: kai.position.x, y: 0, z: kai.position.z - 0.25 },
    'FLOAT',
    0.48,
  );

  return {
    ...source,
    match: startRallyWithBall(match, ball),
    cpuMemory: {},
    lastEvent: { type: 'SERVE', actorId: server.id },
  };
}
