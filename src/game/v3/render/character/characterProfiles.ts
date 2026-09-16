export type V3HairStyle = 'SPIKY' | 'SWEPT' | 'BOB' | 'CROP' | 'MESSY' | 'SHORT';

export interface V3CharacterProfile {
  id: string;
  displayName: string;
  height: number;
  shoulderWidth: number;
  legLength: number;
  armLength: number;
  torsoLength: number;
  headRadius: number;
  jersey: number;
  accent: number;
  shorts: number;
  skin: number;
  hair: number;
  hairStyle: V3HairStyle;
  readyCrouch: number;
}

const PROFILES: Record<string, V3CharacterProfile> = {
  kai: {
    id: 'kai',
    displayName: 'KAI',
    height: 1.9,
    shoulderWidth: 0.46,
    legLength: 0.86,
    armLength: 0.7,
    torsoLength: 0.57,
    headRadius: 0.135,
    jersey: 0x16c7b4,
    accent: 0xe8fffb,
    shorts: 0x102d39,
    skin: 0xf0bd98,
    hair: 0x17212d,
    hairStyle: 'SPIKY',
    readyCrouch: 0.08,
  },
  ren: {
    id: 'ren',
    displayName: 'REN',
    height: 1.82,
    shoulderWidth: 0.4,
    legLength: 0.83,
    armLength: 0.71,
    torsoLength: 0.54,
    headRadius: 0.132,
    jersey: 0x4b91f1,
    accent: 0xdceaff,
    shorts: 0x14263e,
    skin: 0xf2c3a2,
    hair: 0x30283e,
    hairStyle: 'SWEPT',
    readyCrouch: 0.1,
  },
  hina: {
    id: 'hina',
    displayName: 'HINA',
    height: 1.68,
    shoulderWidth: 0.37,
    legLength: 0.76,
    armLength: 0.64,
    torsoLength: 0.5,
    headRadius: 0.128,
    jersey: 0xf4aa46,
    accent: 0xfff0d1,
    shorts: 0x302920,
    skin: 0xf3c5a3,
    hair: 0x3d2928,
    hairStyle: 'BOB',
    readyCrouch: 0.18,
  },
  shin: {
    id: 'shin',
    displayName: 'SHIN',
    height: 1.87,
    shoulderWidth: 0.45,
    legLength: 0.84,
    armLength: 0.69,
    torsoLength: 0.56,
    headRadius: 0.134,
    jersey: 0xe85f68,
    accent: 0xffe2e4,
    shorts: 0x35191e,
    skin: 0xeebc99,
    hair: 0x241d22,
    hairStyle: 'CROP',
    readyCrouch: 0.09,
  },
  gou: {
    id: 'gou',
    displayName: 'GOU',
    height: 1.95,
    shoulderWidth: 0.5,
    legLength: 0.88,
    armLength: 0.73,
    torsoLength: 0.59,
    headRadius: 0.138,
    jersey: 0xa665dc,
    accent: 0xf0dcff,
    shorts: 0x2d2038,
    skin: 0xdca77f,
    hair: 0x16161d,
    hairStyle: 'MESSY',
    readyCrouch: 0.07,
  },
  yu: {
    id: 'yu',
    displayName: 'YU',
    height: 1.73,
    shoulderWidth: 0.39,
    legLength: 0.78,
    armLength: 0.65,
    torsoLength: 0.51,
    headRadius: 0.13,
    jersey: 0xef7955,
    accent: 0xffe1d3,
    shorts: 0x3a231e,
    skin: 0xefbf9f,
    hair: 0x52352c,
    hairStyle: 'SHORT',
    readyCrouch: 0.15,
  },
};

const FALLBACK_PROFILE = PROFILES.shin;

export function profileFor(characterId: string): V3CharacterProfile {
  return PROFILES[characterId] ?? { ...FALLBACK_PROFILE, id: characterId, displayName: characterId.toUpperCase() };
}
