import type { V3CharacterMotionState } from '../../presentation/characterMotion';

export interface V3EulerPose {
  x: number;
  y: number;
  z: number;
}

export interface V3OffsetPose {
  x: number;
  y: number;
  z: number;
}

export interface V3RigPose {
  rootOffset: V3OffsetPose;
  rootRotation: V3EulerPose;
  torso: V3EulerPose;
  head: V3EulerPose;
  leftUpperArm: V3EulerPose;
  rightUpperArm: V3EulerPose;
  leftForearm: V3EulerPose;
  rightForearm: V3EulerPose;
  leftThigh: V3EulerPose;
  rightThigh: V3EulerPose;
  leftShin: V3EulerPose;
  rightShin: V3EulerPose;
}

const TAU = Math.PI * 2;

function euler(x = 0, y = 0, z = 0): V3EulerPose {
  return { x, y, z };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function basePose(): V3RigPose {
  return {
    rootOffset: { x: 0, y: -0.04, z: 0 },
    rootRotation: euler(),
    torso: euler(0.08, 0, 0),
    head: euler(-0.03, 0, 0),
    leftUpperArm: euler(-0.12, 0, -0.12),
    rightUpperArm: euler(-0.12, 0, 0.12),
    leftForearm: euler(-0.08, 0, 0),
    rightForearm: euler(-0.08, 0, 0),
    leftThigh: euler(0.12, 0, 0.04),
    rightThigh: euler(0.12, 0, -0.04),
    leftShin: euler(-0.2, 0, 0),
    rightShin: euler(-0.2, 0, 0),
  };
}

function readyPose(t: number): V3RigPose {
  const pose = basePose();
  const breathe = Math.sin(t * TAU) * 0.012;
  pose.rootOffset.y += breathe;
  pose.torso.x += breathe * 0.8;
  return pose;
}

function runPose(t: number): V3RigPose {
  const pose = basePose();
  const stride = Math.sin(t * TAU);
  const bounce = Math.abs(Math.sin(t * TAU)) * 0.035;
  pose.rootOffset.y += bounce;
  pose.torso.x = 0.2;
  pose.leftThigh.x = stride * 0.82;
  pose.rightThigh.x = -stride * 0.82;
  pose.leftShin.x = Math.max(0, -stride) * -0.72 - 0.08;
  pose.rightShin.x = Math.max(0, stride) * -0.72 - 0.08;
  pose.leftUpperArm.x = -stride * 0.72;
  pose.rightUpperArm.x = stride * 0.72;
  return pose;
}

function receivePose(t: number): V3RigPose {
  const pose = basePose();
  const settle = 0.96 + Math.sin(t * Math.PI) * 0.04;

  // Keep the feet near the court instead of lowering the whole rig. Most of
  // the apparent crouch comes from the articulated knees and wide stance.
  pose.rootOffset.y = -0.145 * settle;
  pose.torso.x = 0.68;
  pose.head.x = -0.3;

  // Point the arms forward-and-down and pull both shoulders toward centre.
  // From the rear camera this leaves the platform visible below the torso.
  pose.leftUpperArm = euler(-0.82, 0, 0.32);
  pose.rightUpperArm = euler(-0.82, 0, -0.32);
  pose.leftForearm = euler(-0.16, 0, 0.05);
  pose.rightForearm = euler(-0.16, 0, -0.05);

  // Knees open out while shins turn slightly back under the body, creating a
  // clear volleyball receive stance in screen-space rather than only in depth.
  pose.leftThigh = euler(0.82, 0, -0.24);
  pose.rightThigh = euler(0.82, 0, 0.24);
  pose.leftShin = euler(-1.04, 0, 0.14);
  pose.rightShin = euler(-1.04, 0, -0.14);
  return pose;
}

function divePose(t: number, side: 'home' | 'away'): V3RigPose {
  const pose = basePose();
  const extension = smoothstep(t / 0.55);
  pose.rootOffset.y = lerp(-0.12, -0.34, extension);
  pose.rootOffset.z = (side === 'home' ? -1 : 1) * lerp(0.08, 0.58, extension);
  pose.rootRotation.x = 0.22;
  pose.torso.x = lerp(0.65, 1.16, extension);
  pose.head.x = -0.42;
  pose.leftUpperArm = euler(-1.32, 0, -0.18);
  pose.rightUpperArm = euler(-1.32, 0, 0.18);
  pose.leftForearm = euler(-0.22, 0, 0);
  pose.rightForearm = euler(-0.22, 0, 0);
  pose.leftThigh.x = -0.2;
  pose.rightThigh.x = 0.45;
  pose.leftShin.x = -0.55;
  pose.rightShin.x = -0.35;
  return pose;
}

function setPose(t: number): V3RigPose {
  const pose = basePose();
  const lift = smoothstep(t * 2.4);
  pose.rootOffset.y = -0.07 + Math.sin(t * Math.PI) * 0.035;
  pose.torso.x = 0.02;
  pose.head.x = -0.18;
  pose.leftUpperArm = euler(lerp(-1.25, -1.88, lift), 0, -0.44);
  pose.rightUpperArm = euler(lerp(-1.25, -1.88, lift), 0, 0.44);
  pose.leftForearm = euler(-1.0, 0, 0.16);
  pose.rightForearm = euler(-1.0, 0, -0.16);
  pose.leftThigh.x = 0.2;
  pose.rightThigh.x = 0.2;
  pose.leftShin.x = -0.28;
  pose.rightShin.x = -0.28;
  return pose;
}

function approachPose(t: number): V3RigPose {
  const pose = runPose(t);
  const drive = Math.sin(t * TAU);
  pose.torso.x = 0.28;
  pose.leftThigh.x = drive * 0.92;
  pose.rightThigh.x = -drive * 0.92;
  pose.leftUpperArm.x = -drive * 0.98;
  pose.rightUpperArm.x = drive * 0.98;
  pose.rootOffset.z = -0.08 * smoothstep(t);
  return pose;
}

function jumpPose(t: number): V3RigPose {
  const pose = basePose();
  const phase = clamp01(t);
  pose.rootOffset.y = 0.64 * 4 * phase * (1 - phase);
  pose.torso.x = 0.04;
  pose.leftUpperArm.x = -1.45;
  pose.rightUpperArm.x = -1.62;
  pose.leftThigh.x = 0.16;
  pose.rightThigh.x = 0.12;
  pose.leftShin.x = -0.42;
  pose.rightShin.x = -0.34;
  return pose;
}

function spikePose(t: number): V3RigPose {
  const pose = jumpPose(Math.min(0.58, Math.max(0.18, t)));
  const swing = smoothstep((t - 0.25) / 0.48);
  const snap = smoothstep((t - 0.55) / 0.25);
  const airborneCurl = Math.sin(Math.PI * clamp01(t));

  // Track with the off arm while the hitting arm draws back, then whip through.
  pose.leftUpperArm = euler(-1.05, 0, -0.32);
  pose.leftForearm = euler(-0.5, 0, 0);
  pose.rightUpperArm = euler(lerp(0.78, -2.38, swing), 0, 0.2);
  pose.rightForearm = euler(lerp(-1.15, -0.12, snap), 0, 0);

  // A small extra lift plus a rear-camera leg split makes the airborne state
  // unmistakable without changing rally physics or collision positions.
  pose.rootOffset.y += 0.14;
  pose.torso.x = lerp(-0.22, 0.28, snap);
  pose.torso.y = lerp(0.42, -0.38, swing);
  pose.head.y = pose.torso.y * -0.2;
  pose.leftThigh = euler(0.28 + airborneCurl * 0.1, 0, -0.23);
  pose.rightThigh = euler(0.22 + airborneCurl * 0.08, 0, 0.15);
  pose.leftShin = euler(-0.84 - airborneCurl * 0.18, 0, 0.32);
  pose.rightShin = euler(-0.8 - airborneCurl * 0.16, 0, -0.22);
  return pose;
}

function blockPose(t: number): V3RigPose {
  const pose = jumpPose(t);
  pose.rootOffset.y *= 0.78;
  pose.torso.x = 0;
  pose.leftUpperArm = euler(-2.55, 0, -0.18);
  pose.rightUpperArm = euler(-2.55, 0, 0.18);
  pose.leftForearm = euler(-0.05, 0, 0);
  pose.rightForearm = euler(-0.05, 0, 0);
  pose.leftThigh.x = 0.1;
  pose.rightThigh.x = 0.1;
  return pose;
}

function landPose(t: number): V3RigPose {
  const pose = basePose();
  const impact = 1 - smoothstep(Math.abs(t - 0.28) / 0.28);
  pose.rootOffset.y = -0.08 - impact * 0.2;
  pose.torso.x = 0.18 + impact * 0.18;
  pose.leftThigh.x = 0.44 + impact * 0.36;
  pose.rightThigh.x = 0.44 + impact * 0.36;
  pose.leftShin.x = -0.5 - impact * 0.32;
  pose.rightShin.x = -0.5 - impact * 0.32;
  pose.leftUpperArm.x = 0.28 * impact;
  pose.rightUpperArm.x = 0.28 * impact;
  return pose;
}

export function sampleV3Pose(
  state: V3CharacterMotionState,
  normalizedTime: number,
  side: 'home' | 'away',
): V3RigPose {
  const t = clamp01(normalizedTime);
  switch (state) {
    case 'RUN':
      return runPose(t);
    case 'RECEIVE':
      return receivePose(t);
    case 'DIVE':
      return divePose(t, side);
    case 'SET':
      return setPose(t);
    case 'APPROACH':
      return approachPose(t);
    case 'JUMP':
      return jumpPose(t);
    case 'SPIKE':
      return spikePose(t);
    case 'BLOCK':
      return blockPose(t);
    case 'LAND':
      return landPose(t);
    case 'READY':
    default:
      return readyPose(t);
  }
}
