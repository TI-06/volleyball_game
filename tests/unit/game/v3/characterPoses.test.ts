import { describe, expect, it } from 'vitest';
import { sampleV3Pose } from '../../../../src/game/v3/render/character/V3PoseLibrary';

describe('V3 volleyball pose library', () => {
  it('makes RECEIVE visibly low, forward, and closes both arms into a platform', () => {
    const ready = sampleV3Pose('READY', 0.5, 'home');
    const receive = sampleV3Pose('RECEIVE', 0.65, 'home');

    expect(receive.rootOffset.y).toBeLessThan(-0.32);
    expect(receive.rootOffset.y).toBeLessThan(ready.rootOffset.y);
    expect(receive.torso.x).toBeGreaterThan(0.72);
    expect(receive.leftThigh.x).toBeGreaterThan(0.68);
    expect(receive.rightThigh.x).toBeGreaterThan(0.68);
    expect(receive.leftShin.x).toBeLessThan(-0.82);
    expect(receive.rightShin.x).toBeLessThan(-0.82);
    expect(receive.leftUpperArm.x).toBeLessThan(-1.05);
    expect(receive.rightUpperArm.x).toBeLessThan(-1.05);
    expect(receive.leftUpperArm.z).toBeGreaterThan(0);
    expect(receive.rightUpperArm.z).toBeLessThan(0);
  });

  it('raises both arms for SET and BLOCK', () => {
    const set = sampleV3Pose('SET', 0.6, 'home');
    const block = sampleV3Pose('BLOCK', 0.6, 'home');

    expect(set.leftUpperArm.x).toBeLessThan(-1.5);
    expect(set.rightUpperArm.x).toBeLessThan(-1.5);
    expect(block.leftUpperArm.x).toBeLessThan(-2.2);
    expect(block.rightUpperArm.x).toBeLessThan(-2.2);
  });

  it('uses asymmetric running mechanics for APPROACH', () => {
    const approach = sampleV3Pose('APPROACH', 0.35, 'home');
    expect(Math.abs(approach.leftThigh.x - approach.rightThigh.x)).toBeGreaterThan(0.5);
    expect(Math.abs(approach.leftUpperArm.x - approach.rightUpperArm.x)).toBeGreaterThan(0.5);
  });

  it('lifts the body during JUMP and compresses it during LAND', () => {
    const jump = sampleV3Pose('JUMP', 0.55, 'home');
    const land = sampleV3Pose('LAND', 0.25, 'home');

    expect(jump.rootOffset.y).toBeGreaterThan(0.25);
    expect(land.leftThigh.x).toBeGreaterThan(0.35);
    expect(land.rightThigh.x).toBeGreaterThan(0.35);
  });

  it('draws the hitting arm back then whips it forward in SPIKE', () => {
    const drawn = sampleV3Pose('SPIKE', 0.2, 'home');
    const contact = sampleV3Pose('SPIKE', 0.72, 'home');

    expect(drawn.rightUpperArm.x).toBeGreaterThan(contact.rightUpperArm.x);
    expect(contact.rightUpperArm.x).toBeLessThan(-1.7);
    expect(contact.torso.y).toBeLessThan(drawn.torso.y);
  });

  it('keeps the SPIKE windup clearly airborne with both knees tucked', () => {
    const windup = sampleV3Pose('SPIKE', 0.47, 'home');

    expect(windup.rootOffset.y).toBeGreaterThan(0.52);
    expect(windup.leftThigh.x).toBeGreaterThan(0.24);
    expect(windup.rightThigh.x).toBeGreaterThan(0.18);
    expect(windup.leftShin.x).toBeLessThan(-0.82);
    expect(windup.rightShin.x).toBeLessThan(-0.78);
    expect(windup.torso.x).toBeLessThan(-0.16);
  });

  it('extends forward and down for DIVE', () => {
    const dive = sampleV3Pose('DIVE', 0.55, 'home');
    expect(dive.rootOffset.y).toBeLessThan(-0.18);
    expect(Math.abs(dive.rootOffset.z)).toBeGreaterThan(0.18);
    expect(dive.torso.x).toBeGreaterThan(0.8);
  });
});
