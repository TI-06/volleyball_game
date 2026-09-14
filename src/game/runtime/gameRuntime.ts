import { performServe } from '../actions/serve';
import { chooseCpuServeTarget } from '../ai/serveTargeting';
import { integrateBall } from '../ball/ballPhysics';
import { STARTER_ROSTER, type CharacterId } from '../characters/roster';
import {
  createMatchRuntime,
  getCurrentAction,
  requestRuntimeSwitch,
  stepMatchRuntime as stepPlayableRuntime,
  type MatchRuntimeState,
  type RuntimeEvent,
  type RuntimeInput,
} from './playableRuntime';

export {
  createMatchRuntime,
  getCurrentAction,
  requestRuntimeSwitch,
};
export type {
  MatchRuntimeState,
  RuntimeEvent,
  RuntimeInput,
};

function currentAwayServer(runtime: MatchRuntimeState) {
  if (
    runtime.match.rally.phase !== 'SERVE_READY' ||
    runtime.match.rally.servingSide !== 'away'
  ) {
    return null;
  }

  const away = runtime.match.players.filter((player) => player.side === 'away');
  return away[runtime.match.rally.serverIndex.away % away.length] ?? null;
}

export function stepMatchRuntime(
  source: MatchRuntimeState,
  input: RuntimeInput,
  dt: number,
): MatchRuntimeState {
  const expectedServer = currentAwayServer(source);
  const stepped = stepPlayableRuntime(source, input, dt);

  if (
    !expectedServer ||
    stepped.lastEvent?.type !== 'SERVE' ||
    stepped.lastEvent.actorId !== expectedServer.id ||
    stepped.match.ball.lastContact !== 'SERVE' ||
    stepped.match.ball.lastTouchedBy !== expectedServer.id
  ) {
    return stepped;
  }

  const server =
    stepped.match.players.find((player) => player.id === expectedServer.id) ?? expectedServer;
  const receivers = stepped.match.players
    .filter((player) => player.side === 'home')
    .map((player) => ({
      id: player.id,
      x: player.position.x,
      z: player.position.z,
      receive:
        STARTER_ROSTER[player.characterId as CharacterId]?.abilities.receive ?? 50,
    }));
  const rallyIndex = source.match.score.home + source.match.score.away;
  const target = chooseCpuServeTarget(
    source.difficulty,
    source.match.seed,
    rallyIndex,
    receivers,
  );
  const serveKind = source.difficulty === 'BEGINNER' ? 'FLOAT' : 'JUMP';
  const servedBall = performServe(
    source.match.ball,
    server,
    target,
    serveKind,
    0.68,
  );

  return {
    ...stepped,
    match: {
      ...stepped.match,
      ball: integrateBall(servedBall, dt),
    },
  };
}
