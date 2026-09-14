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
  if (source.match.rally.phase === 'POINT') {
    const stepped = stepCoreRuntime(source, input, dt);
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
    return stepCoreRuntime(source, input, dt);
  }

  const stepped = stepCoreRuntime(
    { ...source, match: teammateServe.match },
    input,
    dt,
  );
  return stepped.lastEvent?.type === 'POINT'
    ? stepped
    : { ...stepped, lastEvent: teammateServe.event };
}
