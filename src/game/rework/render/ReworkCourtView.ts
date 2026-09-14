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

function box(
  name: string,
  size: [number, number, number],
  position: [number, number, number],
  color: number,
  options: { roughness?: number; emissive?: number; emissiveIntensity?: number } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.82,
      metalness: 0,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    }),
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  return mesh;
}

export class ReworkCourtView {
  readonly group = new THREE.Group();

  constructor() {
    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width + 11, COURT.length + 12),
      new THREE.MeshStandardMaterial({ color: 0x6a513a, roughness: 0.88, metalness: 0 }),
    );
    surround.name = 'gym-floor-surround';
    surround.rotation.x = -Math.PI / 2;
    surround.position.y = -0.055;
    surround.receiveShadow = true;
    this.group.add(surround);

    // Indoor gym shell. The geometry stays outside the playable court and is
    // deliberately low-detail so it adds place/scale without hiding the ball.
    this.group.add(box('gym-back-wall', [22, 8.2, 0.2], [0, 4.05, 14.25], 0x263747));
    this.group.add(box('gym-side-wall-left', [0.2, 8.2, 29], [-10.9, 4.05, 0], 0x1f303f));
    this.group.add(box('gym-side-wall-right', [0.2, 8.2, 29], [10.9, 4.05, 0], 0x1f303f));
    this.group.add(box('gym-wall-trim', [22, 0.18, 0.24], [0, 2.2, 14.08], 0xb98a55));

    for (let index = -4; index <= 4; index += 1) {
      const panel = box(
        `gym-wall-panel-${index + 4}`,
        [0.035, 7.7, 0.23],
        [index * 2.35, 4.05, 14.05],
        0x506171,
        { roughness: 0.72 },
      );
      this.group.add(panel);
    }

    const scoreboard = box(
      'gym-scoreboard',
      [4.3, 1.55, 0.24],
      [0, 5.45, 14.0],
      0x071019,
      { emissive: 0x071019, emissiveIntensity: 0.35 },
    );
    this.group.add(scoreboard);
    this.group.add(box('gym-score-home', [0.78, 0.46, 0.06], [-0.92, 5.45, 13.85], 0x1bc7b3, { emissive: 0x0c766b, emissiveIntensity: 0.7 }));
    this.group.add(box('gym-score-away', [0.78, 0.46, 0.06], [0.92, 5.45, 13.85], 0xf06b69, { emissive: 0x792c2b, emissiveIntensity: 0.65 }));

    for (const side of [-1, 1] as const) {
      const bleachers = new THREE.Group();
      bleachers.name = side < 0 ? 'gym-bleachers-left' : 'gym-bleachers-right';
      bleachers.position.set(side * 6.9, 0, 11.2);
      for (let step = 0; step < 3; step += 1) {
        const seat = box(
          `${bleachers.name}-step-${step}`,
          [4.1, 0.24 + step * 0.18, 0.64],
          [0, 0.12 + step * 0.17, step * 0.58],
          step % 2 === 0 ? 0x30485c : 0x3b5569,
          { roughness: 0.78 },
        );
        bleachers.add(seat);
      }
      this.group.add(bleachers);
    }

    for (let index = 0; index < 4; index += 1) {
      const light = box(
        `gym-ceiling-light-${index}`,
        [2.7, 0.08, 0.42],
        [-5.0 + index * 3.35, 7.75, 1.8 + (index % 2) * 1.3],
        0xf1fbff,
        { emissive: 0xdff8ff, emissiveIntensity: 2.3, roughness: 0.3 },
      );
      this.group.add(light);
    }

    for (const x of [-7.6, -2.5, 2.5, 7.6]) {
      this.group.add(box(`gym-ceiling-beam-${x}`, [0.16, 0.16, 29], [x, 7.92, 0], 0x172532));
    }

    const home = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width, COURT.length / 2),
      new THREE.MeshStandardMaterial({ color: 0x1b5268, roughness: 0.8, metalness: 0 }),
    );
    home.rotation.x = -Math.PI / 2;
    home.position.set(0, 0, -COURT.length / 4);
    home.receiveShadow = true;
    this.group.add(home);

    const away = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width, COURT.length / 2),
      new THREE.MeshStandardMaterial({ color: 0x6b3545, roughness: 0.8, metalness: 0 }),
    );
    away.rotation.x = -Math.PI / 2;
    away.position.set(0, 0, COURT.length / 4);
    away.receiveShadow = true;
    this.group.add(away);

    const white = 0xf3fbff;
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
      ], white, 0.98),
    );
    this.group.add(makeLine([
      new THREE.Vector3(-halfWidth, y, 0),
      new THREE.Vector3(halfWidth, y, 0),
    ], 0xffffff, 1));

    for (const z of [-3, 3]) {
      this.group.add(makeLine([
        new THREE.Vector3(-halfWidth, y, z),
        new THREE.Vector3(halfWidth, y, z),
      ], 0xd7edf4, 0.68));
    }

    for (const z of [-halfLength, halfLength]) {
      const outward = z < 0 ? -1 : 1;
      for (const x of [-halfWidth, halfWidth]) {
        this.group.add(makeLine([
          new THREE.Vector3(x, y, z),
          new THREE.Vector3(x, y, z + outward * 0.34),
        ], white, 0.82));
      }
    }

    const netTop = COURT.netHeight;
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf2fbff, roughness: 0.48 });
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

    const netMaterial = new THREE.LineBasicMaterial({ color: 0xe2f2f6, transparent: true, opacity: 0.42 });
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

    const antennaSegmentHeight = 0.16;
    const antennaSegments = 5;
    for (const x of [-halfWidth, halfWidth]) {
      for (let index = 0; index < antennaSegments; index += 1) {
        const material = new THREE.MeshStandardMaterial({
          color: index % 2 === 0 ? 0xff4f52 : 0xf5fbff,
          roughness: 0.48,
          emissive: index % 2 === 0 ? 0x351014 : 0x182025,
          emissiveIntensity: 0.16,
        });
        const segment = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, antennaSegmentHeight, 8),
          material,
        );
        segment.position.set(x, netTop + antennaSegmentHeight * (index + 0.5), 0);
        this.group.add(segment);
      }
    }
  }

  dispose(): void {
    const disposedMaterials = new Set<THREE.Material>();
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const material = object.material;
        const materials = Array.isArray(material) ? material : [material];
        for (const item of materials) {
          if (disposedMaterials.has(item)) continue;
          item.dispose();
          disposedMaterials.add(item);
        }
      }
    });
  }
}
