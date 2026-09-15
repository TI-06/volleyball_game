import { describe, expect, it } from 'vitest';
import {
  ARTICULATED_PART_LAYOUT,
  ARTICULATED_PLAYER_DISPLAY_SCALE,
} from '../../../src/game/rework/render/character/ArticulatedPlayerView';
import {
  DEFAULT_VISUAL_RIG,
  JOINT_NAMES,
  cloneRigPose,
} from '../../../src/game/rework/render/character/visualRig';

describe('DEFAULT_VISUAL_RIG', () => {
  it('defines the complete normalized joint hierarchy', () => {
    expect(DEFAULT_VISUAL_RIG.parentByJoint.root).toBeNull();
    expect(DEFAULT_VISUAL_RIG.parentByJoint.wristL).toBe('elbowL');
    expect(DEFAULT_VISUAL_RIG.parentByJoint.wristR).toBe('elbowR');
    expect(DEFAULT_VISUAL_RIG.parentByJoint.ankleL).toBe('kneeL');
    expect(DEFAULT_VISUAL_RIG.parentByJoint.ankleR).toBe('kneeR');

    for (const joint of JOINT_NAMES) {
      expect(DEFAULT_VISUAL_RIG.bindPose[joint]).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
        rotation: expect.any(Number),
        scaleX: expect.any(Number),
        scaleY: expect.any(Number),
      });
    }
  });

  it('keeps arm child joints aligned with the locally horizontal limb artwork', () => {
    const pose = DEFAULT_VISUAL_RIG.bindPose;
    expect(Math.abs(pose.elbowL.y)).toBeLessThan(0.06);
    expect(Math.abs(pose.elbowR.y)).toBeLessThan(0.06);
    expect(Math.abs(pose.wristL.y)).toBeLessThan(0.06);
    expect(Math.abs(pose.wristR.y)).toBeLessThan(0.06);
    expect(pose.elbowL.x).toBeLessThan(-0.25);
    expect(pose.elbowR.x).toBeGreaterThan(0.25);
  });

  it('seats the visible head and shoulder pivots into the jersey silhouette', () => {
    const pose = DEFAULT_VISUAL_RIG.bindPose;

    // Character atlases keep transparent padding inside their 128px cells.
    // These limits intentionally compensate for that padding so the visible
    // artwork overlaps at the neck/shoulders instead of becoming a paper doll.
    expect(pose.neck.y).toBeLessThanOrEqual(0.12);
    expect(Math.abs(pose.shoulderL.x)).toBeLessThanOrEqual(0.19);
    expect(Math.abs(pose.shoulderR.x)).toBeLessThanOrEqual(0.19);
    expect(pose.shoulderL.y).toBeLessThanOrEqual(0.13);
    expect(pose.shoulderR.y).toBeLessThanOrEqual(0.13);
  });

  it('uses readable athletic proportions at smartphone match scale', () => {
    const pose = DEFAULT_VISUAL_RIG.bindPose;
    expect(ARTICULATED_PLAYER_DISPLAY_SCALE).toBeGreaterThanOrEqual(1.1);
    expect(ARTICULATED_PLAYER_DISPLAY_SCALE).toBeLessThanOrEqual(1.2);
    expect(pose.neck.y).toBeLessThanOrEqual(0.32);
    expect(pose.shoulderL.y).toBeLessThanOrEqual(0.22);
    expect(pose.shoulderR.y).toBeLessThanOrEqual(0.22);

    expect(ARTICULATED_PART_LAYOUT.torso.width).toBeLessThanOrEqual(0.72);
    expect(ARTICULATED_PART_LAYOUT.torso.height).toBeGreaterThanOrEqual(0.84);
    expect(ARTICULATED_PART_LAYOUT.upperArmL.height).toBeGreaterThanOrEqual(0.27);
    expect(ARTICULATED_PART_LAYOUT.foreArmL.height).toBeGreaterThanOrEqual(0.25);
    expect(ARTICULATED_PART_LAYOUT.thighL.width).toBeGreaterThanOrEqual(0.29);
    expect(ARTICULATED_PART_LAYOUT.shinL.width).toBeGreaterThanOrEqual(0.26);
  });

  it('clones poses deeply so one character cannot mutate another', () => {
    const first = cloneRigPose();
    const second = cloneRigPose();

    first.wristR.rotation = 1.25;
    first.hips.x = 99;

    expect(second.wristR.rotation).not.toBe(1.25);
    expect(second.hips.x).not.toBe(99);
    expect(DEFAULT_VISUAL_RIG.bindPose.wristR.rotation).not.toBe(1.25);
  });
});
