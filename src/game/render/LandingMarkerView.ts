import * as THREE from 'three';
import type { LandingAssist } from '../ball/landingAssist';

export class LandingMarkerView {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;

  constructor() {
    this.material = new THREE.MeshBasicMaterial({
      color: 0x65dfd0,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 1, 48),
      this.material,
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.mesh.renderOrder = 4;
  }

  update(assist: LandingAssist | null): void {
    if (!assist) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;
    this.mesh.position.set(assist.position.x, assist.position.y, assist.position.z);
    this.mesh.scale.set(assist.radius, assist.radius, assist.radius);
    this.material.opacity = assist.opacity;
  }
}
