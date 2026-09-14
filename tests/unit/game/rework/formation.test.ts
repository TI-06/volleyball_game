import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
import { resetReworkFormation } from '../../../../src/game/rework/formation';

describe('rework rally formation', () => {
  it('restores all six players to grounded base positions', () => {
    const base = createMatch(91);
    const moved = {
      ...base,
      players: base.players.map((player) => ({
        ...player,
        position: { x: 4, y: 0.7, z: player.side === 'home' ? -0.5 : 0.5 },
        velocity: { x: 1, y: 4, z: 2 },
        isAirborne: true,
        actionLockUntil: 99,
      })),
    };

    const reset = resetReworkFormation(moved);
    expect(reset.players.find((player) => player.id === 'home-0')?.position).toEqual({ x: -2.6, y: 0, z: -5.5 });
    expect(reset.players.find((player) => player.id === 'home-1')?.position).toEqual({ x: 0, y: 0, z: -5.5 });
    expect(reset.players.find((player) => player.id === 'away-2')?.position).toEqual({ x: 2.6, y: 0, z: 5.5 });
    expect(reset.players.every((player) => !player.isAirborne && player.velocity.y === 0)).toBe(true);
  });
});
