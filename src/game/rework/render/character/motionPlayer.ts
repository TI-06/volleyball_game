import type {
  JointName,
  JointTransform,
  MotionClip,
} from './motionTypes';
import { cloneRigPose, JOINT_NAMES } from './visualRig';

export interface MotionSample {
  pose: Record<JointName, JointTransform>;
  normalizedTime: number;
  atContact: boolean;
}

interface ResolvedKeyframe {
  at: number;
  pose: Record<JointName, JointTransform>;
}

const CONTACT_WINDOW = 0.05;
const IDLE_SHOULDER_DROP = 0.9;
const IDLE_ELBOW_BEND = 0.24;
const SERVE_READY_MIN_SHOULDER_ROTATION = 0.9;
const SERVE_READY_MIN_ELBOW_BEND = 0.55;
const POINT_REACTION_MIN_SHOULDER_ROTATION = 0.9;
const SPIKE_APPROACH_ARM_SWEEP = 1.18;
const SPIKE_APPROACH_HIP_SQUARE = 0.1;
const SPIKE_PLANT_HIP_SQUARE = 0.06;
const SPIKE_TAKEOFF_ARM_LIFT = 1.52;
const SPIKE_COCK_GUIDE_ARM = 1.08;
const SPIKE_COCK_HITTING_ARM = 1.58;
const SPIKE_COCK_HITTING_ELBOW = 1.4;
const SPIKE_CONTACT_HITTING_ARM = 1.95;
const SPIKE_CONTACT_ELBOW_EXTENSION = 0.02;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clonePose(
  pose: Record<JointName, JointTransform>,
): Record<JointName, JointTransform> {
  return Object.fromEntries(
    JOINT_NAMES.map((joint) => [joint, { ...pose[joint] }]),
  ) as Record<JointName, JointTransform>;
}

function blendPoses(
  from: Record<JointName, JointTransform>,
  to: Record<JointName, JointTransform>,
  amount: number,
): Record<JointName, JointTransform> {
  const t = clamp01(amount);
  return Object.fromEntries(
    JOINT_NAMES.map((joint) => {
      const a = from[joint];
      const b = to[joint];
      return [
        joint,
        {
          x: lerp(a.x, b.x, t),
          y: lerp(a.y, b.y, t),
          rotation: lerp(a.rotation, b.rotation, t),
          scaleX: lerp(a.scaleX, b.scaleX, t),
          scaleY: lerp(a.scaleY, b.scaleY, t),
        },
      ];
    }),
  ) as Record<JointName, JointTransform>;
}

function isSpikePresentationClip(clip: MotionClip): boolean {
  return (
    clip.id === 'spike_approach_2' ||
    clip.id === 'spike_plant' ||
    clip.id === 'spike_takeoff' ||
    clip.id === 'spike_airborne_cock' ||
    clip.id === 'spike_contact'
  );
}

