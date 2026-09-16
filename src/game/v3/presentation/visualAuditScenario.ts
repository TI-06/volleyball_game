import {
  createV3Runtime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeState,
} from '../core/runtime';

export type V3VisualAuditScenario = 'initial' | 'receive' | 'set' | 'spike';

const AUDIT_STEP_SECONDS = 1 / 60;

function advanceTo(source: V3RuntimeState, targetTime: number): V3RuntimeState {
  let state = source;
  while (state.time + 0.000001 < targetTime) {
    const dt = Math.min(AUDIT_STEP_SECONDS, targetTime - state.time);
    state = stepV3Runtime(state, emptyV3RuntimeInput(), dt);
  }
  return state;
}

function placeReceiverAtLanding(source: V3RuntimeState): V3RuntimeState {
  return {
    ...source,
    players: source.players.map((player) =>
      player.id === source.controlledPlayerId
        ? { ...player, position: { ...source.rally.landingTarget } }
        : player,
    ),
  };
}

function successfulReceive(seed: number): V3RuntimeState {
  let state = placeReceiverAtLanding(createV3Runtime(seed));
  state = advanceTo(state, state.rally.receiveContactAt - 0.24);
  state = stepV3Runtime(
    state,
    { ...emptyV3RuntimeInput(), actionPressed: true },
    AUDIT_STEP_SECONDS,
  );
  state = advanceTo(state, state.rally.receiveContactAt + 0.04);
  return state;
}

function setContact(seed: number): V3RuntimeState {
  let state = successfulReceive(seed);
  const setContactAt = state.rally.setContactAt;
  if (setContactAt === null) return state;
  state = advanceTo(state, setContactAt + 0.02);
  return state;
}

function spikeWindup(seed: number): V3RuntimeState {
  let state = setContact(seed);
  const idealJumpAt = state.rally.idealJumpAt;
  const attackContactAt = state.rally.attackContactAt;
  if (idealJumpAt === null || attackContactAt === null) return state;

  state = advanceTo(state, idealJumpAt);
  state = stepV3Runtime(
    state,
    { ...emptyV3RuntimeInput(), jumpPressed: true },
    AUDIT_STEP_SECONDS,
  );
  state = advanceTo(state, attackContactAt - 0.12);
  return state;
}

export function createV3VisualAuditState(
  scenario: V3VisualAuditScenario,
  seed = 73,
): V3RuntimeState {
  if (scenario === 'receive') return successfulReceive(seed);
  if (scenario === 'set') return setContact(seed);
  if (scenario === 'spike') return spikeWindup(seed);
  return createV3Runtime(seed);
}
