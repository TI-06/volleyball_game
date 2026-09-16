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
  name?: string,
): THREE.Mesh {
  const result = shadow(new THREE.Mesh(geometry, material));
  result.position.set(...position);
  if (name) result.name = name;
  return result;
}

function createAthleticTorsoGeometry(profile: V3CharacterProfile): THREE.BufferGeometry {
  const segments = 12;
  const yStops = [0, profile.torsoLength * 0.28, profile.torsoLength * 0.72, profile.torsoLength];
  const xRadii = [0.36, 0.41, 0.5, 0.47].map((ratio) => profile.shoulderWidth * ratio);
  const zRadii = [0.24, 0.27, 0.31, 0.29].map((ratio) => profile.shoulderWidth * ratio);
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring < yStops.length; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      vertices.push(
        Math.cos(angle) * xRadii[ring],
        yStops[ring],
        Math.sin(angle) * zRadii[ring],
      );
    }
  }

  for (let ring = 0; ring < yStops.length - 1; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      const a = ring * segments + segment;
      const b = ring * segments + next;
      const c = (ring + 1) * segments + next;
      const d = (ring + 1) * segments + segment;
      indices.push(a, b, d, b, c, d);
    }
  }

  const bottomCenter = vertices.length / 3;
  vertices.push(0, yStops[0], 0);
  const topCenter = vertices.length / 3;
  vertices.push(0, yStops[yStops.length - 1], 0);
  const topRingOffset = (yStops.length - 1) * segments;

  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    indices.push(bottomCenter, next, segment);
    indices.push(topCenter, topRingOffset + segment, topRingOffset + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addHair(
  parent: THREE.Group,
  profile: V3CharacterProfile,
  hairMaterial: THREE.Material,
  trackGeometry: (geometry: THREE.BufferGeometry) => THREE.BufferGeometry,
  trackMesh: (mesh: THREE.Mesh) => THREE.Mesh,
): void {
  const capGeometry = trackGeometry(new THREE.DodecahedronGeometry(profile.headRadius * 1.01, 1));
  const cap = trackMesh(
    mesh(capGeometry, hairMaterial, [0, profile.headRadius * 0.42, 0], `${profile.id}-hair-cap`),
  );
  cap.scale.set(1.05, 0.68, 1.04);
  parent.add(cap);

  const spikeCount = profile.hairStyle === 'SPIKY' ? 7 : profile.hairStyle === 'MESSY' ? 5 : 0;
  if (spikeCount > 0) {
    for (let index = 0; index < spikeCount; index += 1) {
      const angle = (index / spikeCount) * Math.PI * 2;
      const coneGeometry = trackGeometry(
        new THREE.ConeGeometry(profile.headRadius * 0.23, profile.headRadius * 0.76, 6),
      );
      const cone = trackMesh(
        mesh(
          coneGeometry,
          hairMaterial,
          [
            Math.cos(angle) * profile.headRadius * 0.5,
            profile.headRadius * (0.86 + (index % 2) * 0.12),
            Math.sin(angle) * profile.headRadius * 0.46,
          ],
          `${profile.id}-hair-spike-${index}`,
        ),
      );
      cone.rotation.z = Math.cos(angle) * 0.32;
      cone.rotation.x = Math.sin(angle) * 0.26;
      parent.add(cone);
    }
    return;
  }

  if (profile.hairStyle === 'SWEPT') {
    const fringeGeometry = trackGeometry(
      new THREE.ConeGeometry(profile.headRadius * 0.29, profile.headRadius * 0.78, 6),
    );
    const fringe = trackMesh(
      mesh(
        fringeGeometry,
        hairMaterial,
        [profile.headRadius * 0.46, profile.headRadius * 0.66, -profile.headRadius * 0.17],
        `${profile.id}-hair-fringe`,
      ),
    );
    fringe.rotation.z = -0.7;
    parent.add(fringe);
  } else if (profile.hairStyle === 'BOB') {
    const backGeometry = trackGeometry(
      new THREE.SphereGeometry(profile.headRadius * 1.06, 12, 8),
    );
    const back = trackMesh(
      mesh(
        backGeometry,
        hairMaterial,
        [0, profile.headRadius * 0.08, profile.headRadius * 0.3],
        `${profile.id}-hair-bob`,
      ),
    );
    back.scale.set(1.08, 1.2, 0.72);
    parent.add(back);
  } else {
    for (const side of [-1, 0, 1] as const) {
      const tuftGeometry = trackGeometry(
        new THREE.ConeGeometry(profile.headRadius * 0.23, profile.headRadius * 0.54, 6),
      );
      const tuft = trackMesh(
        mesh(
          tuftGeometry,
          hairMaterial,
          [side * profile.headRadius * 0.34, profile.headRadius * 0.67, -profile.headRadius * 0.36],
          `${profile.id}-hair-tuft-${side}`,
        ),
      );
      tuft.rotation.z = side * -0.28;
      tuft.rotation.x = -0.24;
      parent.add(tuft);
    }
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
  const eyeMaterial = trackMaterial(toon(0x17212c));
  const outlineMaterial = trackMaterial(
    new THREE.MeshBasicMaterial({ color: 0x101923, side: THREE.BackSide }),
  );

  const hipHeight = profile.legLength + 0.07;
  const upperLegLength = profile.legLength * 0.53;
  const lowerLegLength = profile.legLength * 0.47;
  const upperArmLength = profile.armLength * 0.51;
  const forearmLength = profile.armLength * 0.49;
  const hipWidth = profile.shoulderWidth * 0.58;
  const jointRadius = Math.max(0.055, profile.shoulderWidth * 0.13);

  const pelvis = new THREE.Group();
  pelvis.name = `${profile.id}-pelvis`;
  pelvis.position.y = hipHeight;
  poseRoot.add(pelvis);

  const waistbandGeometry = trackGeometry(
    new THREE.CylinderGeometry(hipWidth * 0.58, hipWidth * 0.54, 0.1, 12),
  );
  const waistband = trackMesh(
    mesh(waistbandGeometry, shortsMaterial, [0, 0.05, 0], `${profile.id}-waistband`),
  );
  waistband.scale.z = 0.78;
  pelvis.add(waistband);

  for (const side of [-1, 1] as const) {
    const shortGeometry = trackGeometry(
      new THREE.CylinderGeometry(hipWidth * 0.3, hipWidth * 0.27, 0.22, 10),
    );
    const short = trackMesh(
      mesh(
        shortGeometry,
        shortsMaterial,
        [side * hipWidth * 0.27, -0.08, 0],
        `${profile.id}-${side < 0 ? 'left' : 'right'}-short`,
      ),
    );
    short.scale.z = 0.8;
    pelvis.add(short);
  }

  const torso = new THREE.Group();
  torso.name = `${profile.id}-torso-joint`;
  torso.position.y = 0.08;
  pelvis.add(torso);

  const torsoGeometry = trackGeometry(createAthleticTorsoGeometry(profile));
  const torsoShell = trackMesh(
    mesh(torsoGeometry, jerseyMaterial, [0, 0, 0], `${profile.id}-torso-shell`),
  );
  torso.add(torsoShell);

  const torsoOutline = trackMesh(
    mesh(torsoGeometry, outlineMaterial, [0, 0, 0], `${profile.id}-torso-outline`),
  );
  torsoOutline.scale.set(1.035, 1.018, 1.035);
  torsoOutline.renderOrder = -1;
  torso.add(torsoOutline);

  const chestStripeGeometry = trackGeometry(
    new THREE.CapsuleGeometry(profile.shoulderWidth * 0.018, profile.shoulderWidth * 0.58, 4, 8),
  );
  for (const side of [-1, 1] as const) {
    const stripe = trackMesh(
      mesh(
        chestStripeGeometry,
        accentMaterial,
        [side * profile.shoulderWidth * 0.17, profile.torsoLength * 0.66, -profile.shoulderWidth * 0.295],
        `${profile.id}-chest-stripe-${side}`,
      ),
    );
    stripe.rotation.z = side * 0.84;
    torso.add(stripe);
  }

  const neckGeometry = trackGeometry(new THREE.CylinderGeometry(0.058, 0.068, 0.12, 10));
  torso.add(
    trackMesh(
      mesh(neckGeometry, skinMaterial, [0, profile.torsoLength + 0.055, 0], `${profile.id}-neck`),
    ),
  );

  const head = new THREE.Group();
  head.name = `${profile.id}-head-joint`;
  head.position.set(0, profile.torsoLength + 0.17 + profile.headRadius * 0.6, 0);
  torso.add(head);

  const headGeometry = trackGeometry(new THREE.SphereGeometry(profile.headRadius, 18, 12));
  const headMesh = trackMesh(mesh(headGeometry, skinMaterial, [0, 0, 0], `${profile.id}-face`));
  headMesh.scale.set(0.92, 1.08, 0.94);
  head.add(headMesh);

  const headOutline = trackMesh(
    mesh(headGeometry, outlineMaterial, [0, 0, 0], `${profile.id}-head-outline`),
  );
  headOutline.scale.set(0.955, 1.12, 0.978);
  headOutline.renderOrder = -1;
  head.add(headOutline);

  const earGeometry = trackGeometry(new THREE.SphereGeometry(profile.headRadius * 0.18, 8, 6));
  head.add(
    trackMesh(
      mesh(earGeometry, skinMaterial, [-profile.headRadius * 0.91, 0, 0], `${profile.id}-left-ear`),
    ),
  );
  head.add(
    trackMesh(
      mesh(earGeometry, skinMaterial, [profile.headRadius * 0.91, 0, 0], `${profile.id}-right-ear`),
    ),
  );

  const eyeGeometry = trackGeometry(new THREE.SphereGeometry(profile.headRadius * 0.052, 7, 5));
  const browGeometry = trackGeometry(
    new THREE.CapsuleGeometry(profile.headRadius * 0.013, profile.headRadius * 0.095, 3, 6),
  );
  for (const side of [-1, 1] as const) {
    const eye = trackMesh(
      mesh(
        eyeGeometry,
        eyeMaterial,
        [side * profile.headRadius * 0.31, profile.headRadius * 0.05, -profile.headRadius * 0.84],
        `${profile.id}-${side < 0 ? 'left' : 'right'}-eye`,
      ),
    );
    eye.scale.y = 0.72;
    head.add(eye);

    const brow = trackMesh(
      mesh(
        browGeometry,
        hairMaterial,
        [side * profile.headRadius * 0.31, profile.headRadius * 0.2, -profile.headRadius * 0.855],
        `${profile.id}-${side < 0 ? 'left' : 'right'}-brow`,
      ),
    );
    brow.rotation.z = side * 0.12;
    head.add(brow);
  }
  addHair(head, profile, hairMaterial, trackGeometry, trackMesh);

  function buildArm(side: -1 | 1): { upper: THREE.Group; lower: THREE.Group } {
    const sideName = side < 0 ? 'left' : 'right';
    const upper = new THREE.Group();
    upper.name = `${profile.id}-${sideName}-upper-arm-joint`;
    upper.position.set(side * profile.shoulderWidth * 0.52, profile.torsoLength * 0.82, 0);
    torso.add(upper);

    const shoulderGeometry = trackGeometry(new THREE.SphereGeometry(jointRadius * 1.08, 10, 8));
    const shoulder = trackMesh(
      mesh(shoulderGeometry, jerseyMaterial, [0, 0, 0], `${profile.id}-${sideName}-shoulder`),
    );
    shoulder.scale.set(1, 0.92, 0.95);
    upper.add(shoulder);

    const sleeveLength = upperArmLength * 0.3;
    const sleeveGeometry = trackGeometry(
      new THREE.CylinderGeometry(jointRadius * 0.92, jointRadius * 0.78, sleeveLength, 10),
    );
    upper.add(
      trackMesh(
        mesh(
          sleeveGeometry,
          jerseyMaterial,
          [0, -sleeveLength * 0.5, 0],
          `${profile.id}-${sideName}-sleeve`,
        ),
      ),
    );

    const upperSkinLength = upperArmLength - sleeveLength;
    const upperSkinGeometry = trackGeometry(
      new THREE.CylinderGeometry(jointRadius * 0.67, jointRadius * 0.79, upperSkinLength, 10),
    );
    upper.add(
      trackMesh(
        mesh(
          upperSkinGeometry,
          skinMaterial,
          [0, -sleeveLength - upperSkinLength * 0.5, 0],
          `${profile.id}-${sideName}-upper-arm`,
        ),
      ),
    );

    const lower = new THREE.Group();
    lower.name = `${profile.id}-${sideName}-forearm-joint`;
    lower.position.y = -upperArmLength;
    upper.add(lower);

    const elbowGeometry = trackGeometry(new THREE.SphereGeometry(jointRadius * 0.72, 9, 7));
    lower.add(
      trackMesh(mesh(elbowGeometry, skinMaterial, [0, 0, 0], `${profile.id}-${sideName}-elbow`)),
    );

    const forearmGeometry = trackGeometry(
      new THREE.CylinderGeometry(jointRadius * 0.55, jointRadius * 0.68, forearmLength, 10),
    );
    lower.add(
      trackMesh(
        mesh(
          forearmGeometry,
          skinMaterial,
          [0, -forearmLength * 0.5, 0],
          `${profile.id}-${sideName}-forearm`,
        ),
      ),
    );

    const handGeometry = trackGeometry(new THREE.SphereGeometry(jointRadius * 0.72, 10, 7));
    const hand = trackMesh(
      mesh(
        handGeometry,
        skinMaterial,
        [0, -forearmLength - 0.028, 0],
        `${profile.id}-${sideName}-hand`,
      ),
    );
    hand.scale.set(0.82, 1.18, 0.6);
    lower.add(hand);
    return { upper, lower };
  }

  function buildLeg(side: -1 | 1): { upper: THREE.Group; lower: THREE.Group } {
    const sideName = side < 0 ? 'left' : 'right';
    const upper = new THREE.Group();
    upper.name = `${profile.id}-${sideName}-thigh-joint`;
    upper.position.set(side * hipWidth * 0.31, -0.17, 0);
    pelvis.add(upper);

    const thighGeometry = trackGeometry(
      new THREE.CylinderGeometry(jointRadius * 0.83, jointRadius * 1.02, upperLegLength, 11),
    );
    upper.add(
      trackMesh(
        mesh(
          thighGeometry,
          skinMaterial,
          [0, -upperLegLength * 0.5, 0],
          `${profile.id}-${sideName}-thigh`,
        ),
      ),
    );

    const lower = new THREE.Group();
    lower.name = `${profile.id}-${sideName}-shin-joint`;
    lower.position.y = -upperLegLength;
    upper.add(lower);

    const kneeGeometry = trackGeometry(new THREE.SphereGeometry(jointRadius * 0.84, 10, 8));
    const knee = trackMesh(
      mesh(kneeGeometry, skinMaterial, [0, 0, 0], `${profile.id}-${sideName}-knee`),
    );
    knee.scale.set(0.92, 0.86, 0.94);
    lower.add(knee);

    const shinGeometry = trackGeometry(
      new THREE.CylinderGeometry(jointRadius * 0.58, jointRadius * 0.8, lowerLegLength, 11),
    );
    lower.add(
      trackMesh(
        mesh(
          shinGeometry,
          skinMaterial,
          [0, -lowerLegLength * 0.5, 0],
          `${profile.id}-${sideName}-shin`,
        ),
      ),
    );

    const shoeGeometry = trackGeometry(new THREE.CapsuleGeometry(0.065, 0.13, 4, 9));
    const shoe = trackMesh(
      mesh(
        shoeGeometry,
        shoeMaterial,
        [0, -lowerLegLength - 0.045, -0.055],
        `${profile.id}-${sideName}-shoe`,
      ),
    );
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.02, 1, 0.86);
    lower.add(shoe);

    const soleGeometry = trackGeometry(new THREE.BoxGeometry(0.155, 0.022, 0.235));
    lower.add(
      trackMesh(
        mesh(
          soleGeometry,
          soleMaterial,
          [0, -lowerLegLength - 0.102, -0.055],
          `${profile.id}-${sideName}-sole`,
        ),
      ),
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
