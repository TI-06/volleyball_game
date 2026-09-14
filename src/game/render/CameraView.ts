import * as THREE from 'three';
import type { CameraIntent } from '../camera/cameraDirector';

export class CameraView {
  private readonly target = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  snap(intent: CameraIntent): void {
    this.camera.position.set(intent.position.x, intent.position.y, intent.position.z);
    this.target.set(intent.target.x, intent.target.y, intent.target.z);
    this.camera.fov = intent.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
  }

  update(intent: CameraIntent, dt: number): void {
    const duration = Math.max(0.05, intent.transitionSeconds);
    const alpha = 1 - Math.exp((-4.6 * Math.max(0, dt)) / duration);
    const desiredPosition = new THREE.Vector3(
      intent.position.x,
      intent.position.y,
      intent.position.z,
    );
    const desiredTarget = new THREE.Vector3(intent.target.x, intent.target.y, intent.target.z);

    this.camera.position.lerp(desiredPosition, alpha);
    this.target.lerp(desiredTarget, alpha);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, intent.fov, alpha);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.target);
  }
}
