import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createV3CharacterRig } from '../../../../src/game/v3/render/character/V3CharacterRig';
import { profileFor } from '../../../../src/game/v3/render/character/characterProfiles';
import { sampleV3Pose } from '../../../../src/game/v3/render/character/V3PoseLibrary';

describe('V3CharacterRig', () => {
  it('builds a named articulated volleyball body rather than a single capsule avatar', () => {
    const rig = createV3CharacterRig(profileFor('kai'));

    expect(rig.root.name).toContain('kai');
    expect(rig.joints.torso).toBeDefined();
    expect(rig.joints.head).toBeDefined();
    expect(rig.joints.leftUpperArm).toBeDefined();
    expect(rig.joints.leftForearm).toBeDefined();
    expect(rig.joints.rightUpperArm).toBeDefined();
    expect(rig.joints.rightForearm).toBeDefined();
    expect(rig.joints.leftThigh).toBeDefined();
    expect(rig.joints.leftShin).toBeDefined();
    expect(rig.joints.rightThigh).toBeDefined();
    expect(rig.joints.rightShin).toBeDefined();
    expect(rig.meshCount).toBeGreaterThanOrEqual(18);

    rig.dispose();
  });

  it('uses rounded athletic body volumes instead of boxy placeholder anatomy', () => {
    const rig = createV3CharacterRig(profileFor('kai'));
    const torsoShell = rig.root.getObjectByName('kai-torso-shell');
    const leftShoulder = rig.root.getObjectByName('kai-left-shoulder');
    const rightShoulder = rig.root.getObjectByName('kai-right-shoulder');
    const leftKnee = rig.root.getObjectByName('kai-left-knee');
    const rightKnee = rig.root.getObjectByName('kai-right-knee');
    const leftShort = rig.root.getObjectByName('kai-left-short');
    const rightShort = rig.root.getObjectByName('kai-right-short');

    expect(torsoShell).toBeInstanceOf(THREE.Mesh);
    expect(leftShoulder).toBeInstanceOf(THREE.Mesh);
    expect(rightShoulder).toBeInstanceOf(THREE.Mesh);
    expect(leftKnee).toBeInstanceOf(THREE.Mesh);
    expect(rightKnee).toBeInstanceOf(THREE.Mesh);
    expect(leftShort).toBeInstanceOf(THREE.Mesh);
    expect(rightShort).toBeInstanceOf(THREE.Mesh);
    expect(rig.meshCount).toBeGreaterThanOrEqual(28);

    rig.dispose();
  });

  it('defines positive local z as the visual front of the character', () => {
    const rig = createV3CharacterRig(profileFor('kai'));
    const leftEye = rig.root.getObjectByName('kai-left-eye');
    const rightEye = rig.root.getObjectByName('kai-right-eye');
    const leftStripe = rig.root.getObjectByName('kai-chest-stripe--1');
    const rightStripe = rig.root.getObjectByName('kai-chest-stripe-1');

    expect(leftEye).toBeInstanceOf(THREE.Mesh);
    expect(rightEye).toBeInstanceOf(THREE.Mesh);
    expect(leftEye?.position.z).toBeGreaterThan(0);
    expect(rightEye?.position.z).toBeGreaterThan(0);
    expect(leftStripe?.position.z).toBeGreaterThan(0);
    expect(rightStripe?.position.z).toBeGreaterThan(0);

    rig.dispose();
  });

  it('applies volleyball poses to independent joints', () => {
    const rig = createV3CharacterRig(profileFor('kai'));
    const spike = sampleV3Pose('SPIKE', 0.72, 'home');

    rig.applyPose(spike);

    expect(rig.joints.rightUpperArm.rotation.x).toBeCloseTo(spike.rightUpperArm.x, 5);
    expect(rig.joints.rightForearm.rotation.x).toBeCloseTo(spike.rightForearm.x, 5);
    expect(rig.joints.torso.rotation.y).toBeCloseTo(spike.torso.y, 5);
    expect(rig.poseRoot.position.y).toBeCloseTo(spike.rootOffset.y, 5);

    rig.dispose();
  });

  it('keeps the focus marker independent from the animated body', () => {
    const rig = createV3CharacterRig(profileFor('hina'));

    rig.setFocus(false);
    expect(rig.focusRing.visible).toBe(false);
    rig.setFocus(true);
    expect(rig.focusRing.visible).toBe(true);

    rig.dispose();
  });
});
