import { describe, expect, it } from 'vitest';
import { deriveV3CharacterPresentation } from '../../../../src/game/v3/presentation/characterPresentation';

const base = {
  playerId: 'home-2',
  side: 'home' as const,
  currentPosition: { x: 2.6, z: -6.15 },
  previousPosition: { x: 2.6, z: -6.15 },
  dt: 1 / 60,
  phase: 'DEFENSE_READ' as const,
  controlledPlayerId: 'home-2',
  lastEvent: null,
  bufferedAction: null,
  previousMotion: 'READY' as const,
  previousMotionAge: 0,
};

describe('deriveV3CharacterPresentation', () => {
  it('derives RUN only for a player that actually moved', () => {
    const moving = deriveV3CharacterPresentation({
      ...base,
      currentPosition: { x: 2.7, z: -6.15 },
    });
    const stationary = deriveV3CharacterPresentation(base);

    expect(moving.motion).toBe('RUN');
    expect(stationary.motion).toBe('READY');
  });

  it('applies contact events only to the matching actor', () => {
    const receiver = deriveV3CharacterPresentation({
      ...base,
      phase: 'SET_BUILDUP',
      lastEvent: { type: 'RECEIVE', actorId: 'home-2' },
    });
    const teammate = deriveV3CharacterPresentation({
      ...base,
      playerId: 'home-0',
      controlledPlayerId: 'home-2',
      phase: 'SET_BUILDUP',
      lastEvent: { type: 'RECEIVE', actorId: 'home-2' },
    });

    expect(receiver.motion).toBe('RECEIVE');
    expect(teammate.motion).not.toBe('RECEIVE');
  });

  it('shows REN setting during SET_BUILDUP without forcing teammates into SET', () => {
    const ren = deriveV3CharacterPresentation({
      ...base,
      playerId: 'home-1',
      controlledPlayerId: 'home-2',
      phase: 'SET_BUILDUP',
      lastEvent: { type: 'SET', actorId: 'home-1' },
    });
    const kai = deriveV3CharacterPresentation({
      ...base,
      playerId: 'home-0',
      controlledPlayerId: 'home-2',
      phase: 'SET_BUILDUP',
      lastEvent: { type: 'SET', actorId: 'home-1' },
    });

    expect(ren.motion).toBe('SET');
    expect(kai.motion).not.toBe('SET');
  });

  it('shows DIVE only on the controlled player with an active dive buffer', () => {
    const diver = deriveV3CharacterPresentation({
      ...base,
      phase: 'RECEIVE_PREP',
      bufferedAction: { kind: 'DIVE', createdAt: 0.4, expiresAt: 0.85, consumed: false },
    });
    const teammate = deriveV3CharacterPresentation({
      ...base,
      playerId: 'home-0',
      phase: 'RECEIVE_PREP',
      bufferedAction: { kind: 'DIVE', createdAt: 0.4, expiresAt: 0.85, consumed: false },
    });

    expect(diver.motion).toBe('DIVE');
    expect(teammate.motion).not.toBe('DIVE');
  });

  it('resets pose time when motion changes and advances it while motion continues', () => {
    const changed = deriveV3CharacterPresentation({
      ...base,
      currentPosition: { x: 2.7, z: -6.15 },
      previousMotion: 'READY',
      previousMotionAge: 0.8,
    });
    const continued = deriveV3CharacterPresentation({
      ...base,
      currentPosition: { x: 2.7, z: -6.15 },
      previousMotion: 'RUN',
      previousMotionAge: 0.4,
    });

    expect(changed.motion).toBe('RUN');
    expect(changed.motionAge).toBeCloseTo(0, 5);
    expect(continued.motionAge).toBeGreaterThan(0.4);
    expect(continued.normalizedTime).toBeGreaterThanOrEqual(0);
    expect(continued.normalizedTime).toBeLessThanOrEqual(1);
  });
});
