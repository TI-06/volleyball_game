import type { PlayerRole } from '../core/types';

export type CharacterId = 'kai' | 'ren' | 'hina' | 'shin' | 'gou' | 'yu';
export type CharacterArchetype = 'POWER' | 'TECHNICAL' | 'SPEED' | 'BLOCK';
export type HeightClass = 'SHORT' | 'MEDIUM' | 'TALL' | 'VERY_TALL';
export type CharacterTrait =
  | 'HEAVY_FINISH'
  | 'CLEAN_CONNECTION'
  | 'NEVER_DOWN'
  | 'TOOL_THE_BLOCK'
  | 'WALL'
  | 'FAST_TEMPO';

export interface CharacterAbilities {
  power: number;
  speed: number;
  jump: number;
  spike: number;
  receive: number;
  set: number;
  block: number;
  read: number;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  role: PlayerRole;
  archetype: CharacterArchetype;
  heightClass: HeightClass;
  accent: string;
  trait: CharacterTrait;
  abilities: CharacterAbilities;
}

export const STARTER_ROSTER: Record<CharacterId, CharacterDefinition> = {
  kai: {
    id: 'kai',
    name: 'KAI',
    role: 'ACE',
    archetype: 'POWER',
    heightClass: 'TALL',
    accent: '#28d7c4',
    trait: 'HEAVY_FINISH',
    abilities: {
      power: 92,
      speed: 76,
      jump: 88,
      spike: 88,
      receive: 62,
      set: 52,
      block: 72,
      read: 70,
    },
  },
  ren: {
    id: 'ren',
    name: 'REN',
    role: 'SETTER',
    archetype: 'TECHNICAL',
    heightClass: 'MEDIUM',
    accent: '#80e3da',
    trait: 'CLEAN_CONNECTION',
    abilities: {
      power: 61,
      speed: 82,
      jump: 74,
      spike: 70,
      receive: 78,
      set: 94,
      block: 64,
      read: 91,
    },
  },
  hina: {
    id: 'hina',
    name: 'HINA',
    role: 'LIBERO',
    archetype: 'SPEED',
    heightClass: 'SHORT',
    accent: '#47f0c4',
    trait: 'NEVER_DOWN',
    abilities: {
      power: 48,
      speed: 95,
      jump: 70,
      spike: 55,
      receive: 96,
      set: 76,
      block: 38,
      read: 90,
    },
  },
  shin: {
    id: 'shin',
    name: 'SHIN',
    role: 'ACE',
    archetype: 'TECHNICAL',
    heightClass: 'TALL',
    accent: '#ef5b5b',
    trait: 'TOOL_THE_BLOCK',
    abilities: {
      power: 82,
      speed: 83,
      jump: 86,
      spike: 94,
      receive: 74,
      set: 62,
      block: 70,
      read: 88,
    },
  },
  gou: {
    id: 'gou',
    name: 'GOU',
    role: 'MIDDLE',
    archetype: 'BLOCK',
    heightClass: 'VERY_TALL',
    accent: '#d94c4c',
    trait: 'WALL',
    abilities: {
      power: 88,
      speed: 66,
      jump: 92,
      spike: 83,
      receive: 52,
      set: 45,
      block: 97,
      read: 78,
    },
  },
  yu: {
    id: 'yu',
    name: 'YU',
    role: 'SETTER',
    archetype: 'SPEED',
    heightClass: 'MEDIUM',
    accent: '#ff746d',
    trait: 'FAST_TEMPO',
    abilities: {
      power: 58,
      speed: 92,
      jump: 79,
      spike: 68,
      receive: 76,
      set: 91,
      block: 62,
      read: 92,
    },
  },
};

export const PLAYER_TEAM: readonly CharacterId[] = ['kai', 'ren', 'hina'];
export const RIVAL_TEAM: readonly CharacterId[] = ['shin', 'gou', 'yu'];
