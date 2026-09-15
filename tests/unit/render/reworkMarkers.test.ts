import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ReworkMarkers } from '../../../src/game/rework/render/ReworkMarkers';
import type { ReworkMarkerState } from '../../../src/game/rework/render/markerState';

describe('ReworkMarkers transition guidance', () => {
  it('renders setter origin, setter target, route, and KAI prep marker together', () => {
    const view = new ReworkMarkers();
    const markers = {
      focusedPlayerId: 'home-0',
      receiveOwnerId: null,
      receiveOwnerPosition: null,
      receiveLanding: null,
      serveTarget: null,
      approach: { x: -1.1, y: 0.025, z: -2.65 },
      attackLanes: [],
      blockTarget: null,
      setterId: 'home-1',
      setterPosition: { x: 0.2, y: 0.025, z: -2.0 },
      setterTarget: { x: -1.15, y: 0.025, z: -2.35 },
      approachStage: 'PREP',
    } as ReworkMarkerState & {
      setterId: string;
      setterPosition: { x: number; y: number; z: number };
      setterTarget: { x: number; y: number; z: number };
      approachStage: 'PREP';
    };

    view.update(markers, 0);

    const visible = view.group.children.filter((child) => child.visible);
    expect(visible.length).toBeGreaterThanOrEqual(4);

    const routeStrip = visible.find(
      (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry,
    ) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> | undefined;
    expect(routeStrip).toBeDefined();
    expect(routeStrip?.scale.x ?? 0).toBeGreaterThan(0.8);
    expect(routeStrip?.geometry.parameters.depth ?? 0).toBeGreaterThanOrEqual(0.28);
    expect(routeStrip?.material.opacity ?? 0).toBeGreaterThanOrEqual(0.68);

    view.dispose();
  });
});