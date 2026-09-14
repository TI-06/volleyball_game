import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { getReworkMarkerState } from '../../../../src/game/rework/render/markerState';

describe('rework marker guidance v2', () => {
  it('identifies the one selected home receive owner', () => {
    const state = createMatch(8110);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'away-0',
      lastContact: 'SPIKE',
      position: { x: 2.5, y: 1.1, z: -5.0 },
      velocity: { x: 0, y: -1.2, z: -0.8 },
    };

    const markers = getReworkMarkerState(state, 'home-0');
    expect(markers.receiveOwnerId).toMatch(/^home-[0-2]$/);
    expect(markers.receiveOwnerId).not.toBe('home-0');
    expect(markers.receiveOwnerPosition).not.toBeNull();
    expect(markers.receiveLanding).toBeNull();
  });

  it('shows KAI landing target when KAI owns the receive', () => {
    const state = createMatch(8111);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'away-0',
      lastContact: 'SPIKE',
      position: { x: -2.5, y: 1.4, z: -4.9 },
      velocity: { x: 0, y: -1.2, z: -1.0 },
    };

    const markers = getReworkMarkerState(state, 'home-0');
    expect(markers.receiveOwnerId).toBe('home-0');
    expect(markers.receiveOwnerPosition).not.toBeNull();
    expect(markers.receiveLanding).not.toBeNull();
  });

  it('does not mark a receive owner for a predicted OUT ball', () => {
    const state = createMatch(8112);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'away-0',
      lastContact: 'SPIKE',
      position: { x: -2.5, y: 1.2, z: -5.0 },
      velocity: { x: -8, y: -1.0, z: -1.0 },
    };

    const markers = getReworkMarkerState(state, 'home-0');
    expect(markers.receiveOwnerId).toBeNull();
    expect(markers.receiveOwnerPosition).toBeNull();
    expect(markers.receiveLanding).toBeNull();
  });

  it('exposes a safe default opponent-court serve target for KAI', () => {
    const state = createMatch(8113);
    const markers = getReworkMarkerState(state, 'home-0');
    expect(markers.serveTarget).toEqual(
      expect.objectContaining({ x: 0, z: 6.7 }),
    );
    expect(markers.serveTarget?.aggression).toBeGreaterThanOrEqual(0);
  });

  it('moves the serve preview laterally with swipe aim while staying in bounds', () => {
    const state = createMatch(8114);
    const markers = getReworkMarkerState(
      state,
      'home-0',
      { x: 70, y: 0, durationMs: 240 },
    );
    expect(markers.serveTarget).not.toBeNull();
    expect(markers.serveTarget!.x).toBeLessThan(0);
    expect(Math.abs(markers.serveTarget!.x)).toBeLessThanOrEqual(3.4);
    expect(markers.serveTarget!.z).toBe(6.7);
  });
});
