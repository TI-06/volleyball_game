import type { MotionClip, MotionKeyframe } from './motionTypes';

export type MotionClipId =
  | 'idle_ready'
  | 'shuffle_left'
  | 'shuffle_right'
  | 'run_forward'
  | 'run_back'
  | 'receive_ready'
  | 'receive_contact'
  | 'receive_recover'
  | 'set_enter'
  | 'set_contact'
  | 'set_recover'
  | 'serve_ready'
  | 'serve_toss'
  | 'serve_swing'
  | 'serve_followthrough'
  | 'spike_approach_1'
  | 'spike_approach_2'
  | 'spike_plant'
  | 'spike_takeoff'
  | 'spike_airborne_cock'
  | 'spike_contact'
  | 'spike_followthrough'
  | 'land'
  | 'block_shuffle'
  | 'block_takeoff'
  | 'block_press'
  | 'block_land'
  | 'celebrate_short'
  | 'frustrated_short';

export const MOTION_CLIP_IDS: readonly MotionClipId[] = [
  'idle_ready',
  'shuffle_left',
  'shuffle_right',
  'run_forward',
  'run_back',
  'receive_ready',
  'receive_contact',
  'receive_recover',
  'set_enter',
  'set_contact',
  'set_recover',
  'serve_ready',
  'serve_toss',
  'serve_swing',
  'serve_followthrough',
  'spike_approach_1',
  'spike_approach_2',
  'spike_plant',
  'spike_takeoff',
  'spike_airborne_cock',
  'spike_contact',
  'spike_followthrough',
  'land',
  'block_shuffle',
  'block_takeoff',
  'block_press',
  'block_land',
  'celebrate_short',
  'frustrated_short',
];

function makeClip(
  id: MotionClipId,
  durationMs: number,
  keyframes: MotionKeyframe[],
  options: { loop?: boolean; contactAt?: number } = {},
): MotionClip {
  return {
    id,
    durationMs,
    loop: options.loop ?? false,
    contactAt: options.contactAt,
    keyframes,
  };
}

const idleReady = makeClip(
  'idle_ready',
  1200,
  [
    {
      at: 0,
      joints: {
        hips: { y: 0.9 },
        chest: { rotation: 0.03 },
        kneeL: { rotation: 0.16 },
        kneeR: { rotation: -0.16 },
        shoulderL: { rotation: 0.22 },
        shoulderR: { rotation: -0.22 },
      },
    },
    {
      at: 0.5,
      joints: {
        hips: { y: 0.885 },
        chest: { rotation: -0.02 },
        head: { y: 0.235 },
      },
    },
    {
      at: 1,
      joints: {
        hips: { y: 0.9 },
        chest: { rotation: 0.03 },
        head: { y: 0.24 },
      },
    },
  ],
  { loop: true },
);

const shuffleLeft = makeClip('shuffle_left', 340, [
  {
    at: 0,
    joints: {
      root: { x: 0 },
      chest: { rotation: 0.08 },
      hipL: { rotation: -0.35 },
      hipR: { rotation: 0.25 },
      shoulderL: { rotation: 0.38 },
      shoulderR: { rotation: -0.18 },
    },
  },
  {
    at: 0.5,
    joints: {
      root: { x: -0.14 },
      hips: { y: 0.86 },
      kneeL: { rotation: 0.45 },
      kneeR: { rotation: -0.22 },
    },
  },
  {
    at: 1,
    joints: {
      root: { x: -0.28 },
      hips: { y: 0.9 },
      hipL: { rotation: 0.18 },
      hipR: { rotation: -0.28 },
      kneeL: { rotation: 0.08 },
      kneeR: { rotation: -0.12 },
    },
  },
]);

const shuffleRight = makeClip('shuffle_right', 340, [
  {
    at: 0,
    joints: {
      root: { x: 0 },
      chest: { rotation: -0.08 },
      hipL: { rotation: -0.25 },
      hipR: { rotation: 0.35 },
      shoulderL: { rotation: 0.18 },
      shoulderR: { rotation: -0.38 },
    },
  },
  {
    at: 0.5,
    joints: {
      root: { x: 0.14 },
      hips: { y: 0.86 },
      kneeL: { rotation: 0.22 },
      kneeR: { rotation: -0.45 },
    },
  },
  {
    at: 1,
    joints: {
      root: { x: 0.28 },
      hips: { y: 0.9 },
      hipL: { rotation: 0.28 },
      hipR: { rotation: -0.18 },
      kneeL: { rotation: 0.12 },
      kneeR: { rotation: -0.08 },
    },
  },
]);

