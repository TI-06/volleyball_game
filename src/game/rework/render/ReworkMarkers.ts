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
  private readonly receiveOwner = floorRing(0.44, 0.57, 0x59f4df, 0.62);
  private readonly receiveOuter = floorRing(0.78, 0.92, 0x59f4df, 0.74);
  private readonly receiveInner = floorRing(0.28, 0.36, 0xffffff, 0.82);
  private readonly serveOuter = floorRing(0.63, 0.8, 0xffdf70, 0.7);
  private readonly serveInner = floorRing(0.12, 0.19, 0xffffff, 0.84);
  private readonly approach = floorRing(0.62, 0.78, 0xf6d35c, 0.7);
  private readonly block = floorRing(0.52, 0.68, 0xff7b78, 0.76);
  private readonly attackLanes = [
    floorRing(0.54, 0.68, 0x8deeff, 0.4),
    floorRing(0.54, 0.68, 0x8deeff, 0.5),
    floorRing(0.54, 0.68, 0x8deeff, 0.4),
  ];

  constructor() {
    this.group.add(
      this.receiveOwner,
      this.receiveOuter,
      this.receiveInner,
      this.serveOuter,
      this.serveInner,
      this.approach,
      this.block,
      ...this.attackLanes,
    );
  }

  update(markers: ReworkMarkerState, timeSeconds: number): void {
    place(this.receiveOwner, markers.receiveOwnerPosition);
    place(this.receiveOuter, markers.receiveLanding);
    place(this.receiveInner, markers.receiveLanding);
    place(this.serveOuter, markers.serveTarget);
    place(this.serveInner, markers.serveTarget);
    place(this.approach, markers.approach);
    place(this.block, markers.blockTarget);

    const receivePulse = 0.94 + Math.sin(timeSeconds * 7) * 0.06;
    this.receiveOwner.scale.setScalar(0.96 + Math.sin(timeSeconds * 6.2) * 0.04);
    this.receiveOuter.scale.setScalar(receivePulse);
    this.approach.scale.setScalar(0.96 + Math.sin(timeSeconds * 5.4) * 0.04);
    this.block.scale.setScalar(0.95 + Math.sin(timeSeconds * 8.4) * 0.05);

    const aggression = markers.serveTarget?.aggression ?? 0;
    const servePulse = 0.96 + Math.sin(timeSeconds * (5.2 + aggression * 2.8)) * 0.04;
    this.serveOuter.scale.setScalar(servePulse * (1 + aggression * 0.08));
    this.serveOuter.material.opacity = 0.58 + aggression * 0.2;

    for (let index = 0; index < this.attackLanes.length; index += 1) {
      place(this.attackLanes[index]!, markers.attackLanes[index] ?? null);
    }
  }

  dispose(): void {
    const meshes = [
      this.receiveOwner,
      this.receiveOuter,
      this.receiveInner,
      this.serveOuter,
      this.serveInner,
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
