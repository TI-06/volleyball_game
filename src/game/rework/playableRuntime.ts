import type { CpuDifficulty } from '../ai/difficulty';
import { resetReworkFormation } from './formation';
import { tryAutomaticHomeServe } from './homeServeAI';
import {
  createReworkRuntime as createCoreRuntime,
  stepReworkRuntime as stepCoreRuntime,
} from './runtime';
import type { ReworkInput, ReworkRuntimeState } from './types';

export function createReworkRuntime(
  seed: number,
  difficulty: CpuDifficulty,
): ReworkRuntimeState {
  return createCoreRuntime(seed, difficulty);
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
    return {
      ...stepped,
      match: resetReworkFormation(stepped.match),
      blockHoldStartedAt: null,
      powerHoldStartedAt: null,
      cpuMemory: {},
      lastEvent: null,
    };
  }

  const teammateServe = tryAutomaticHomeServe(source.match);
  if (!teammateServe.event) {
    return stepCoreRuntime(source, effectiveInput, dt);
  }

  const stepped = stepCoreRuntime(
    { ...source, match: teammateServe.match },
    effectiveInput,
    dt,
  );
  return stepped.lastEvent?.type === 'POINT'
    ? stepped
    : { ...stepped, lastEvent: teammateServe.event };
}