const runForward = makeClip('run_forward', 420, [
  {
    at: 0,
    joints: {
      chest: { rotation: -0.12 },
      shoulderL: { rotation: -0.58 },
      shoulderR: { rotation: 0.58 },
      hipL: { rotation: 0.48 },
      hipR: { rotation: -0.48 },
      kneeR: { rotation: 0.55 },
    },
  },
  {
    at: 0.5,
    joints: {
      hips: { y: 0.87 },
      shoulderL: { rotation: 0.58 },
      shoulderR: { rotation: -0.58 },
      hipL: { rotation: -0.48 },
      hipR: { rotation: 0.48 },
      kneeL: { rotation: 0.55 },
      kneeR: { rotation: 0.05 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.9 },
      shoulderL: { rotation: -0.58 },
      shoulderR: { rotation: 0.58 },
      hipL: { rotation: 0.48 },
      hipR: { rotation: -0.48 },
      kneeL: { rotation: 0.05 },
      kneeR: { rotation: 0.55 },
    },
  },
]);

const runBack = makeClip('run_back', 440, [
  {
    at: 0,
    joints: {
      chest: { rotation: 0.12 },
      shoulderL: { rotation: -0.42 },
      shoulderR: { rotation: 0.42 },
      hipL: { rotation: 0.36 },
      hipR: { rotation: -0.36 },
    },
  },
  {
    at: 0.5,
    joints: {
      hips: { y: 0.88 },
      shoulderL: { rotation: 0.42 },
      shoulderR: { rotation: -0.42 },
      hipL: { rotation: -0.36 },
      hipR: { rotation: 0.36 },
      kneeL: { rotation: 0.42 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.9 },
      shoulderL: { rotation: -0.42 },
      shoulderR: { rotation: 0.42 },
      hipL: { rotation: 0.36 },
      hipR: { rotation: -0.36 },
      kneeL: { rotation: 0.05 },
    },
  },
]);

const receiveReady = makeClip('receive_ready', 240, [
  {
    at: 0,
    joints: {
      hips: { y: 0.9 },
      chest: { rotation: 0 },
      shoulderL: { rotation: 0.15 },
      shoulderR: { rotation: -0.15 },
    },
  },
  {
    at: 0.65,
    joints: {
      hips: { y: 0.78 },
      chest: { rotation: -0.2 },
      hipL: { rotation: 0.2 },
      hipR: { rotation: -0.2 },
      kneeL: { rotation: 0.58 },
      kneeR: { rotation: -0.58 },
      shoulderL: { rotation: 0.48 },
      shoulderR: { rotation: -0.48 },
      elbowL: { rotation: -0.22 },
      elbowR: { rotation: 0.22 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.76 },
      chest: { rotation: -0.23 },
      wristL: { x: -0.08, y: -0.03 },
      wristR: { x: 0.08, y: -0.03 },
    },
  },
]);

const receiveContact = makeClip(
  'receive_contact',
  180,
  [
    {
      at: 0,
      joints: {
        hips: { y: 0.78 },
        chest: { rotation: -0.2 },
        kneeL: { rotation: 0.55 },
        kneeR: { rotation: -0.55 },
        shoulderL: { rotation: 0.5 },
        shoulderR: { rotation: -0.5 },
        wristL: { x: -0.1, y: -0.03 },
        wristR: { x: 0.1, y: -0.03 },
      },
    },
    {
      at: 0.58,
      joints: {
        hips: { y: 0.74 },
        chest: { rotation: -0.28 },
        shoulderL: { rotation: 0.62 },
        shoulderR: { rotation: -0.62 },
        elbowL: { rotation: -0.08 },
        elbowR: { rotation: 0.08 },
        wristL: { x: -0.07, y: 0 },
        wristR: { x: 0.07, y: 0 },
      },
    },
    {
      at: 1,
      joints: {
        hips: { y: 0.79 },
        chest: { rotation: -0.14 },
        shoulderL: { rotation: 0.4 },
        shoulderR: { rotation: -0.4 },
      },
    },
  ],
  { contactAt: 0.58 },
);

