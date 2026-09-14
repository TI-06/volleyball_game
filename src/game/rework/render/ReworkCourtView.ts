import * as THREE from 'three';
import { COURT } from '../../core/constants';

function makeLine(
  points: THREE.Vector3[],
  color: number,
  opacity = 1,
): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Line(geometry, material);
}

export class ReworkCourtView {
  readonly group = new THREE.Group();

  constructor() {
    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width + 8, COURT.length + 7),
      new THREE.MeshStandardMaterial({ color: 0x07111b, roughness: 0.94, metalness: 0 }),
    );
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.045;
    surround.receiveShadow = true;
    this.group.add(surround);

    const home = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width, COURT.length / 2),
      new THREE.MeshStandardMaterial({ color: 0x123d53, roughness: 0.86, metalness: 0 }),
    );
    home.rotation.x = -Math.PI / 2;
    home.position.set(0, 0, -COURT.length / 4);
    home.receiveShadow = true;
    this.group.add(home);

    const away = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width, COURT.length / 2),
      new THREE.MeshStandardMaterial({ color: 0x4a2531, roughness: 0.86, metalness: 0 }),
    );
    away.rotation.x = -Math.PI / 2;
    away.position.set(0, 0, COURT.length / 4);
    away.receiveShadow = true;
    this.group.add(away);

    const white = 0xeef9ff;
    const halfWidth = COURT.width / 2;
    const halfLength = COURT.length / 2;
    const y = 0.035;
    this.group.add(
      makeLine([
        new THREE.Vector3(-halfWidth, y, -halfLength),
        new THREE.Vector3(halfWidth, y, -halfLength),
        new THREE.Vector3(halfWidth, y, halfLength),
        new THREE.Vector3(-halfWidth, y, halfLength),
        new THREE.Vector3(-halfWidth, y, -halfLength),
      ], white, 0.95),
    );
    this.group.add(makeLine([
      new THREE.Vector3(-halfWidth, y, 0),
      new THREE.Vector3(halfWidth, y, 0),
    ], 0xffffff, 1));

    for (const z of [-3, 3]) {
      this.group.add(makeLine([
        new THREE.Vector3(-halfWidth, y, z),
        new THREE.Vector3(halfWidth, y, z),
      ], 0xc8e6ef, 0.38));
    }

    const netTop = COURT.netHeight;
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xeaf7fb, roughness: 0.5 });
    for (const x of [-halfWidth - 0.12, halfWidth + 0.12]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, netTop + 0.42, 10), postMaterial);
      post.position.set(x, (netTop + 0.42) / 2, 0);
      this.group.add(post);
    }

    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(COURT.width + 0.3, 0.075, 0.055),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x253940, emissiveIntensity: 0.18 }),
    );
    tape.position.set(0, netTop, 0);
    this.group.add(tape);

    const netMaterial = new THREE.LineBasicMaterial({ color: 0xd9edf2, transparent: true, opacity: 0.3 });
    for (let x = -halfWidth; x <= halfWidth + 0.001; x += 0.45) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 1.15, 0),
        new THREE.Vector3(x, netTop, 0),
      ]);
      this.group.add(new THREE.Line(geometry, netMaterial));
    }
    for (let netY = 1.2; netY <= netTop + 0.001; netY += 0.2) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfWidth, netY, 0),
        new THREE.Vector3(halfWidth, netY, 0),
      ]);
      this.group.add(new THREE.Line(geometry, netMaterial));
    }
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    });
  }
}
