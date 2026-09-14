import type { BallState, MatchState, PlayerRole, PlayerState, TeamSide } from './types';

const HOME_CHARACTERS = ['kai', 'ren', 'hina'] as const;
const AWAY_CHARACTERS = ['shin', 'gou', 'yu'] as const;
const HOME_ROLES: readonly PlayerRole[] = ['ACE', 'SETTER', 'LIBERO'];
const AWAY_ROLES: readonly PlayerRole[] = ['ACE', 'MIDDLE', 'SETTER'];

function createPlayer(
  side: TeamSide,
  index: number,
  characterId: string,
  role: PlayerRole,
): PlayerState {
  const sideSign = side === 'home' ? -1 : 1;
  const lanes = [-2.6, 0, 2.6] as const;

  return {
    id: `${side}-${index}`,
    characterId,
    side,
    role,
    position: {
      x: lanes[index] ?? 0,
      y: 0,
      z: sideSign * 5.5,
    },
    velocity: { x: 0, y: 0, z: 0 },
    isAirborne: false,
    actionLockUntil: 0,
  };
}

function createInitialBall(): BallState {
  return {
    position: { x: 0, y: 1.2, z: -7.5 },
    velocity: { x: 0, y: 0, z: 0 },
    spin: { x: 0, y: 0, z: 0 },
    inPlay: false,
    lastTouchedBy: null,
  };
}

export function createMatch(seed = 1): MatchState {
  const normalizedSeed = seed >>> 0;

  const home = HOME_CHARACTERS.map((characterId, index) =>
    createPlayer('home', index, characterId, HOME_ROLES[index] ?? 'ACE'),
  );
  const away = AWAY_CHARACTERS.map((characterId, index) =>
    createPlayer('away', index, characterId, AWAY_ROLES[index] ?? 'ACE'),
  );

  return {
    seed: normalizedSeed,
    rngState: normalizedSeed || 1,
    time: 0,
    score: { home: 0, away: 0 },
    players: [...home, ...away],
    ball: createInitialBall(),
    rally: {
      phase: 'SERVE_READY',
      servingSide: 'home',
      serverIndex: { home: 0, away: 0 },
      lastPointWinner: null,
      pointResolvedAt: null,
    },
    winner: null,
  };
}