const receiveRecover = makeClip('receive_recover', 260, [
  {
    at: 0,
    joints: {
      hips: { y: 0.79 },
      chest: { rotation: -0.14 },
      shoulderL: { rotation: 0.4 },
      shoulderR: { rotation: -0.4 },
      kneeL: { rotation: 0.4 },
      kneeR: { rotation: -0.4 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.9 },
      chest: { rotation: 0.02 },
      shoulderL: { rotation: 0.22 },
      shoulderR: { rotation: -0.22 },
      kneeL: { rotation: 0.12 },
      kneeR: { rotation: -0.12 },
    },
  },
]);

const setEnter = makeClip('set_enter', 220, [
  {
    at: 0,
    joints: {
      hips: { y: 0.9 },
      shoulderL: { rotation: 0.2 },
      shoulderR: { rotation: -0.2 },
    },
  },
  {
    at: 0.65,
    joints: {
      hips: { y: 0.82 },
      kneeL: { rotation: 0.42 },
      kneeR: { rotation: -0.42 },
      shoulderL: { rotation: 1.05 },
      shoulderR: { rotation: -1.05 },
      elbowL: { rotation: -0.72 },
      elbowR: { rotation: 0.72 },
    },
  },
  {
    at: 1,
    joints: {
      head: { rotation: -0.06 },
      wristL: { y: 0.08 },
      wristR: { y: 0.08 },
    },
  },
]);

const setContact = makeClip(
  'set_contact',
  170,
  [
    {
      at: 0,
      joints: {
        hips: { y: 0.82 },
        kneeL: { rotation: 0.42 },
        kneeR: { rotation: -0.42 },
        shoulderL: { rotation: 1.05 },
        shoulderR: { rotation: -1.05 },
        elbowL: { rotation: -0.72 },
        elbowR: { rotation: 0.72 },
      },
    },
    {
      at: 0.5,
      joints: {
        hips: { y: 0.9 },
        kneeL: { rotation: 0.08 },
        kneeR: { rotation: -0.08 },
        shoulderL: { rotation: 1.22 },
        shoulderR: { rotation: -1.22 },
        elbowL: { rotation: -0.28 },
        elbowR: { rotation: 0.28 },
        wristL: { y: 0.12, rotation: -0.18 },
        wristR: { y: 0.12, rotation: 0.18 },
      },
    },
    {
      at: 1,
      joints: {
        shoulderL: { rotation: 1.12 },
        shoulderR: { rotation: -1.12 },
        elbowL: { rotation: -0.18 },
        elbowR: { rotation: 0.18 },
      },
    },
  ],
  { contactAt: 0.5 },
);

const setRecover = makeClip('set_recover', 260, [
  {
    at: 0,
    joints: {
      shoulderL: { rotation: 1.12 },
      shoulderR: { rotation: -1.12 },
      elbowL: { rotation: -0.18 },
      elbowR: { rotation: 0.18 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.9 },
      shoulderL: { rotation: 0.22 },
      shoulderR: { rotation: -0.22 },
      elbowL: { rotation: 0 },
      elbowR: { rotation: 0 },
    },
  },
]);

const serveReady = makeClip('serve_ready', 300, [
  {
    at: 0,
    joints: {
      hips: { y: 0.9 },
      chest: { rotation: 0 },
      shoulderL: { rotation: 0.1 },
      shoulderR: { rotation: -0.18 },
    },
  },
  {
    at: 1,
    joints: {
      chest: { rotation: 0.1 },
      hipL: { rotation: -0.08 },
      hipR: { rotation: 0.16 },
      shoulderL: { rotation: 0.55 },
      elbowL: { rotation: -0.28 },
      shoulderR: { rotation: -0.82 },
      elbowR: { rotation: 0.65 },
    },
  },
]);

