import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMatch } from '../../../../src/game/core/createMatch';
import { COURT } from '../../../../src/game/core/constants';
import { getReworkCameraFrame, REWORK_CAMERA_MODE } from '../../../../src/game/rework/render/ReworkCamera';

describe('rework camera', () => {
  it('keeps a fixed 2.5d camera and only changes zoom amount', () => {
    const match = createMatch(1);
    const normal = getReworkCameraFrame(match, 0);
    const impact = getReworkCameraFrame(match, 0.05);
    expect(normal.mode).toBe(REWORK_CAMERA_MODE);
    expect(impact.position).toEqual(normal.position);
    expect(impact.lookAt).toEqual(normal.lookAt);
    expect(impact.fov).toBeLessThan(normal.fov);
  });

  it('frames the match from a deeper low home-corner angle so the server stays readable', () => {
    const frame = getReworkCameraFrame(createMatch(2), 0);
    expect(frame.position.x).toBeGreaterThan(-9);
    expect(frame.position.x).toBeLessThan(-6.5);
    expect(frame.position.y).toBeGreaterThan(4.5);
    expect(frame.position.y).toBeLessThan(6);
    expect(frame.position.z).toBeLessThan(-15);
    expect(frame.lookAt.y).toBeLessThan(-0.8);
    expect(frame.lookAt.z).toBeGreaterThan(0);
    expect(frame.fov).toBeGreaterThanOrEqual(36);
    expect(frame.fov).toBeLessThanOrEqual(41);
  });

  it('keeps KAI service-line feet inside the phone viewport instead of clipping the controlled player', () => {
    const match = createMatch(3);
    const kai = match.players.find((player) => player.id === 'home-0');
    expect(kai).toBeDefined();
    if (!kai) return;

    const frame = getReworkCameraFrame(match, 0);
    const camera = new THREE.PerspectiveCamera(frame.fov, 932 / 430, 0.1, 90);
    camera.position.set(frame.position.x, frame.position.y, frame.position.z);
    camera.lookAt(frame.lookAt.x, frame.lookAt.y, frame.lookAt.z);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();

    const feet = new THREE.Vector3(
      kai.position.x,
      0,
      -(COURT.length / 2 + 0.35),
    ).project(camera);

    expect(feet.x).toBeGreaterThan(-0.8);
    expect(feet.x).toBeLessThan(0.8);
    expect(feet.y).toBeGreaterThan(-0.72);
    expect(feet.y).toBeLessThan(0.82);
  });
});
