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
  mesh.renderOrder = 3;
  mesh.visible = false;
  return mesh;
}

function floorRouteStrip(
  color: number,
  opacity: number,
): THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.018, 0.32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  mesh.renderOrder = 2;
  mesh.visible = false;
  return mesh;
}

function place(mesh: THREE.Object3D, point: Vec3 | null): void {
  mesh.visible = Boolean(point);
  if (point) mesh.position.set(point.x, point.y, point.z);
}

function placeRouteStrip(
  strip: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>,
  from: Vec3 | null,
  to: Vec3 | null,
): void {
  strip.visible = Boolean(from && to);
  if (!from || !to) return;

  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  if (length < 0.05) {
    strip.visible = false;
    return;
  }

  strip.position.set(
    (from.x + to.x) / 2,
    Math.max(0.045, (from.y + to.y) / 2),
    (from.z + to.z) / 2,
  );
  strip.scale.set(length, 1, 1);
  strip.rotation.set(0, -Math.atan2(dz, dx), 0);
}

export class ReworkMarkers {
  readonly group = new THREE.Group();
  private readonly receiveOwner = floorRing(0.44, 0.57, 0x59f4df, 0.62);
  private readonly receiveOuter = floorRing(0.78, 0.92, 0x59f4df, 0.74);
  private readonly receiveInner = floorRing(0.28, 0.36, 0xffffff, 0.82);
  private readonly serveOuter = floorRing(0.63, 0.8, 0xffdf70, 0.7);
  private readonly serveInner = floorRing(0.12, 0.19, 0xffffff, 0.84);
  private readonly setterOwner = floorRing(0.42, 0.56, 0x63c7ff, 0.8);
  private readonly setterTarget = floorRing(0.62, 0.78, 0x63c7ff, 0.82);
  private readonly setterTargetCore = floorRing(0.12, 0.21, 0xffffff, 0.9);
  private readonly setterRoute = floorRouteStrip(0x63c7ff, 0.74);
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
      this.setterRoute,
      this.setterOwner,
      this.setterTarget,
      this.setterTargetCore,
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
    place(this.setterOwner, markers.setterPosition);
    place(this.setterTarget, markers.setterTarget);
    place(this.setterTargetCore, markers.setterTarget);
    placeRouteStrip(this.setterRoute, markers.setterPosition, markers.setterTarget);
    place(this.approach, markers.approach);
    place(this.block, markers.blockTarget);

    const receivePulse = 0.94 + Math.sin(timeSeconds * 7) * 0.06;
    this.receiveOwner.scale.setScalar(0.96 + Math.sin(timeSeconds * 6.2) * 0.04);
    this.receiveOuter.scale.setScalar(receivePulse);

    const setterPulse = 0.96 + Math.sin(timeSeconds * 6.4) * 0.04;
    this.setterOwner.scale.setScalar(setterPulse);
    const setterTargetPulse = 0.94 + Math.sin(timeSeconds * 5.6) * 0.06;
    this.setterTarget.scale.setScalar(setterTargetPulse);
    this.setterTargetCore.scale.setScalar(0.94 + Math.sin(timeSeconds * 5.6 + 0.8) * 0.06);
    this.setterRoute.material.opacity = 0.68 + (Math.sin(timeSeconds * 5.2) + 1) * 0.07;

    const prepApproach = markers.approachStage === 'PREP';
    this.approach.material.color.setHex(prepApproach ? 0xffa95e : 0xf6d35c);
    this.approach.material.opacity = prepApproach ? 0.58 : 0.78;
    this.approach.scale.setScalar(
      prepApproach
        ? 0.97 + Math.sin(timeSeconds * 4.4) * 0.03
        : 0.94 + Math.sin(timeSeconds * 7.2) * 0.06,
    );

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
      this.setterOwner,
      this.setterTarget,
      this.setterTargetCore,
      this.approach,
      this.block,
      ...this.attackLanes,
    ];
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.setterRoute.geometry.dispose();
    this.setterRoute.material.dispose();
  }
}