const serveToss = makeClip('serve_toss', 420, [
  {
    at: 0,
    joints: {
      shoulderL: { rotation: 0.55 },
      elbowL: { rotation: -0.28 },
      shoulderR: { rotation: -0.82 },
      elbowR: { rotation: 0.65 },
    },
  },
  {
    at: 0.6,
    joints: {
      shoulderL: { rotation: 1.42 },
      elbowL: { rotation: -0.05 },
      wristL: { rotation: -0.1 },
      shoulderR: { rotation: -1.08 },
      elbowR: { rotation: 0.92 },
      chest: { rotation: 0.18 },
    },
  },
  {
    at: 1,
    joints: {
      head: { rotation: -0.1 },
      shoulderL: { rotation: 1.25 },
      shoulderR: { rotation: -1.25 },
      elbowR: { rotation: 1.02 },
    },
  },
]);

const serveSwing = makeClip(
  'serve_swing',
  300,
  [
    {
      at: 0,
      joints: {
        chest: { rotation: 0.18 },
        shoulderL: { rotation: 1.25 },
        shoulderR: { rotation: -1.25 },
        elbowR: { rotation: 1.02 },
      },
    },
    {
      at: 0.3,
      joints: {
        hips: { rotation: -0.12 },
        chest: { rotation: -0.18 },
        shoulderR: { rotation: -1.62 },
        elbowR: { rotation: 0.48 },
      },
    },
    {
      at: 0.55,
      joints: {
        hips: { y: 0.94, rotation: 0.08 },
        chest: { rotation: -0.34 },
        shoulderR: { rotation: -1.92 },
        elbowR: { rotation: 0.08 },
        wristR: { rotation: -0.22 },
      },
    },
    {
      at: 1,
      joints: {
        chest: { rotation: -0.12 },
        shoulderR: { rotation: -0.72 },
        elbowR: { rotation: -0.28 },
      },
    },
  ],
  { contactAt: 0.55 },
);

const serveFollowthrough = makeClip('serve_followthrough', 360, [
  {
    at: 0,
    joints: {
      chest: { rotation: -0.12 },
      shoulderR: { rotation: -0.72 },
      elbowR: { rotation: -0.28 },
      hipR: { rotation: 0.28 },
    },
  },
  {
    at: 0.45,
    joints: {
      chest: { rotation: -0.24 },
      shoulderR: { rotation: 0.35 },
      elbowR: { rotation: -0.18 },
      hipR: { rotation: 0.45 },
    },
  },
  {
    at: 1,
    joints: {
      chest: { rotation: 0 },
      shoulderL: { rotation: 0.22 },
      shoulderR: { rotation: -0.22 },
      hipR: { rotation: 0 },
    },
  },
]);

const spikeApproach1 = makeClip('spike_approach_1', 280, [
  {
    at: 0,
    joints: {
      chest: { rotation: -0.12 },
      shoulderL: { rotation: -0.42 },
      shoulderR: { rotation: 0.42 },
      hipL: { rotation: 0.5 },
      hipR: { rotation: -0.35 },
    },
  },
  {
    at: 0.55,
    joints: {
      hips: { y: 0.88 },
      shoulderL: { rotation: 0.5 },
      shoulderR: { rotation: -0.62 },
      hipL: { rotation: -0.38 },
      hipR: { rotation: 0.58 },
      kneeL: { rotation: 0.42 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.87 },
      chest: { rotation: -0.18 },
      shoulderL: { rotation: -0.65 },
      shoulderR: { rotation: 0.62 },
      hipL: { rotation: 0.6 },
      hipR: { rotation: -0.42 },
      kneeR: { rotation: 0.48 },
    },
  },
]);

const spikeApproach2 = makeClip('spike_approach_2', 280, [
  {
    at: 0,
    joints: {
      hips: { y: 0.87 },
      chest: { rotation: -0.18 },
      shoulderL: { rotation: -0.65 },
      shoulderR: { rotation: 0.62 },
      hipL: { rotation: 0.6 },
      hipR: { rotation: -0.42 },
    },
  },
  {
    at: 0.52,
    joints: {
      hips: { y: 0.85 },
      shoulderL: { rotation: 0.72 },
      shoulderR: { rotation: -0.72 },
      hipL: { rotation: -0.45 },
      hipR: { rotation: 0.62 },
      kneeL: { rotation: 0.52 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.84 },
      chest: { rotation: -0.08 },
      shoulderL: { rotation: -0.95 },
      shoulderR: { rotation: 0.95 },
      hipL: { rotation: 0.28 },
      hipR: { rotation: -0.18 },
      kneeL: { rotation: 0.32 },
      kneeR: { rotation: -0.32 },
    },
  },
]);

