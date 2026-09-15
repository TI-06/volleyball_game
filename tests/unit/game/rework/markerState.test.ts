import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { getReworkMarkerState } from '../../../../src/game/rework/render/markerState';

type TransitionMarkers = ReturnType<typeof getReworkMarkerState> & {
  setterId?: string | null;
  setterPosition?: { x: number; y: number; z: number } | null;
  setterTarget?: { x: number; y: number; z: number } | null;
  approachStage?: 'PREP' | 'GO' | null;
};

describe('rework marker state', () => {
  it('shows receive landing guidance for a KAI-owned incoming ball', () => {
    const state = createMatch(10);
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
    expect(markers.receiveLanding).not.toBeNull();
    expect(markers.approach).toBeNull();
  });

  it('does not show KAI receive guidance for a teammate-owned ball', () => {
    const state = createMatch(10);
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
    expect(markers.receiveLanding).toBeNull();
  });

  it('does not show receive guidance for a ball predicted to land out', () => {
    const state = createMatch(10);
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
    expect(markers.receiveLanding).toBeNull();
  });

  it('bridges a KAI first touch into REN set guidance and a pre-approach cue', () => {
    const state = createMatch(13);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'home-0',
      lastContact: 'RECEIVE',
      position: { x: -1.15, y: 2.15, z: -2.35 },
      velocity: { x: 0.2, y: 1.2, z: 0.25 },
    };

    const markers = getReworkMarkerState(state, 'home-0') as TransitionMarkers;
    expect(markers.setterId).toBe('home-1');
    expect(markers.setterPosition).not.toBeNull();
    expect(markers.setterTarget).toEqual(
      expect.objectContaining({ x: expect.any(Number), z: expect.any(Number) }),
    );
    expect(markers.approachStage).toBe('PREP');
    expect(markers.approach).not.toBeNull();
    expect(markers.approach?.z).toBeLessThanOrEqual(-2.4);
    expect(markers.attackLanes).toHaveLength(0);
  });

  it('shows HINA as emergency setter after REN takes first touch', () => {
    const state = createMatch(14);
    state.rally.phase = 'RALLY';
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'home-1',
      lastContact: 'RECEIVE',
      position: { x: 0.9, y: 2.0, z: -2.1 },
      velocity: { x: 0, y: 1.1, z: 0.2 },
    };

    const markers = getReworkMarkerState(state, 'home-0') as TransitionMarkers;
    expect(markers.setterId).toBe('home-2');
    expect(markers.setterPosition).not.toBeNull();
    expect(markers.setterTarget).not.toBeNull();
    expect(markers.approachStage).toBe('PREP');
  });

  it('shows only the approach marker while KAI is still in the back court', () => {
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
    const markers = getReworkMarkerState(state, 'home-0') as TransitionMarkers;
    expect(markers.approach).not.toBeNull();
    expect(markers.approachStage).toBe('GO');
    expect(markers.setterPosition ?? null).toBeNull();
    expect(markers.setterTarget ?? null).toBeNull();
    expect(markers.attackLanes).toHaveLength(0);
    expect(markers.receiveLanding).toBeNull();
  });

  it('switches to attack lanes once KAI enters the attack zone', () => {
    const state = createMatch(12);
    state.rally.phase = 'RALLY';
    state.players = state.players.map((player) =>
      player.id === 'home-0'
        ? { ...player, position: { ...player.position, z: -1.8 } }
        : player,
    );
    state.ball = {
      ...state.ball,
      inPlay: true,
      lastTouchedBy: 'home-1',
      lastContact: 'SET',
      position: { x: 0, y: 2.9, z: -1.2 },
      velocity: { x: 0, y: 1.1, z: 0.7 },
    };
    const markers = getReworkMarkerState(state, 'home-0') as TransitionMarkers;
    expect(markers.approach).toBeNull();
    expect(markers.approachStage).toBe('GO');
    expect(markers.attackLanes).toHaveLength(3);
  });
});