import * as THREE from 'three';
import type { V3RigPose, V3EulerPose } from './V3PoseLibrary';
import type { V3CharacterProfile } from './characterProfiles';

export interface V3RigJoints {
  torso: THREE.Group;
  head: THREE.Group;
  leftUpperArm: THREE.Group;
  rightUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftThigh: THREE.Group;
  rightThigh: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
}

export interface V3CharacterRig {
  root: THREE.Group;
  poseRoot: THREE.Group;
  focusRing: THREE.Mesh;
  joints: V3RigJoints;
  meshCount: number;
  applyPose: (pose: V3RigPose) => void;
  setFocus: (focused: boolean) => void;
  dispose: () => void;
}

function applyEuler(target: THREE.Euler, pose: V3EulerPose): void {
  target.set(pose.x, pose.y, pose.z, 'XYZ');
}

function toon(color: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color });
}

function shadow(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
): THREE.Mesh {
  const result = shadow(new THREE.Mesh(geometry, material));
  result.position.set(...position);
  return result;
}

function addHair(
  parent: THREE.Group,
  profile: V3CharacterProfile,
  hairMaterial: THREE.Material,
  trackGeometry: (geometry: THREE.BufferGeometry) => THREE.BufferGeometry,
  trackMesh: (mesh: THREE.Mesh) => THREE.Mesh,
): void {
  const capGeometry = trackGeometry(new THREE.DodecahedronGeometry(profile.headRadius * 1.01, 1));
  const cap = trackMesh(mesh(capGeometry, hairMaterial, [0, profile.headRadius * 0.42, 0]));
  cap.scale.set(1.04, 0.66, 1.03);
  parent.add(cap);

  const spikeCount = profile.hairStyle === 'SPIKY' ? 6 : profile.hairStyle === 'MESSY' ? 4 : 0;
  if (spikeCount > 0) {
    for (let index = 0; index < spikeCount; index += 1) {
      const angle = (index / spikeCount) * Math.PI * 2;
      const coneGeometry = trackGeometry(
        new THREE.ConeGeometry(profile.headRadius * 0.24, profile.headRadius * 0.72, 5),
      );
      const cone = trackMesh(mesh(coneGeometry, hairMaterial, [
        Math.cos(angle) * profile.headRadius * 0.5,
        profile.headRadius * (0.84 + (index % 2) * 0.14),
        Math.sin(angle) * profile.headRadius * 0.45,
      ]));
      cone.rotation.z = Math.cos(angle) * 0.35;
      cone.rotation.x = Math.sin(angle) * 0.28;
      parent.add(cone);
    }
    return;
  }

  if (profile.hairStyle === 'SWEPT') {
    const fringeGeometry = trackGeometry(
      new THREE.ConeGeometry(profile.headRadius * 0.3, profile.headRadius * 0.75, 5),
    );
    const fringe = trackMesh(mesh(fringeGeometry, hairMaterial, [
      profile.headRadius * 0.48,
      profile.headRadius * 0.64,
      -profile.headRadius * 0.16,
    ]));
    fringe.rotation.z = -0.72;
    parent.add(fringe);
  } else if (profile.hairStyle === 'BOB') {
    const backGeometry = trackGeometry(
      new THREE.SphereGeometry(profile.headRadius * 1.05, 10, 7),
    );
    const back = trackMesh(mesh(backGeometry, hairMaterial, [0, profile.headRadius * 0.1, profile.headRadius * 0.28]));
    back.scale.set(1.08, 1.18, 0.72);
    parent.add(back);
  } else {
    const fringeGeometry = trackGeometry(
      new THREE.BoxGeometry(profile.headRadius * 1.25, profile.headRadius * 0.3, profile.headRadius * 0.5),
    );
    const fringe = trackMesh(mesh(fringeGeometry, hairMaterial, [0, profile.headRadius * 0.55, -profile.headRadius * 0.58]));
    fringe.rotation.x = -0.12;
    parent.add(fringe);
  }
}

