import type { V3PlayerState, V3PrototypeState, V3TeamSide } from '../types';

const HOME_CHARACTERS = ['kai', 'ren', 'hina'] as const;
const AWAY_CHARACTERS = ['shin', 'gou', 'yu'] as const;
const HOME_POSITIONS = [
  { x: -2.6, z: -4.35 },
  { x: 0, z: -3.3 },
  { x: 2.6, z: -6.15 },
] as const;
const AWAY_POSITIONS = [
  { x: 2.6, z: 4.35 },
  { x: 0, z: 3.3 },
  { x: -2.6, z: 6.15 },
] as const;

function createPlayers(
  side: V3TeamSide,
  characters: readonly string[],
  positions: readonly { x: number; z: number }[],
): V3PlayerState[] {
  return characters.map((characterId, index) => ({
    id: `${side}-${index}`,
    characterId,
    side,
    position: { ...positions[index] },
  }));
}

export function createV3PrototypeState(seed = 1): V3PrototypeState {
  const normalizedSeed = seed >>> 0;
  return {
    seed: normalizedSeed,
    time: 0,
    phase: 'DEFENSE_READ',
    controlledPlayerId: 'home-2',
    players: [
      ...createPlayers('home', HOME_CHARACTERS, HOME_POSITIONS),
      ...createPlayers('away', AWAY_CHARACTERS, AWAY_POSITIONS),
    ],
    ball: {
      position: { x: 0.6, y: 3.05, z: 3.4 },
      velocity: { x: 0, y: 0, z: 0 },
    },
  };
}