function applyPresentationPose(
  clip: MotionClip,
  pose: Record<JointName, JointTransform>,
  keyframeAt = 0,
): Record<JointName, JointTransform> {
  const isPointReaction =
    clip.id === 'celebrate_short' || clip.id === 'frustrated_short';
  if (
    clip.id !== 'idle_ready' &&
    clip.id !== 'serve_ready' &&
    !isSpikePresentationClip(clip) &&
    !(isPointReaction && keyframeAt >= 1)
  ) {
    return pose;
  }

  const styled = clonePose(pose);

  if (clip.id === 'idle_ready') {
    styled.shoulderL.rotation += IDLE_SHOULDER_DROP;
    styled.shoulderR.rotation -= IDLE_SHOULDER_DROP;
    styled.elbowL.rotation -= IDLE_ELBOW_BEND;
    styled.elbowR.rotation += IDLE_ELBOW_BEND;
    return styled;
  }

  if (clip.id === 'serve_ready') {
    styled.shoulderL.rotation = Math.max(
      styled.shoulderL.rotation,
      SERVE_READY_MIN_SHOULDER_ROTATION,
    );
    styled.shoulderR.rotation = Math.min(
      styled.shoulderR.rotation,
      -SERVE_READY_MIN_SHOULDER_ROTATION,
    );
    styled.elbowL.rotation = Math.min(
      styled.elbowL.rotation,
      -SERVE_READY_MIN_ELBOW_BEND,
    );
    styled.elbowR.rotation = Math.max(
      styled.elbowR.rotation,
      SERVE_READY_MIN_ELBOW_BEND,
    );
    return styled;
  }

  if (clip.id === 'spike_approach_2' && keyframeAt >= 1) {
    styled.shoulderL.rotation = Math.min(
      styled.shoulderL.rotation,
      -SPIKE_APPROACH_ARM_SWEEP,
    );
    styled.shoulderR.rotation = Math.max(
      styled.shoulderR.rotation,
      SPIKE_APPROACH_ARM_SWEEP,
    );
    styled.elbowL.rotation = Math.min(styled.elbowL.rotation, -0.28);
    styled.elbowR.rotation = Math.max(styled.elbowR.rotation, 0.28);
    styled.hipL.rotation = SPIKE_APPROACH_HIP_SQUARE;
    styled.hipR.rotation = -SPIKE_APPROACH_HIP_SQUARE;
    styled.kneeL.rotation = 0.24;
    styled.kneeR.rotation = -0.24;
    return styled;
  }

  if (clip.id === 'spike_plant' && keyframeAt >= 0.65) {
    styled.hipL.rotation = SPIKE_PLANT_HIP_SQUARE;
    styled.hipR.rotation = -SPIKE_PLANT_HIP_SQUARE;
    styled.shoulderL.rotation = Math.min(styled.shoulderL.rotation, -1.24);
    styled.shoulderR.rotation = Math.max(styled.shoulderR.rotation, 1.24);
    return styled;
  }

  if (clip.id === 'spike_takeoff' && keyframeAt >= 0.6) {
    styled.shoulderL.rotation = Math.max(
      styled.shoulderL.rotation,
      SPIKE_TAKEOFF_ARM_LIFT,
    );
    styled.shoulderR.rotation = Math.min(
      styled.shoulderR.rotation,
      -SPIKE_TAKEOFF_ARM_LIFT,
    );
    styled.elbowL.rotation = Math.min(styled.elbowL.rotation, -0.12);
    styled.elbowR.rotation = Math.max(styled.elbowR.rotation, 0.12);
    return styled;
  }

  if (clip.id === 'spike_airborne_cock' && keyframeAt >= 0.55) {
    styled.shoulderL.rotation = Math.max(
      styled.shoulderL.rotation,
      SPIKE_COCK_GUIDE_ARM,
    );
    styled.shoulderR.rotation = Math.min(
      styled.shoulderR.rotation,
      -SPIKE_COCK_HITTING_ARM,
    );
    styled.elbowR.rotation = Math.max(
      styled.elbowR.rotation,
      SPIKE_COCK_HITTING_ELBOW,
    );
    return styled;
  }

  if (
    clip.id === 'spike_contact' &&
    keyframeAt >= 0.4 &&
    keyframeAt <= 0.6
  ) {
    styled.shoulderR.rotation = Math.min(
      styled.shoulderR.rotation,
      -SPIKE_CONTACT_HITTING_ARM,
    );
    styled.elbowR.rotation = SPIKE_CONTACT_ELBOW_EXTENSION;
    return styled;
  }

  // Spike presentation clips keep their authored pose outside the dedicated
  // emphasis windows. Do not let the point-reaction fallback pull their arms
  // into a raised compact stance during the approach or takeoff transitions.
  if (isSpikePresentationClip(clip)) {
    return styled;
  }

  styled.shoulderL.rotation = Math.max(
    styled.shoulderL.rotation,
    POINT_REACTION_MIN_SHOULDER_ROTATION,
  );
  styled.shoulderR.rotation = Math.min(
    styled.shoulderR.rotation,
    -POINT_REACTION_MIN_SHOULDER_ROTATION,
  );
  return styled;
}

