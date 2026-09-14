import * as THREE from 'three';
import { COURT } from '../core/constants';

export class CourtView {
  readonly group = new THREE.Group();

  constructor() {
    const floorMaterial = new THREE.MeshToonMaterial({ color: 0x0e6f78 });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width + 5, COURT.length + 6),
      floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width, COURT.length),
      new THREE.MeshToonMaterial({ color: 0xe7aa68 }),
    );
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.01;
    court.receiveShadow = true;
    this.group.add(court);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const hw = COURT.width / 2;
    const hl = COURT.length / 2;
    const points = [
      new THREE.Vector3(-hw, 0.025, -hl),
      new THREE.Vector3(hw, 0.025, -hl),
      new THREE.Vector3(hw, 0.025, hl),
      new THREE.Vector3(-hw, 0.025, hl),
      new THREE.Vector3(-hw, 0.025, -hl),
    ];
    this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));

    const centerLine = [
      new THREE.Vector3(-hw, 0.026, 0),
      new THREE.Vector3(hw, 0.026, 0),
    ];
    this.group.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(centerLine), lineMaterial),
    );

    const postMaterial = new THREE.MeshToonMaterial({ color: 0x15334b });
    const postGeometry = new THREE.CylinderGeometry(0.06, 0.06, 3.1, 10);
    for (const x of [-hw - 0.28, hw + 0.28]) {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(x, 1.55, 0);
      this.group.add(post);
    }

    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.width + 0.35, 1.05, 9, 4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
      }),
    );
    net.position.set(0, COURT.netHeight - 0.5, 0);
    this.group.add(net);
  }
}
