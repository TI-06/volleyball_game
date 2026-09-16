import * as THREE from 'three';
import { V3_COURT } from '../core/constants';

function line(points: THREE.Vector3[], color: number, opacity = 1): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Line(geometry, material);
}

function box(
  size: [number, number, number],
  position: [number, number, number],
  color: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 }),
  );
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  return mesh;
}

export class V3CourtView {
  readonly group = new THREE.Group();

  constructor() {
    const halfWidth = V3_COURT.width / 2;
    const halfLength = V3_COURT.length / 2;
    const floorY = 0;

    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(V3_COURT.width + 11, V3_COURT.length + 12),
      new THREE.MeshStandardMaterial({ color: 0x6a513a, roughness: 0.9, metalness: 0 }),
    );
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.055;
    surround.receiveShadow = true;
    this.group.add(surround);

    const home = new THREE.Mesh(
      new THREE.PlaneGeometry(V3_COURT.width, V3_COURT.length / 2),
      new THREE.MeshStandardMaterial({ color: 0x1b5268, roughness: 0.8, metalness: 0 }),
    );
    home.rotation.x = -Math.PI / 2;
    home.position.set(0, floorY, -V3_COURT.length / 4);
    home.receiveShadow = true;
    this.group.add(home);

    const away = new THREE.Mesh(
      new THREE.PlaneGeometry(V3_COURT.width, V3_COURT.length / 2),
      new THREE.MeshStandardMaterial({ color: 0x6b3545, roughness: 0.8, metalness: 0 }),
    );
    away.rotation.x = -Math.PI / 2;
    away.position.set(0, floorY, V3_COURT.length / 4);
    away.receiveShadow = true;
    this.group.add(away);

    const y = 0.035;
    const white = 0xf3fbff;
    this.group.add(
      line(
        [
          new THREE.Vector3(-halfWidth, y, -halfLength),
          new THREE.Vector3(halfWidth, y, -halfLength),
          new THREE.Vector3(halfWidth, y, halfLength),
          new THREE.Vector3(-halfWidth, y, halfLength),
          new THREE.Vector3(-halfWidth, y, -halfLength),
        ],
        white,
      ),
    );

    this.group.add(
      line(
        [new THREE.Vector3(-halfWidth, y, 0), new THREE.Vector3(halfWidth, y, 0)],
        white,
      ),
    );

    for (const z of [-3, 3]) {
      this.group.add(
        line(
          [new THREE.Vector3(-halfWidth, y, z), new THREE.Vector3(halfWidth, y, z)],
          0xd7edf4,
          0.72,
        ),
      );
    }

    const netTop = V3_COURT.netHeight;
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf2fbff, roughness: 0.48 });
    for (const x of [-halfWidth - 0.12, halfWidth + 0.12]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, netTop + 0.42, 10),
        postMaterial,
      );
      post.position.set(x, (netTop + 0.42) / 2, 0);
      this.group.add(post);
    }

    const tape = box([V3_COURT.width + 0.3, 0.075, 0.055], [0, netTop, 0], 0xffffff);
    this.group.add(tape);

    const netMaterial = new THREE.LineBasicMaterial({
      color: 0xe2f2f6,
      transparent: true,
      opacity: 0.42,
    });
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

    this.group.add(box([22, 8.2, 0.2], [0, 4.05, 14.25], 0x263747));
    this.group.add(box([0.2, 8.2, 29], [-10.9, 4.05, 0], 0x1f303f));
    this.group.add(box([0.2, 8.2, 29], [10.9, 4.05, 0], 0x1f303f));

    for (const side of [-1, 1] as const) {
      for (let step = 0; step < 3; step += 1) {
        this.group.add(
          box(
            [4.1, 0.24 + step * 0.18, 0.64],
            [side * 6.9, 0.12 + step * 0.17, 11.2 + step * 0.58],
            step % 2 === 0 ? 0x30485c : 0x3b5569,
          ),
        );
      }
    }
  }

  dispose(): void {
    const disposedMaterials = new Set<THREE.Material>();
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        material.dispose();
        disposedMaterials.add(material);
      }
    });
  }
}
