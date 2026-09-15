import type {
  JointName,
  JointTransform,
  VisualRigDefinition,
} from './motionTypes';

export const JOINT_NAMES = [
  'root',
  'hips',
  'chest',
  'neck',
  'head',
  'shoulderL',
  'shoulderR',
  'elbowL',
  'elbowR',
  'wristL',
  'wristR',
  'hipL',
  'hipR',
  'kneeL',
  'kneeR',
  'ankleL',
  'ankleR',
] as const satisfies readonly JointName[];

function transform(
  x: number,
  y: number,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
): JointTransform {
  return { x, y, rotation, scaleX, scaleY };
}

export const DEFAULT_VISUAL_RIG: VisualRigDefinition = {
  parentByJoint: {
    root: null,
    hips: 'root',
    chest: 'hips',
    neck: 'chest',
    head: 'neck',
    shoulderL: 'chest',
    shoulderR: 'chest',
    elbowL: 'shoulderL',
    elbowR: 'shoulderR',
    wristL: 'elbowL',
    wristR: 'elbowR',
    hipL: 'hips',
    hipR: 'hips',
    kneeL: 'hipL',
    kneeR: 'hipR',
    ankleL: 'kneeL',
    ankleR: 'kneeR',
  },
  bindPose: {
    root: transform(0, 0),
    hips: transform(0, 0.93),
    chest: transform(0, 0.56),
    // The atlas cells intentionally keep transparent padding around the art.
    // Seat the neck lower than the raw plane bounds so the visible chin/neck
    // overlaps the jersey collar instead of reading as a floating head.
    neck: transform(0, 0.1),
    head: transform(0, 0.22),
    // Shoulder pivots must sit inside the visible jersey silhouette, not merely
    // inside the padded torso plane. This keeps rotated serve/spike arms
    // connected to the body at phone-landscape scale.
    shoulderL: transform(-0.18, 0.12),
    shoulderR: transform(0.18, 0.12),
    // Limb sprites are authored along the local X axis. Keep the articulated
    // chain aligned with that geometry; athletic arm drop comes from shoulder
    // rotation in the motion clips rather than disconnecting child joints.
    elbowL: transform(-0.31, -0.03),
    elbowR: transform(0.31, -0.03),
    wristL: transform(-0.29, -0.02),
    wristR: transform(0.29, -0.02),
    hipL: transform(-0.13, -0.08),
    hipR: transform(0.13, -0.08),
    kneeL: transform(-0.02, -0.52),
    kneeR: transform(0.02, -0.52),
    ankleL: transform(0, -0.51),
    ankleR: transform(0, -0.51),
  },
};

export function cloneRigPose(
  definition: VisualRigDefinition = DEFAULT_VISUAL_RIG,
): Record<JointName, JointTransform> {
  return Object.fromEntries(
    JOINT_NAMES.map((joint) => [joint, { ...definition.bindPose[joint] }]),
  ) as Record<JointName, JointTransform>;
}
