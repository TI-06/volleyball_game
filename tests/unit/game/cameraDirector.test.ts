import { describe, expect, it } from 'vitest';
import { getCameraIntent } from '../../../src/game/camera/cameraDirector';
import { createMatch } from '../../../src/game/core/createMatch';

describe('camera director', () => {
  it('uses court camera for normal serve-ready play', () => {
    expect(getCameraIntent(createMatch(1)).mode).toBe('COURT');
  });

  it('moves to player camera for a controlled receive moment', () => {
    const base = createMatch(2);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        position: { x: 0, y: 2.4, z: -4 },
        velocity: { x: 0, y: -3, z: -1 },
      },
    };

    expect(
      getCameraIntent(state, { controlledPlayerId: 'home-1', setting: 'STANDARD' }).mode,
    ).toBe('PLAYER');
  });

  it('uses action camera for an airborne net attack in standard mode', () => {
    const base = createMatch(3);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      players: base.players.map((player) =>
        player.id === 'home-0'
          ? { ...player, isAirborne: true, position: { x: -1.5, y: 0.7, z: -1 } }
          : player,
      ),
      ball: {
        ...base.ball,
        inPlay: true,
        position: { x: -1.2, y: 3.1, z: -0.4 },
        velocity: { x: 0, y: 1, z: 1 },
      },
    };

    expect(
      getCameraIntent(state, { controlledPlayerId: 'home-0', setting: 'STANDARD' }).mode,
    ).toBe('ACTION');
    expect(
      getCameraIntent(state, { controlledPlayerId: 'home-0', setting: 'LOW' }).mode,
    ).not.toBe('ACTION');
  });

  it('keeps court camera when cinematic camera is off', () => {
    const base = createMatch(4);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: { ...base.ball, inPlay: true },
    };
    expect(getCameraIntent(state, { setting: 'OFF' }).mode).toBe('COURT');
  });
});