export function createV3CharacterRig(profile: V3CharacterProfile): V3CharacterRig {
  const root = new THREE.Group();
  root.name = `v3-character-${profile.id}`;

  const poseRoot = new THREE.Group();
  poseRoot.name = `${profile.id}-pose-root`;
  root.add(poseRoot);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const meshes: THREE.Mesh[] = [];

  const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const trackMaterial = <T extends THREE.Material>(material: T): T => {
    materials.add(material);
    return material;
  };
  const trackMesh = <T extends THREE.Mesh>(value: T): T => {
    meshes.push(value);
    return value;
  };

  const jerseyMaterial = trackMaterial(toon(profile.jersey));
  const accentMaterial = trackMaterial(toon(profile.accent));
  const shortsMaterial = trackMaterial(toon(profile.shorts));
  const skinMaterial = trackMaterial(toon(profile.skin));
  const hairMaterial = trackMaterial(toon(profile.hair));
  const shoeMaterial = trackMaterial(toon(0xf6f8fb));
  const soleMaterial = trackMaterial(toon(0x202a34));

  const hipHeight = profile.legLength + 0.06;
  const upperLegLength = profile.legLength * 0.53;
  const lowerLegLength = profile.legLength * 0.47;
  const upperArmLength = profile.armLength * 0.51;
  const forearmLength = profile.armLength * 0.49;
  const hipWidth = profile.shoulderWidth * 0.56;

  const pelvis = new THREE.Group();
  pelvis.name = `${profile.id}-pelvis`;
  pelvis.position.y = hipHeight;
  poseRoot.add(pelvis);

  const shortsGeometry = trackGeometry(
    new THREE.BoxGeometry(hipWidth * 1.32, 0.22, hipWidth * 0.76),
  );
  pelvis.add(trackMesh(mesh(shortsGeometry, shortsMaterial, [0, 0.02, 0])));

  const torso = new THREE.Group();
  torso.name = `${profile.id}-torso-joint`;
  torso.position.y = 0.08;
  pelvis.add(torso);

  const torsoGeometry = trackGeometry(
    new THREE.CylinderGeometry(
      profile.shoulderWidth * 0.5,
      profile.shoulderWidth * 0.39,
      profile.torsoLength,
      8,
      1,
      false,
    ),
  );
  const torsoMesh = trackMesh(
    mesh(torsoGeometry, jerseyMaterial, [0, profile.torsoLength * 0.5, 0]),
  );
  torsoMesh.scale.z = 0.62;
  torso.add(torsoMesh);

  const chestBandGeometry = trackGeometry(
    new THREE.BoxGeometry(profile.shoulderWidth * 0.82, 0.055, profile.shoulderWidth * 0.34),
  );
  torso.add(
    trackMesh(
      mesh(chestBandGeometry, accentMaterial, [0, profile.torsoLength * 0.62, -profile.shoulderWidth * 0.28]),
    ),
  );

  const neckGeometry = trackGeometry(new THREE.CylinderGeometry(0.055, 0.065, 0.11, 8));
  torso.add(
    trackMesh(mesh(neckGeometry, skinMaterial, [0, profile.torsoLength + 0.05, 0])),
  );

  const head = new THREE.Group();
  head.name = `${profile.id}-head-joint`;
  head.position.set(0, profile.torsoLength + 0.16 + profile.headRadius * 0.58, 0);
  torso.add(head);

  const headGeometry = trackGeometry(
    new THREE.SphereGeometry(profile.headRadius, 14, 10),
  );
  const headMesh = trackMesh(mesh(headGeometry, skinMaterial, [0, 0, 0]));
  headMesh.scale.set(0.9, 1.08, 0.92);
  head.add(headMesh);

  const earGeometry = trackGeometry(
    new THREE.SphereGeometry(profile.headRadius * 0.18, 7, 5),
  );
  head.add(trackMesh(mesh(earGeometry, skinMaterial, [-profile.headRadius * 0.92, 0, 0])));
  head.add(trackMesh(mesh(earGeometry, skinMaterial, [profile.headRadius * 0.92, 0, 0])));

  const eyeGeometry = trackGeometry(new THREE.SphereGeometry(profile.headRadius * 0.055, 6, 4));
  const eyeMaterial = trackMaterial(toon(0x17212c));
  for (const side of [-1, 1] as const) {
    const eye = trackMesh(
      mesh(eyeGeometry, eyeMaterial, [side * profile.headRadius * 0.32, profile.headRadius * 0.06, -profile.headRadius * 0.83]),
    );
    eye.scale.y = 0.7;
    head.add(eye);
  }
  addHair(head, profile, hairMaterial, trackGeometry, trackMesh);

  function buildArm(side: -1 | 1): { upper: THREE.Group; lower: THREE.Group } {
    const upper = new THREE.Group();
    upper.name = `${profile.id}-${side < 0 ? 'left' : 'right'}-upper-arm-joint`;
    upper.position.set(side * profile.shoulderWidth * 0.54, profile.torsoLength * 0.82, 0);
    torso.add(upper);

    const upperGeometry = trackGeometry(
      new THREE.CylinderGeometry(0.058, 0.068, upperArmLength, 8),
    );
    upper.add(
      trackMesh(mesh(upperGeometry, jerseyMaterial, [0, -upperArmLength * 0.5, 0])),
    );

    const lower = new THREE.Group();
    lower.name = `${profile.id}-${side < 0 ? 'left' : 'right'}-forearm-joint`;
    lower.position.y = -upperArmLength;
    upper.add(lower);

    const lowerGeometry = trackGeometry(
      new THREE.CylinderGeometry(0.047, 0.058, forearmLength, 8),
    );
    lower.add(
      trackMesh(mesh(lowerGeometry, skinMaterial, [0, -forearmLength * 0.5, 0])),
    );

    const handGeometry = trackGeometry(
      new THREE.SphereGeometry(0.064, 8, 6),
    );
    const hand = trackMesh(mesh(handGeometry, skinMaterial, [0, -forearmLength - 0.025, 0]));
    hand.scale.set(0.82, 1.15, 0.55);
    lower.add(hand);
    return { upper, lower };
  }

  function buildLeg(side: -1 | 1): { upper: THREE.Group; lower: THREE.Group } {
    const upper = new THREE.Group();
    upper.name = `${profile.id}-${side < 0 ? 'left' : 'right'}-thigh-joint`;
    upper.position.set(side * hipWidth * 0.32, -0.07, 0);
    pelvis.add(upper);

    const upperGeometry = trackGeometry(
      new THREE.CylinderGeometry(0.075, 0.09, upperLegLength, 8),
    );
    upper.add(
      trackMesh(mesh(upperGeometry, skinMaterial, [0, -upperLegLength * 0.5, 0])),
    );

    const lower = new THREE.Group();
    lower.name = `${profile.id}-${side < 0 ? 'left' : 'right'}-shin-joint`;
    lower.position.y = -upperLegLength;
    upper.add(lower);

    const lowerGeometry = trackGeometry(
      new THREE.CylinderGeometry(0.055, 0.072, lowerLegLength, 8),
    );
    lower.add(
      trackMesh(mesh(lowerGeometry, skinMaterial, [0, -lowerLegLength * 0.5, 0])),
    );

    const shoeGeometry = trackGeometry(
      new THREE.BoxGeometry(0.16, 0.1, 0.29),
    );
    const shoe = trackMesh(
      mesh(shoeGeometry, shoeMaterial, [0, -lowerLegLength - 0.03, -0.055]),
    );
    shoe.rotation.x = -0.04;
    lower.add(shoe);

    const soleGeometry = trackGeometry(new THREE.BoxGeometry(0.17, 0.025, 0.3));
    lower.add(
      trackMesh(mesh(soleGeometry, soleMaterial, [0, -lowerLegLength - 0.085, -0.055])),
    );
    return { upper, lower };
  }

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  const ringGeometry = trackGeometry(new THREE.TorusGeometry(0.44, 0.035, 8, 32));
  const ringMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({
      color: profile.accent,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  );
  const focusRing = trackMesh(new THREE.Mesh(ringGeometry, ringMaterial));
  focusRing.name = `${profile.id}-focus-ring`;
  focusRing.rotation.x = -Math.PI / 2;
  focusRing.position.y = 0.035;
  focusRing.renderOrder = 8;
  root.add(focusRing);

  const joints: V3RigJoints = {
    torso,
    head,
    leftUpperArm: leftArm.upper,
    rightUpperArm: rightArm.upper,
    leftForearm: leftArm.lower,
    rightForearm: rightArm.lower,
    leftThigh: leftLeg.upper,
    rightThigh: rightLeg.upper,
    leftShin: leftLeg.lower,
    rightShin: rightLeg.lower,
  };

  function applyPose(pose: V3RigPose): void {
    poseRoot.position.set(pose.rootOffset.x, pose.rootOffset.y, pose.rootOffset.z);
    applyEuler(poseRoot.rotation, pose.rootRotation);
    applyEuler(joints.torso.rotation, pose.torso);
    applyEuler(joints.head.rotation, pose.head);
    applyEuler(joints.leftUpperArm.rotation, pose.leftUpperArm);
    applyEuler(joints.rightUpperArm.rotation, pose.rightUpperArm);
    applyEuler(joints.leftForearm.rotation, pose.leftForearm);
    applyEuler(joints.rightForearm.rotation, pose.rightForearm);
    applyEuler(joints.leftThigh.rotation, pose.leftThigh);
    applyEuler(joints.rightThigh.rotation, pose.rightThigh);
    applyEuler(joints.leftShin.rotation, pose.leftShin);
    applyEuler(joints.rightShin.rotation, pose.rightShin);
  }

  return {
    root,
    poseRoot,
    focusRing,
    joints,
    meshCount: meshes.length,
    applyPose,
    setFocus: (focused: boolean) => {
      focusRing.visible = focused;
    },
    dispose: () => {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      root.clear();
    },
  };
}
