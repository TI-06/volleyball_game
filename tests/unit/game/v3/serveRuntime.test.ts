import { describe, expect, it } from 'vitest';
import { createV3MatchRuntime } from '../../../../src/game/v3/core/runtime';

describe('V3 serve opening runtime', () => {
  it('creates a deterministic CPU serve opening with HINA reading the receive', () => {
    const first = createV3MatchRuntime(73);
    const second = createV3MatchRuntime(73);

    expect(first).toEqual(second);
    expect(first.phase).toBe('SERVE_READY');
    expect(first.serve?.side).toBe('away');
    expect(first.serve?.serverPlayerId).toBe('away-0');
    expect(first.controlledPlayerId).toBe('home-2');
    expect(first.serve?.target.z).toBeLessThan(-4.5);
    expect(first.serve?.idealContactAt).toBeGreaterThan(0.4);
    expect(first.serve?.landingAt).toBeGreaterThan(first.serve?.idealContactAt ?? 0);
    expect(first.rally.landingTarget).toEqual(first.serve?.target);
  });

  it('can create a home serve opening with KAI behind the baseline', () => {
    const state = createV3MatchRuntime(73, 'home');
    const kai = state.players.find((player) => player.id === 'home-0');

    expect(state.phase).toBe('SERVE_READY');
    expect(state.serve?.side).toBe('home');
    expect(state.serve?.serverPlayerId).toBe('home-0');
    expect(state.controlledPlayerId).toBe('home-0');
    expect(state.serve?.target.z).toBeGreaterThan(4.5);
    expect(state.serve?.contactAt).toBeNull();
    expect(kai?.position.z).toBeLessThan(-8);
  });
});
