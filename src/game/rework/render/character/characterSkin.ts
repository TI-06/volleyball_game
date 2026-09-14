import type { CharacterId } from '../../../characters/roster';

export interface CharacterVisualProfile {
  heightScale: number;
  shoulderScale: number;
  legScale: number;
  armScale: number;
  headScale: number;
  motionSpeed: number;
  approachStride: number;
  jumpVisualScale: number;
  landingWeight: number;
}

export const REQUIRED_CHARACTER_PARTS = [
  'head',
  'face',
  'hairFront',
  'hairBack',
  'torso',
  'upperArmL',
  'upperArmR',
  'foreArmL',
  'foreArmR',
  'handL',
  'handR',
  'thighL',
  'thighR',
  'shinL',
  'shinR',
  'shoeL',
  'shoeR',
] as const;

export type CharacterPartName = (typeof REQUIRED_CHARACTER_PARTS)[number];

export interface AtlasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterSkin {
  id: CharacterId;
  visual: CharacterVisualProfile;
  atlasUrl: string;
  parts: Record<CharacterPartName, string>;
  atlasRects: Record<CharacterPartName, AtlasRect>;
}

const CELL = 128;
const CHARACTER_ATLAS_REVISION = 'athletic-v2';

const ATLAS_RECTS: Record<CharacterPartName, AtlasRect> = {
  head: { x: 0, y: 0, width: CELL, height: CELL },
  face: { x: CELL, y: 0, width: CELL, height: CELL },
  hairBack: { x: CELL * 2, y: 0, width: CELL, height: CELL },
  hairFront: { x: CELL * 3, y: 0, width: CELL, height: CELL },
  torso: { x: CELL * 4, y: 0, width: CELL, height: CELL },
  upperArmL: { x: 0, y: CELL, width: CELL, height: CELL },
  upperArmR: { x: CELL, y: CELL, width: CELL, height: CELL },
  foreArmL: { x: CELL * 2, y: CELL, width: CELL, height: CELL },
  foreArmR: { x: CELL * 3, y: CELL, width: CELL, height: CELL },
  handL: { x: CELL * 4, y: CELL, width: CELL, height: CELL },
  handR: { x: 0, y: CELL * 2, width: CELL, height: CELL },
  thighL: { x: CELL, y: CELL * 2, width: CELL, height: CELL },
  thighR: { x: CELL * 2, y: CELL * 2, width: CELL, height: CELL },
  shinL: { x: CELL * 3, y: CELL * 2, width: CELL, height: CELL },
  shinR: { x: CELL * 4, y: CELL * 2, width: CELL, height: CELL },
  shoeL: { x: 0, y: CELL * 3, width: CELL, height: CELL },
  shoeR: { x: CELL, y: CELL * 3, width: CELL, height: CELL },
};

function atlasUrlFor(id: CharacterId): string {
  return `/assets/characters/${id}/parts.svg?rev=${CHARACTER_ATLAS_REVISION}`;
}

function partsFor(id: CharacterId): Record<CharacterPartName, string> {
  const atlasUrl = atlasUrlFor(id);
  return Object.fromEntries(
    REQUIRED_CHARACTER_PARTS.map((part) => [part, `${atlasUrl}#${part}`]),
  ) as Record<CharacterPartName, string>;
}

function skin(id: CharacterId, visual: CharacterVisualProfile): CharacterSkin {
  return {
    id,
    visual,
    atlasUrl: atlasUrlFor(id),
    parts: partsFor(id),
    atlasRects: ATLAS_RECTS,
  };
}

export const CHARACTER_SKINS: Record<CharacterId, CharacterSkin> = {
  kai: skin('kai', {
    heightScale: 1.08,
    shoulderScale: 0.9,
    legScale: 1.12,
    armScale: 1.05,
    headScale: 0.88,
    motionSpeed: 1,
    approachStride: 1,
    jumpVisualScale: 1,
    landingWeight: 1,
  }),
  ren: skin('ren', {
    heightScale: 1.06,
    shoulderScale: 0.88,
    legScale: 1.11,
    armScale: 1.03,
    headScale: 0.89,
    motionSpeed: 1.02,
    approachStride: 0.98,
    jumpVisualScale: 0.98,
    landingWeight: 0.96,
  }),
  hina: skin('hina', {
    heightScale: 1,
    shoulderScale: 0.84,
    legScale: 1.04,
    armScale: 0.96,
    headScale: 0.92,
    motionSpeed: 1.1,
    approachStride: 0.92,
    jumpVisualScale: 0.94,
    landingWeight: 0.86,
  }),
  shin: skin('shin', {
    heightScale: 1.09,
    shoulderScale: 0.89,
    legScale: 1.14,
    armScale: 1.07,
    headScale: 0.87,
    motionSpeed: 1.04,
    approachStride: 1.04,
    jumpVisualScale: 1.05,
    landingWeight: 0.96,
  }),
  gou: skin('gou', {
    heightScale: 1.14,
    shoulderScale: 0.98,
    legScale: 1.15,
    armScale: 1.1,
    headScale: 0.86,
    motionSpeed: 0.92,
    approachStride: 0.95,
    jumpVisualScale: 1.04,
    landingWeight: 1.12,
  }),
  yu: skin('yu', {
    heightScale: 1.05,
    shoulderScale: 0.86,
    legScale: 1.1,
    armScale: 1.02,
    headScale: 0.89,
    motionSpeed: 1.08,
    approachStride: 0.97,
    jumpVisualScale: 1,
    landingWeight: 0.9,
  }),
};