function resolveKeyframes(clip: MotionClip): ResolvedKeyframe[] {
  if (clip.keyframes.length === 0) {
    return [{ at: 0, pose: applyPresentationPose(clip, cloneRigPose()) }];
  }

  const sorted = [...clip.keyframes].sort((a, b) => a.at - b.at);
  let working = cloneRigPose();

  return sorted.map((keyframe) => {
    working = clonePose(working);
    for (const [jointName, patch] of Object.entries(keyframe.joints)) {
      const joint = jointName as JointName;
      if (!patch) continue;
      working[joint] = { ...working[joint], ...patch };
    }
    return {
      at: clamp01(keyframe.at),
      pose: applyPresentationPose(clip, clonePose(working), keyframe.at),
    };
  });
}

function sampleResolvedPose(
  frames: ResolvedKeyframe[],
  normalizedTime: number,
): Record<JointName, JointTransform> {
  if (frames.length === 0) return cloneRigPose();
  if (normalizedTime <= frames[0].at) return clonePose(frames[0].pose);

  const last = frames[frames.length - 1];
  if (normalizedTime >= last.at) return clonePose(last.pose);

  for (let index = 0; index < frames.length - 1; index += 1) {
    const from = frames[index];
    const to = frames[index + 1];
    if (normalizedTime > to.at) continue;

    const span = Math.max(0.000001, to.at - from.at);
    const localTime = clamp01((normalizedTime - from.at) / span);
    return blendPoses(from.pose, to.pose, localTime);
  }

  return clonePose(last.pose);
}

function contactDistance(normalizedTime: number, contactAt: number, loop: boolean): number {
  const direct = Math.abs(normalizedTime - contactAt);
  if (!loop) return direct;
  return Math.min(direct, 1 - direct);
}

export class MotionPlayer {
  private clip: MotionClip | null = null;
  private resolvedFrames: ResolvedKeyframe[] = [];
  private startedAtMs = 0;
  private blendFromPose: Record<JointName, JointTransform> | null = null;
  private blendStartedAtMs = 0;
  private blendDurationMs = 0;

  get currentClipId(): string | null {
    return this.clip?.id ?? null;
  }

  play(clip: MotionClip, nowMs: number, blendMs = 0): void {
    const previousPose = this.clip ? this.sample(nowMs).pose : null;

    this.clip = clip;
    this.resolvedFrames = resolveKeyframes(clip);
    this.startedAtMs = nowMs;

    if (previousPose && blendMs > 0) {
      this.blendFromPose = clonePose(previousPose);
      this.blendStartedAtMs = nowMs;
      this.blendDurationMs = blendMs;
    } else {
      this.blendFromPose = null;
      this.blendStartedAtMs = nowMs;
      this.blendDurationMs = 0;
    }
  }

  sample(nowMs: number): MotionSample {
    if (!this.clip) {
      return {
        pose: cloneRigPose(),
        normalizedTime: 0,
        atContact: false,
      };
    }

    const durationMs = Math.max(1, this.clip.durationMs);
    const elapsedMs = Math.max(0, nowMs - this.startedAtMs);
    const normalizedTime = this.clip.loop
      ? (elapsedMs % durationMs) / durationMs
      : clamp01(elapsedMs / durationMs);

    const targetPose = sampleResolvedPose(this.resolvedFrames, normalizedTime);
    let pose = targetPose;

    if (this.blendFromPose && this.blendDurationMs > 0) {
      const blendAmount = clamp01(
        (nowMs - this.blendStartedAtMs) / this.blendDurationMs,
      );
      pose = blendPoses(this.blendFromPose, targetPose, blendAmount);
      if (blendAmount >= 1) {
        this.blendFromPose = null;
        this.blendDurationMs = 0;
      }
    }

    const atContact =
      this.clip.contactAt !== undefined &&
      contactDistance(normalizedTime, clamp01(this.clip.contactAt), this.clip.loop) <=
        CONTACT_WINDOW;

    return {
      pose,
      normalizedTime,
      atContact,
    };
  }
}
