import type { MatchState } from '../core/types';

const LANES = [-2.6, 0, 2.6] as const;

function playerIndex(playerId: string): number {
  const parsed = Number(playerId.split('-')[1]);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < LANES.length ? parsed : 0;
}

export function resetReworkFormation(state: MatchState): MatchState {
  return {
    ...state,
    players: state.players.map((player) => {
      const index = playerIndex(player.id);
      const sideSign = player.side === 'home' ? -1 : 1;
      return {
        ...player,
        position: { x: LANES[index] ?? 0, y: 0, z: sideSign * 5.5 },
        velocity: { x: 0, y: 0, z: 0 },
        isAirborne: false,
        actionLockUntil: 0,
      };
    }),
  };
}
