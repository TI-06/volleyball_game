import type { CpuDifficulty } from '../ai/difficulty';
import type { MatchState } from '../core/types';
import { resetReworkFormation } from './formation';
import { tryAutomaticHomeServe } from './homeServeAI';
import {
  createReworkRuntime as createCoreRuntime,
  stepReworkRuntime as stepCoreRuntime,
} from './runtime';
import type { ReworkInput, ReworkRuntimeState } from './types';

const TEAMMATE_SERVE_WINDUP_SECONDS = 0.45;
const FOCUS_PLAYER_ID = 'home-0';

function currentHomeServerId(match: MatchState): string | null {
  if (match.rally.phase !== 'SERVE_READY' || match.rally.servingSide !== 'home') {
    return null;
  }
  const home = match.players.filter((player) => player.side === 'home');
  return home[match.rally.serverIndex.home % home.length]?.id ?? null;
}

function teammateServeNeedsWindup(match: MatchState): boolean {
  const serverId = currentHomeServerId(match);
  return serverId !== null && serverId !== FOCUS_PLAYER_ID;
}

function clearAutoServeWindup(runtime: ReworkRuntimeState): ReworkRuntimeState {
  return runtime.homeAutoServeReadyAt == null
    ? runtime
    : { ...runtime, homeAutoServeReadyAt: null };
}

export function createReworkRuntime(
  seed: number,
  difficulty: CpuDifficulty,
): ReworkRuntimeState {
  return {
    ...createCoreRuntime(seed, difficulty),
    homeAutoServeReadyAt: null,
  };
}

export function stepReworkRuntime(
  source: ReworkRuntimeState,
  input: ReworkInput,
  dt: number,
): ReworkRuntimeState {
  const effectiveInput = source.match.rally.phase === 'SERVE_READY'
    ? { ...input, moveAxis: 0 }
    : input;

  if (source.match.rally.phase === 'POINT') {
    const stepped = stepCoreRuntime(source, effectiveInput, dt);
    if (stepped.match.rally.phase !== 'SERVE_READY') {
      return stepped;
    }
    const reset = {
      ...stepped,
      match: resetReworkFormation(stepped.match),
      blockHoldStartedAt: null,
      powerHoldStartedAt: null,
      cpuMemory: {},
      lastEvent: null,
    };
    return teammateServeNeedsWindup(reset.match)
      ? {
          ...reset,
          homeAutoServeReadyAt: reset.match.time + TEAMMATE_SERVE_WINDUP_SECONDS,
        }
      : { ...reset, homeAutoServeReadyAt: null };
  }

  if (!teammateServeNeedsWindup(source.match)) {
    return stepCoreRuntime(clearAutoServeWindup(source), effectiveInput, dt);
  }

  const readyAt = source.homeAutoServeReadyAt;
  if (readyAt == null) {
    return stepCoreRuntime(
      {
        ...source,
        homeAutoServeReadyAt: source.match.time + TEAMMATE_SERVE_WINDUP_SECONDS,
      },
      effectiveInput,
      dt,
    );
  }

  if (source.match.time < readyAt) {
    return stepCoreRuntime(source, effectiveInput, dt);
  }

  const teammateServe = tryAutomaticHomeServe(source.match);
  if (!teammateServe.event) {
    return stepCoreRuntime(clearAutoServeWindup(source), effectiveInput, dt);
  }

  const stepped = stepCoreRuntime(
    {
      ...source,
      match: teammateServe.match,
      homeAutoServeReadyAt: null,
    },
    effectiveInput,
    dt,
  );
  return stepped.lastEvent?.type === 'POINT'
    ? stepped
    : { ...stepped, lastEvent: teammateServe.event, homeAutoServeReadyAt: null };
}