const spikePlant = makeClip('spike_plant', 260, [
  {
    at: 0,
    joints: {
      hips: { y: 0.84 },
      shoulderL: { rotation: -0.95 },
      shoulderR: { rotation: 0.95 },
      kneeL: { rotation: 0.32 },
      kneeR: { rotation: -0.32 },
    },
  },
  {
    at: 0.65,
    joints: {
      hips: { y: 0.7 },
      chest: { rotation: 0.08 },
      shoulderL: { rotation: -1.15 },
      shoulderR: { rotation: 1.15 },
      hipL: { rotation: 0.18 },
      hipR: { rotation: -0.18 },
      kneeL: { rotation: 0.72 },
      kneeR: { rotation: -0.72 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.73 },
      shoulderL: { rotation: -1.22 },
      shoulderR: { rotation: 1.22 },
      kneeL: { rotation: 0.66 },
      kneeR: { rotation: -0.66 },
    },
  },
]);

const spikeTakeoff = makeClip('spike_takeoff', 220, [
  {
    at: 0,
    joints: {
      hips: { y: 0.73 },
      shoulderL: { rotation: -1.22 },
      shoulderR: { rotation: 1.22 },
      kneeL: { rotation: 0.66 },
      kneeR: { rotation: -0.66 },
    },
  },
  {
    at: 0.6,
    joints: {
      root: { y: 0.18 },
      hips: { y: 0.92 },
      shoulderL: { rotation: 1.35 },
      shoulderR: { rotation: -1.35 },
      elbowL: { rotation: -0.18 },
      elbowR: { rotation: 0.18 },
      kneeL: { rotation: 0.05 },
      kneeR: { rotation: -0.05 },
    },
  },
  {
    at: 1,
    joints: {
      root: { y: 0.3 },
      hips: { y: 0.94 },
      shoulderL: { rotation: 1.18 },
      shoulderR: { rotation: -1.18 },
    },
  },
]);

const spikeAirborneCock = makeClip('spike_airborne_cock', 260, [
  {
    at: 0,
    joints: {
      root: { y: 0.3 },
      chest: { rotation: 0 },
      shoulderL: { rotation: 1.18 },
      shoulderR: { rotation: -1.18 },
    },
  },
  {
    at: 0.55,
    joints: {
      root: { y: 0.38 },
      chest: { rotation: 0.24 },
      shoulderL: { rotation: 1.05 },
      elbowL: { rotation: -0.22 },
      shoulderR: { rotation: -1.48 },
      elbowR: { rotation: 1.25 },
      wristR: { rotation: 0.32 },
      hipL: { rotation: 0.16 },
      hipR: { rotation: -0.22 },
      kneeL: { rotation: 0.34 },
      kneeR: { rotation: -0.42 },
    },
  },
  {
    at: 1,
    joints: {
      root: { y: 0.4 },
      chest: { rotation: 0.3 },
      shoulderR: { rotation: -1.6 },
      elbowR: { rotation: 1.35 },
      head: { rotation: -0.08 },
    },
  },
]);

const spikeContact = makeClip(
  'spike_contact',
  180,
  [
    {
      at: 0,
      joints: {
        root: { y: 0.4 },
        chest: { rotation: 0.3 },
        shoulderL: { rotation: 1.05 },
        shoulderR: { rotation: -1.6 },
        elbowR: { rotation: 1.35 },
      },
    },
    {
      at: 0.45,
      joints: {
        root: { y: 0.38 },
        chest: { rotation: -0.18 },
        shoulderL: { rotation: 0.82 },
        shoulderR: { rotation: -1.92 },
        elbowR: { rotation: 0.02 },
        wristR: { rotation: -0.28 },
      },
    },
    {
      at: 1,
      joints: {
        root: { y: 0.3 },
        chest: { rotation: -0.34 },
        shoulderL: { rotation: 0.42 },
        shoulderR: { rotation: -0.68 },
        elbowR: { rotation: -0.35 },
      },
    },
  ],
  { contactAt: 0.45 },
);

