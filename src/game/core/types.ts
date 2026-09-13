export type TeamSide = 'home' | 'away';

export type RallyPhase =
  | 'SERVE_READY'
  | 'SERVING'
  | 'RALLY'
  | 'POINT'
  | 'MATCH_OVER';

export type PlayerRole = 'ACE' | 'SETTER' | 'LIBERO' | 'MIDDLE';
export type ContactQuality = 'PERFECT' | 'GREAT' | 'GOOD' | 'BAD' | 'MISS';
export type BallContactKind = 'SERVE' | 'RECEIVE' | 'DIVE' | 'SET' | 'SPIKE' | 'BLOCK';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  characterId: string;
  side: TeamSide;
  role: PlayerRole;
  position: Vec3;
  velocity: Vec3;
  isAirborne: boolean;
  actionLockUntil: number;
}

export interface BallState {
  position: Vec3;
  velocity: Vec3;
  spin: Vec3;
  inPlay: boolean;
  lastTouchedBy: string | null;
  lastContact?: BallContactKind;
  attackTimingBonus?: number;
}

export interface ScoreState {
  home: number;
  away: number;
}

export interface RallyState {
  phase: RallyPhase;
  servingSide: TeamSide;
  serverIndex: {
    home: number;
    away: number;
  };
  lastPointWinner: TeamSide | null;
  pointResolvedAt: number | null;
}

export interface MatchState {
  seed: number;
  rngState: number;
  time: number;
  score: ScoreState;
  players: PlayerState[];
  ball: BallState;
  rally: RallyState;
  winner: TeamSide | null;
}

export interface MatchInput {
  move: { x: number; z: number };
  actionPressed: boolean;
  actionReleased: boolean;
  requestedPlayerId: string | null;
}
