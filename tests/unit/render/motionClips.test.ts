import { describe, expect, it } from 'vitest';
import {
  MOTION_CLIPS,
  MOTION_CLIP_IDS,
  type MotionClipId,
} from '../../../src/game/rework/render/character/motionClips';
import { MotionPlayer } from '../../../src/game/rework/render/character/motionPlayer';
import { JOINT_NAMES } from '../../../src/game/rework/render/character/visualRig';

const EXPECTED_IDS: readonly MotionClipId[] = [
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

const CONTACT_CLIPS: readonly MotionClipId[] = [
  'receive_contact',
  'set_contact',
  'serve_swing',
  'spike_contact',
  'block_press',
];

describe('MOTION_CLIPS', () => {
  it('contains the complete 29-motion volleyball library', () => {
    expect(MOTION_CLIP_IDS).toEqual(EXPECTED_IDS);
    expect(Object.keys(MOTION_CLIPS)).toHaveLength(29);
  });

  it('keeps every clip deterministic, normalized, and joint-safe', () => {
    const validJoints = new Set<string>(JOINT_NAMES);

    for (const id of EXPECTED_IDS) {
      const clip = MOTION_CLIPS[id];
      expect(clip.id).toBe(id);
      expect(clip.durationMs).toBeGreaterThan(0);
      expect(clip.keyframes.length).toBeGreaterThanOrEqual(2);
      expect(clip.keyframes[0].at).toBe(0);
      expect(clip.keyframes.at(-1)?.at).toBe(1);

      for (let index = 1; index < clip.keyframes.length; index += 1) {
        expect(clip.keyframes[index].at).toBeGreaterThanOrEqual(
          clip.keyframes[index - 1].at,
        );
      }

      for (const frame of clip.keyframes) {
        expect(frame.at).toBeGreaterThanOrEqual(0);
        expect(frame.at).toBeLessThanOrEqual(1);
        for (const joint of Object.keys(frame.joints)) {
          expect(validJoints.has(joint)).toBe(true);
        }
      }
    }
  });

  it('marks the five real ball-contact motions', () => {
    for (const id of CONTACT_CLIPS) {
      expect(MOTION_CLIPS[id].contactAt).toBeGreaterThan(0);
      expect(MOTION_CLIPS[id].contactAt).toBeLessThan(1);
      expect(MOTION_CLIPS[id].durationMs).toBeGreaterThanOrEqual(100);
    }
  });

  it('keeps serve-ready arms compact instead of returning to a T-pose', () => {
    const player = new MotionPlayer();
    player.play(MOTION_CLIPS.serve_ready, 0);
    const pose = player.sample(0).pose;

    expect(pose.shoulderL.rotation).toBeGreaterThanOrEqual(0.75);
    expect(pose.shoulderR.rotation).toBeLessThanOrEqual(-0.75);
    expect(pose.elbowL.rotation).toBeLessThanOrEqual(-0.45);
    expect(pose.elbowR.rotation).toBeGreaterThanOrEqual(0.45);
  });

  it('finishes point reactions with compact arms instead of holding a T-pose', () => {
    for (const id of ['celebrate_short', 'frustrated_short'] as const) {
      const clip = MOTION_CLIPS[id];
      const player = new MotionPlayer();
      player.play(clip, 0);
      const pose = player.sample(clip.durationMs + 100).pose;

      expect(pose.shoulderL.rotation).toBeGreaterThanOrEqual(0.75);
      expect(pose.shoulderR.rotation).toBeLessThanOrEqual(-0.75);
    }
  });

  it('encodes readable volleyball silhouettes instead of generic pose swaps', () => {
    const receive = MOTION_CLIPS.receive_contact.keyframes;
    const plant = MOTION_CLIPS.spike_plant.keyframes;
    const cock = MOTION_CLIPS.spike_airborne_cock.keyframes;
    const spike = MOTION_CLIPS.spike_contact.keyframes;
    const block = MOTION_CLIPS.block_press.keyframes;

    expect(receive.some((frame) => (frame.joints.hips?.y ?? 1) < 0.9)).toBe(true);
    expect(receive.some((frame) => Math.abs(frame.joints.wristR?.x ?? 0) < 0.2)).toBe(true);
    expect(plant.some((frame) => (frame.joints.hips?.y ?? 1) < 0.85)).toBe(true);
    expect(cock.some((frame) => Math.abs(frame.joints.shoulderR?.rotation ?? 0) > 1)).toBe(true);
    expect(spike.some((frame) => (frame.joints.shoulderR?.rotation ?? 0) < -1)).toBe(true);
    expect(block.some((frame) => (frame.joints.shoulderL?.rotation ?? 0) > 1)).toBe(true);
    expect(block.some((frame) => (frame.joints.shoulderR?.rotation ?? 0) < -1)).toBe(true);
  });
});