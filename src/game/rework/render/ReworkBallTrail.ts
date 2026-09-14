import * as THREE from 'three';
import type { BallState } from '../../core/types';
import { getReworkBallTrailStrength } from './ballTrailStyle';

const TRAIL_POINTS = 4;

export class ReworkBallTrail {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.SphereGeometry(0.075, 10, 8);
  private readonly meshes: Array<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>> = [];

  constructor() {
    for (let index = 0; index < TRAIL_POINTS; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xdffcff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.visible = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update(ball: BallState): void {
    const strength = ball.inPlay ? getReworkBallTrailStrength(ball.velocity) : 0;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y, ball.velocity.z);
    if (strength <= 0 || speed <= 0.001) {
      for (const mesh of this.meshes) mesh.visible = false;
      return;
    }

    const nx = ball.velocity.x / speed;
    const ny = ball.velocity.y / speed;
    const nz = ball.velocity.z / speed;
    const spacing = 0.16 + strength * 0.08;

    for (let index = 0; index < this.meshes.length; index += 1) {
      const mesh = this.meshes[index]!;
      const distance = spacing * (index + 1);
      mesh.visible = true;
      mesh.position.set(
        ball.position.x - nx * distance,
        ball.position.y - ny * distance,
        ball.position.z - nz * distance,
      );
      const falloff = 1 - index / (this.meshes.length + 0.5);
      mesh.material.opacity = strength * 0.28 * falloff;
      const scale = 1 - index * 0.1;
      mesh.scale.setScalar(scale);
    }
  }

  dispose(): void {
    this.geometry.dispose();
    for (const mesh of this.meshes) mesh.material.dispose();
  }
}