const spikeFollowthrough = makeClip('spike_followthrough', 260, [
  {
    at: 0,
    joints: {
      root: { y: 0.3 },
      chest: { rotation: -0.34 },
      shoulderR: { rotation: -0.68 },
      elbowR: { rotation: -0.35 },
    },
  },
  {
    at: 0.55,
    joints: {
      root: { y: 0.18 },
      chest: { rotation: -0.2 },
      shoulderR: { rotation: 0.42 },
      elbowR: { rotation: -0.18 },
      kneeL: { rotation: 0.18 },
      kneeR: { rotation: -0.18 },
    },
  },
  {
    at: 1,
    joints: {
      root: { y: 0.06 },
      chest: { rotation: 0 },
      shoulderL: { rotation: 0.3 },
      shoulderR: { rotation: -0.3 },
      kneeL: { rotation: 0.28 },
      kneeR: { rotation: -0.28 },
    },
  },
]);

const land = makeClip('land', 300, [
  {
    at: 0,
    joints: {
      root: { y: 0.06 },
      hips: { y: 0.9 },
      kneeL: { rotation: 0.28 },
      kneeR: { rotation: -0.28 },
    },
  },
  {
    at: 0.35,
    joints: {
      root: { y: 0 },
      hips: { y: 0.72 },
      chest: { rotation: -0.12 },
      kneeL: { rotation: 0.7 },
      kneeR: { rotation: -0.7 },
      shoulderL: { rotation: 0.48 },
      shoulderR: { rotation: -0.48 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.9 },
      chest: { rotation: 0.02 },
      kneeL: { rotation: 0.12 },
      kneeR: { rotation: -0.12 },
      shoulderL: { rotation: 0.22 },
      shoulderR: { rotation: -0.22 },
    },
  },
]);

const blockShuffle = makeClip('block_shuffle', 240, [
  {
    at: 0,
    joints: {
      hips: { y: 0.88 },
      shoulderL: { rotation: 0.4 },
      shoulderR: { rotation: -0.4 },
      kneeL: { rotation: 0.25 },
      kneeR: { rotation: -0.25 },
    },
  },
  {
    at: 0.5,
    joints: {
      root: { x: 0.12 },
      hips: { y: 0.84 },
      kneeL: { rotation: 0.42 },
      kneeR: { rotation: -0.18 },
    },
  },
  {
    at: 1,
    joints: {
      root: { x: 0.24 },
      hips: { y: 0.82 },
      kneeL: { rotation: 0.45 },
      kneeR: { rotation: -0.45 },
    },
  },
]);

const blockTakeoff = makeClip('block_takeoff', 220, [
  {
    at: 0,
    joints: {
      hips: { y: 0.82 },
      kneeL: { rotation: 0.45 },
      kneeR: { rotation: -0.45 },
      shoulderL: { rotation: 0.4 },
      shoulderR: { rotation: -0.4 },
    },
  },
  {
    at: 0.6,
    joints: {
      root: { y: 0.2 },
      hips: { y: 0.93 },
      kneeL: { rotation: 0.08 },
      kneeR: { rotation: -0.08 },
      shoulderL: { rotation: 1.38 },
      shoulderR: { rotation: -1.38 },
      elbowL: { rotation: -0.12 },
      elbowR: { rotation: 0.12 },
    },
  },
  {
    at: 1,
    joints: {
      root: { y: 0.32 },
      shoulderL: { rotation: 1.52 },
      shoulderR: { rotation: -1.52 },
    },
  },
]);

