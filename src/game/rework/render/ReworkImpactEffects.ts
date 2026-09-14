import * as THREE from 'three';
import type { ReworkEvent } from '../types';
import { getReworkImpactStyle } from './impactStyle';

interface ActiveImpact {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  startedAt: number;
  durationMs: number;
  maxScale: number;
  startOpacity: number;
}

export class ReworkImpactEffects {
  readonly group = new THREE.Group();
  private readonly active: ActiveImpact[] = [];

  play(event: ReworkEvent, position: THREE.Vector3): void {
    const style = getReworkImpactStyle(event);
    if (!style) return;

    const geometry = new THREE.RingGeometry(0.34, 0.46, 40);
    const material = new THREE.MeshBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: style.startOpacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, 0.045, position.z);
    this.group.add(mesh);
    this.active.push({
      mesh,
      startedAt: performance.now(),
      durationMs: style.durationMs,
      maxScale: style.maxScale,
      startOpacity: style.startOpacity,
    });
  }

  update(now = performance.now()): void {
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const impact = this.active[index]!;
      const progress = Math.max(0, Math.min(1, (now - impact.startedAt) / impact.durationMs));
      const eased = 1 - (1 - progress) * (1 - progress);
      const scale = 1 + (impact.maxScale - 1) * eased;
      impact.mesh.scale.setScalar(scale);
      impact.mesh.material.opacity = impact.startOpacity * (1 - progress);
      if (progress >= 1) {
        this.group.remove(impact.mesh);
        impact.mesh.geometry.dispose();
        impact.mesh.material.dispose();
        this.active.splice(index, 1);
      }
    }
  }

  dispose(): void {
    for (const impact of this.active) {
      this.group.remove(impact.mesh);
      impact.mesh.geometry.dispose();
      impact.mesh.material.dispose();
    }
    this.active.length = 0;
  }
}
