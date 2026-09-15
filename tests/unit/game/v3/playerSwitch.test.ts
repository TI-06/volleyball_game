import { describe, expect, it } from 'vitest';
import { chooseReceiveController } from '../../../../src/game/v3/controls/playerSwitch';

describe('V3 automatic player switching', () => {
  const players = [
    { id: 'home-0', position: { x: -2.4, z: -4.4 }, maxSpeed: 5.0, recoveryUntil: 0 },
    { id: 'home-1', position: { x: 0, z: -3.2 }, maxSpeed: 4.8, recoveryUntil: 0 },
    { id: 'home-2', position: { x: 2.5, z: -6.1 }, maxSpeed: 5.3, recoveryUntil: 0 },
  ];

  it('switches early to the player with the best useful arrival time', () => {
    const result = chooseReceiveController({
      players,
      currentPlayerId: 'home-0',
      forecastCenter: { x: 2.2, z: -7 },
      now: 1,
      contactAt: 2.2,
    });
    expect(result.playerId).toBe('home-2');
    expect(result.leadSeconds).toBeGreaterThanOrEqual(0.55);
  });

  it('does not surprise-switch when the candidate would have too little useful lead', () => {
    const result = chooseReceiveController({
      players,
      currentPlayerId: 'home-0',
      forecastCenter: { x: 0.3, z: -4.5 },
      now: 1,
      contactAt: 1.42,
    });
    expect(result.playerId).toBe('home-0');
  });

  it('penalizes a player who is still recovering from a dive', () => {
    const recovering = players.map((player) =>
      player.id === 'home-2' ? { ...player, recoveryUntil: 2.15 } : player,
    );
    const result = chooseReceiveController({
      players: recovering,
      currentPlayerId: 'home-1',
      forecastCenter: { x: 1.2, z: -5.1 },
      now: 1,
      contactAt: 2.4,
    });
    expect(result.playerId).not.toBe('home-2');
  });
});
