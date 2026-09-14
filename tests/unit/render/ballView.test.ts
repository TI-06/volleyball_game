import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BALL_RADIUS } from '../../../src/game/ball/ballPhysics';
import { BALL_RENDER_RADIUS, BallView } from '../../../src/game/render/BallView';

describe('BallView', () => {
  it('renders the ball larger than its physics radius for mobile readability', () => {
    expect(BALL_RADIUS).toBe(0.105);
    expect(BALL_RENDER_RADIUS).toBeGreaterThanOrEqual(0.16);
    expect(BALL_RENDER_RADIUS / BALL_RADIUS).toBeGreaterThanOrEqual(1.5);

    const view = new BallView();
    const geometry = view.mesh.geometry as THREE.SphereGeometry;
    expect(geometry.parameters.radius).toBe(BALL_RENDER_RADIUS);
    geometry.dispose();
    if (Array.isArray(view.mesh.material)) {
      view.mesh.material.forEach((material) => material.dispose());
    } else {
      view.mesh.material.dispose();
    }
  });
});
