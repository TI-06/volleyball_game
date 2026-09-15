export interface V3Vec2 {
  x: number;
  z: number;
}

export interface V3Vec3 extends V3Vec2 {
  y: number;
}

export type V3TeamSide = 'home' | 'away';
export type V3ContactQuality = 'PERFECT' | 'GOOD' | 'BAD' | 'MISS';

export type V3RallyPhase =
  | 'DEFENSE_READ'
  | 'RECEIVE_PREP'
  | 'SET_BUILDUP'
  | 'ATTACK_APPROACH'
  | 'ATTACK_AIRBORNE'
  | 'OPPONENT_DEFENSE';

export type V3PrototypePhase = V3RallyPhase;

export interface V3PlayerState {
  id: string;
  characterId: string;
  side: V3TeamSide;
  position: V3Vec2;
}

export interface V3BallSnapshot {
  position: V3Vec3;
  velocity: V3Vec3;
}

export interface V3PrototypeState {
  seed: number;
  time: number;
  phase: V3PrototypePhase;
  controlledPlayerId: string;
  players: V3PlayerState[];
  ball: V3BallSnapshot;
}
