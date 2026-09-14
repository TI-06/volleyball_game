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
    neck: transform(0, 0.39),
    head: transform(0, 0.24),
    shoulderL: transform(-0.22, 0.27),
    shoulderR: transform(0.22, 0.27),
    elbowL: transform(-0.2, -0.25),
    elbowR: transform(0.2, -0.25),
    wristL: transform(-0.12, -0.25),
    wristR: transform(0.12, -0.25),
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