const blockPress = makeClip(
  'block_press',
  220,
  [
    {
      at: 0,
      joints: {
        root: { y: 0.32 },
        shoulderL: { rotation: 1.52 },
        shoulderR: { rotation: -1.52 },
        elbowL: { rotation: -0.12 },
        elbowR: { rotation: 0.12 },
      },
    },
    {
      at: 0.45,
      joints: {
        root: { y: 0.36 },
        chest: { rotation: -0.06 },
        shoulderL: { rotation: 1.68 },
        shoulderR: { rotation: -1.68 },
        elbowL: { rotation: -0.02 },
        elbowR: { rotation: 0.02 },
        wristL: { rotation: -0.15, y: 0.08 },
        wristR: { rotation: 0.15, y: 0.08 },
      },
    },
    {
      at: 1,
      joints: {
        root: { y: 0.29 },
        shoulderL: { rotation: 1.55 },
        shoulderR: { rotation: -1.55 },
      },
    },
  ],
  { contactAt: 0.45 },
);

const blockLand = makeClip('block_land', 280, [
  {
    at: 0,
    joints: {
      root: { y: 0.29 },
      shoulderL: { rotation: 1.55 },
      shoulderR: { rotation: -1.55 },
    },
  },
  {
    at: 0.5,
    joints: {
      root: { y: 0 },
      hips: { y: 0.76 },
      kneeL: { rotation: 0.62 },
      kneeR: { rotation: -0.62 },
      shoulderL: { rotation: 0.58 },
      shoulderR: { rotation: -0.58 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.9 },
      kneeL: { rotation: 0.12 },
      kneeR: { rotation: -0.12 },
      shoulderL: { rotation: 0.22 },
      shoulderR: { rotation: -0.22 },
    },
  },
]);

const celebrateShort = makeClip('celebrate_short', 520, [
  {
    at: 0,
    joints: {
      hips: { y: 0.9 },
      shoulderL: { rotation: 0.22 },
      shoulderR: { rotation: -0.22 },
    },
  },
  {
    at: 0.45,
    joints: {
      root: { y: 0.1 },
      chest: { rotation: -0.08 },
      shoulderL: { rotation: 1.35 },
      shoulderR: { rotation: -1.35 },
      elbowL: { rotation: -0.55 },
      elbowR: { rotation: 0.55 },
      head: { rotation: -0.08 },
    },
  },
  {
    at: 1,
    joints: {
      root: { y: 0 },
      chest: { rotation: 0.02 },
      shoulderL: { rotation: 0.38 },
      shoulderR: { rotation: -0.38 },
    },
  },
]);

const frustratedShort = makeClip('frustrated_short', 480, [
  {
    at: 0,
    joints: {
      hips: { y: 0.9 },
      chest: { rotation: 0 },
    },
  },
  {
    at: 0.55,
    joints: {
      hips: { y: 0.86 },
      chest: { rotation: -0.24 },
      head: { rotation: 0.16 },
      shoulderL: { rotation: -0.25 },
      shoulderR: { rotation: 0.25 },
      elbowL: { rotation: -0.35 },
      elbowR: { rotation: 0.35 },
    },
  },
  {
    at: 1,
    joints: {
      hips: { y: 0.89 },
      chest: { rotation: -0.08 },
      head: { rotation: 0.04 },
    },
  },
]);

export const MOTION_CLIPS: Record<MotionClipId, MotionClip> = {
  idle_ready: idleReady,
  shuffle_left: shuffleLeft,
  shuffle_right: shuffleRight,
  run_forward: runForward,
  run_back: runBack,
  receive_ready: receiveReady,
  receive_contact: receiveContact,
  receive_recover: receiveRecover,
  set_enter: setEnter,
  set_contact: setContact,
  set_recover: setRecover,
  serve_ready: serveReady,
  serve_toss: serveToss,
  serve_swing: serveSwing,
  serve_followthrough: serveFollowthrough,
  spike_approach_1: spikeApproach1,
  spike_approach_2: spikeApproach2,
  spike_plant: spikePlant,
  spike_takeoff: spikeTakeoff,
  spike_airborne_cock: spikeAirborneCock,
  spike_contact: spikeContact,
  spike_followthrough: spikeFollowthrough,
  land,
  block_shuffle: blockShuffle,
  block_takeoff: blockTakeoff,
  block_press: blockPress,
  block_land: blockLand,
  celebrate_short: celebrateShort,
  frustrated_short: frustratedShort,
};
