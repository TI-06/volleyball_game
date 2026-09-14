import * as THREE from 'three';
import type { Vec3 } from '../../core/types';
import type { ReworkMarkerState } from './markerState';

function floorRing(
  inner: number,
  outer: number,
  color: number,
  opacity: number,
): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

function place(mesh: THREE.Object3D, point: Vec3 | null): void {
  mesh.visible = Boolean(point);
  if (point) mesh.position.set(point.x, point.y, point.z);
}

export class ReworkMarkers {
  readonly group = new THREE.Group();
  private readonly receiveOuter = floorRing(0.78, 0.92, 0x59f4df, 0.82);
  private readonly receiveInner = floorRing(0.28, 0.36, 0xffffff, 0.9);
  private readonly approach = floorRing(0.62, 0.78, 0xf6d35c, 0.76);
  private readonly block = floorRing(0.52, 0.68, 0xff7b78, 0.82);
  private readonly attackLanes = [
    floorRing(0.54, 0.68, 0x8deeff, 0.46),
    floorRing(0.54, 0.68, 0x8deeff, 0.58),
    floorRing(0.54, 0.68, 0x8deeff, 0.46),
  ];

  constructor() {
    this.group.add(
      this.receiveOuter,
      this.receiveInner,
      this.approach,
      this.block,
      ...this.attackLanes,
    );
  }

  update(markers: ReworkMarkerState, timeSeconds: number): void {
    place(this.receiveOuter, markers.receiveLanding);
    place(this.receiveInner, markers.receiveLanding);
    place(this.approach, markers.approach);
    place(this.block, markers.blockTarget);

    const pulse = 0.94 + Math.sin(timeSeconds * 7) * 0.06;
    this.receiveOuter.scale.setScalar(pulse);
    this.approach.scale.setScalar(0.96 + Math.sin(timeSeconds * 5.4) * 0.04);
    this.block.scale.setScalar(0.95 + Math.sin(timeSeconds * 8.4) * 0.05);

    for (let index = 0; index < this.attackLanes.length; index += 1) {
      place(this.attackLanes[index]!, markers.attackLanes[index] ?? null);
    }
  }

  dispose(): void {
    const meshes = [
      this.receiveOuter,
      this.receiveInner,
      this.approach,
      this.block,
      ...this.attackLanes,
    ];
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}
