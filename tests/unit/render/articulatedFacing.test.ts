import { describe, expect, it } from 'vitest';
import { getArticulatedFacingYaw } from '../../../src/game/rework/render/character/articulatedFacing';

describe('articulated player camera facing', () => {
  it('turns the sprite plane normal toward the fixed sideline camera', () => {
    const camera = { x: -17.8, y: 6.2, z: -5.3 };
    const player = { x: 0, y: 0, z: 0 };
    const yaw = getArticulatedFacingYaw(camera, player, 'home');

    const normalX = Math.sin(yaw);
    const normalZ = Math.cos(yaw);
    const cameraLength = Math.hypot(camera.x - player.x, camera.z - player.z);
    const cameraX = (camera.x - player.x) / cameraLength;
    const cameraZ = (camera.z - player.z) / cameraLength;
    const facingDot = normalX * cameraX + normalZ * cameraZ;

    expect(facingDot).toBeGreaterThan(0.98);
  });

  it('keeps a small side bias without turning either team edge-on', () => {
    const camera = { x: -17.8, y: 6.2, z: -5.3 };
    const player = { x: 2.5, y: 0, z: 2.2 };
    const home = getArticulatedFacingYaw(camera, player, 'home');
    const away = getArticulatedFacingYaw(camera, player, 'away');

    expect(Math.abs(home - away)).toBeGreaterThan(0.05);
    expect(Math.abs(home - away)).toBeLessThan(0.12);
  });
});
