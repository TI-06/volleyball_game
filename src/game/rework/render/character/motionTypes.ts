export type JointName =
  | 'root'
  | 'hips'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'wristL'
  | 'wristR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'
  | 'ankleL'
  | 'ankleR';

export interface JointTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface VisualRigDefinition {
  parentByJoint: Record<JointName, JointName | null>;
  bindPose: Record<JointName, JointTransform>;
}

export interface MotionKeyframe {
  at: number;
  joints: Partial<Record<JointName, Partial<JointTransform>>>;
}

export interface MotionClip {
  id: string;
  durationMs: number;
  loop: boolean;
  contactAt?: number;
  keyframes: MotionKeyframe[];
}
