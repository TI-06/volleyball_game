import * as THREE from 'three';
import type { BallState } from '../core/types';

export const BALL_RENDER_RADIUS = 0.17;

export class BallView {
  readonly mesh: THREE.Mesh;

  constructor() {
    const material = new THREE.MeshToonMaterial({ color: 0xf6f4df });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_RENDER_RADIUS, 24, 16), material);
    this.mesh.castShadow = true;
  }

  update(ball: BallState): void {
    this.mesh.position.set(ball.position.x, ball.position.y, ball.position.z);
    this.mesh.visible = ball.inPlay || ball.position.y > 0;
  }
}
