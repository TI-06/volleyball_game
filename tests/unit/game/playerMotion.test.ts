import { describe, expect, it } from 'vitest';
import {
  getPlayerMotionPose,
  motionFromRuntimeEvent,
} from '../../../src/game/render/playerMotion';

describe('player motion poses', () => {
  it('maps volleyball contacts to visual motions but ignores point events', () => {
    expect(motionFromRuntimeEvent('RECEIVE')).toBe('RECEIVE');
    expect(motionFromRuntimeEvent('SET')).toBe('SET');
    expect(motionFromRuntimeEvent('SPIKE')).toBe('SPIKE');
    expect(motionFromRuntimeEvent('BLOCK')).toBe('BLOCK');
    expect(motionFromRuntimeEvent('POINT')).toBeNull();
  });

  it('gives receive a low joined-arm silhouette', () => {
    const pose = getPlayerMotionPose('RECEIVE');
    expect(pose.leftArmY).toBeLessThan(1.2);
    expect(pose.rightArmY).toBeLessThan(1.2);
    expect(pose.armSpread).toBeLessThan(0.2);
  });

  it('uses stronger body pitch for diving than ordinary receive', () => {
    const receive = getPlayerMotionPose('RECEIVE');
    const dive = getPlayerMotionPose('DIVE');
    expect(Math.abs(receive.bodyPitch)).toBeGreaterThan(0.05);
    expect(Math.abs(dive.bodyPitch)).toBeGreaterThan(Math.abs(receive.bodyPitch));
  });

  it('gives set and block distinct overhead silhouettes', () => {
    const set = getPlayerMotionPose('SET');
    const block = getPlayerMotionPose('BLOCK');

    expect(set.leftArmY).toBeGreaterThan(1.65);
    expect(block.leftArmY).toBeGreaterThan(set.leftArmY);
    expect(block.armSpread).toBeLessThan(set.armSpread);
  });

  it('uses an asymmetric hitting arm for spikes', () => {
    const pose = getPlayerMotionPose('SPIKE');
    expect(pose.rightArmY).toBeGreaterThan(pose.leftArmY);
    expect(pose.durationMs).toBeGreaterThanOrEqual(300);
  });
});
