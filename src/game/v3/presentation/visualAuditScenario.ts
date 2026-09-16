import {
  createV3Runtime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeState,
} from '../core/runtime';

export type V3VisualAuditScenario = 'initial' | 'receive' | 'set' | 'spike';

const AUDIT_STEP_SECONDS = 1 / 60;
const LOCAL_AUDIT_HOSTS = new Set(['localhost', '127.0.0.1']);
const NAMED_AUDIT_SCENARIOS = new Set<V3VisualAuditScenario>([
  'initial',
  'receive',
  'set',
  'spike',
]);

export function parseV3VisualAuditScenario(
  hostname: string,
  search: string,
): V3VisualAuditScenario | null {
  if (!LOCAL_AUDIT_HOSTS.has(hostname)) return null;

  const value = new URLSearchParams(search).get('v3audit');
  if (value === '1') return 'initial';
  if (!value || !NAMED_AUDIT_SCENARIOS.has(value as V3VisualAuditScenario)) return null;
  return value as V3VisualAuditScenario;
}

export function isV3ManualE2EMode(hostname: string, search: string): boolean {
  if (!LOCAL_AUDIT_HOSTS.has(hostname)) return false;
  return new URLSearchParams(search).get('v3e2e') === 'manual';
}

const advanceTo = (source: V3RuntimeState, targetTime: number): V3RuntimeState => {
  let state = source;
  while (state.time + 0.000001 < targetTime) {
    const dt = Math.min(AUDIT_STEP_SECONDS, targetTime - state.time);
    state = stepV3Runtime(state, emptyV3RuntimeInput(), dt);
  }
  return state;
};

const placeReceiverAtLanding = (source: V3RuntimeState): V3RuntimeState => ({
  ...source,
  players: source.players.map((player) =>
    player.id === source.controlledPlayerId
      ? { ...player, position: { ...source.rally.landingTarget } }
      : player,
  ),
});

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
