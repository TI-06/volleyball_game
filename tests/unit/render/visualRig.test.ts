import { describe, expect, it } from 'vitest';
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
