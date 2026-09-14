import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { getReworkMarkerState } from '../../../../src/game/rework/render/markerState';

describe('rework marker state', () => {
  it('shows receive landing guidance for an incoming opponent ball', () => {
    const state = createMatch(10);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'away-0',
      lastContact: 'SPIKE',
      position: { x: -1, y: 3.2, z: -2.5 },
      velocity: { x: 0.2, y: -1.2, z: -4.5 },
    };
    const markers = getReworkMarkerState(state, 'home-0');
    expect(markers.receiveLanding).not.toBeNull();
    expect(markers.approach).toBeNull();
  });

  it('shows approach and attack lanes after a teammate set to KAI', () => {
    const state = createMatch(11);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'home-1',
      lastContact: 'SET',
      position: { x: 0, y: 2.9, z: -1.4 },
      velocity: { x: 0, y: 2.2, z: 0.8 },
    };
    const markers = getReworkMarkerState(state, 'home-0');
    expect(markers.approach).not.toBeNull();
    expect(markers.attackLanes).toHaveLength(3);
    expect(markers.receiveLanding).toBeNull();
  });
});
