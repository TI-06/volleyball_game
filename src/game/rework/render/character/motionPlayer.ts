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

function applyPresentationPose(
  clip: MotionClip,
  pose: Record<JointName, JointTransform>,
): Record<JointName, JointTransform> {
  if (clip.id !== 'idle_ready' && clip.id !== 'serve_ready') return pose;
  const styled = clonePose(pose);

  if (clip.id === 'idle_ready') {
    styled.shoulderL.rotation += IDLE_SHOULDER_DROP;
    styled.shoulderR.rotation -= IDLE_SHOULDER_DROP;
    styled.elbowL.rotation -= IDLE_ELBOW_BEND;
    styled.elbowR.rotation += IDLE_ELBOW_BEND;
    return styled;
  }

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
      pose: applyPresentationPose(clip, clonePose(working)),
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
