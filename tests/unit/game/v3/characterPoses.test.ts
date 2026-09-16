import { describe, expect, it } from 'vitest';
import { sampleV3Pose } from '../../../../src/game/v3/render/character/V3PoseLibrary';

describe('V3 volleyball pose library', () => {
  it('builds RECEIVE as a grounded wide stance with a visible passing platform', () => {
    const ready = sampleV3Pose('READY', 0.5, 'home');
    const receive = sampleV3Pose('RECEIVE', 0.65, 'home');

    // The pelvis drops, but the whole rig must not be buried below the court.
    expect(receive.rootOffset.y).toBeLessThan(-0.08);
    expect(receive.rootOffset.y).toBeGreaterThan(-0.2);
    expect(receive.rootOffset.y).toBeLessThan(ready.rootOffset.y);
    expect(receive.torso.x).toBeGreaterThan(0.58);

    // Bend the knees and open them laterally so the crouch survives the rear camera.
    expect(receive.leftThigh.x).toBeGreaterThan(0.68);
    expect(receive.rightThigh.x).toBeGreaterThan(0.68);
    expect(receive.leftShin.x).toBeLessThan(-0.82);
    expect(receive.rightShin.x).toBeLessThan(-0.82);
    expect(receive.leftThigh.z).toBeLessThan(-0.16);
    expect(receive.rightThigh.z).toBeGreaterThan(0.16);
    expect(receive.leftShin.z).toBeGreaterThan(0.08);
    expect(receive.rightShin.z).toBeLessThan(-0.08);

    // Arms point forward-and-down rather than disappearing directly behind the torso.
    expect(receive.leftUpperArm.x).toBeGreaterThan(-1.0);
    expect(receive.leftUpperArm.x).toBeLessThan(-0.65);
    expect(receive.rightUpperArm.x).toBeGreaterThan(-1.0);
    expect(receive.rightUpperArm.x).toBeLessThan(-0.65);
    expect(receive.leftUpperArm.z).toBeGreaterThan(0.24);
    expect(receive.rightUpperArm.z).toBeLessThan(-0.24);
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

  it('makes the SPIKE windup visibly airborne from the rear camera', () => {
    const windup = sampleV3Pose('SPIKE', 0.47, 'home');

    expect(windup.rootOffset.y).toBeGreaterThan(0.7);
    expect(windup.leftThigh.x).toBeGreaterThan(0.24);
    expect(windup.rightThigh.x).toBeGreaterThan(0.18);
    expect(windup.leftShin.x).toBeLessThan(-0.82);
    expect(windup.rightShin.x).toBeLessThan(-0.78);
    expect(windup.leftThigh.z).toBeLessThan(-0.14);
    expect(windup.rightThigh.z).toBeGreaterThan(0.08);
    expect(windup.leftShin.z).toBeGreaterThan(0.16);
    expect(windup.rightShin.z).toBeLessThan(-0.1);
    expect(windup.torso.x).toBeLessThan(-0.16);
  });

  it('extends forward and down for DIVE', () => {
    const dive = sampleV3Pose('DIVE', 0.55, 'home');
    expect(dive.rootOffset.y).toBeLessThan(-0.18);
    expect(Math.abs(dive.rootOffset.z)).toBeGreaterThan(0.18);
    expect(dive.torso.x).toBeGreaterThan(0.8);
  });
});
