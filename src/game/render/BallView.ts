import * as THREE from 'three';
import type { BallState } from '../core/types';

export class BallView {
  readonly mesh: THREE.Mesh;

  constructor() {
    const material = new THREE.MeshToonMaterial({ color: 0xf6f4df });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.105, 18, 12), material);
    this.mesh.castShadow = true;
  }

  update(ball: BallState): void {
    this.mesh.position.set(ball.position.x, ball.position.y, ball.position.z);
    this.mesh.visible = ball.inPlay || ball.position.y > 0;
  }
}
