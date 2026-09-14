import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../../src/game/core/createMatch';
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

  it('frames the match from a low home-corner angle so players read large on phones', () => {
    const frame = getReworkCameraFrame(createMatch(2), 0);
    expect(frame.position.x).toBeGreaterThan(-11);
    expect(frame.position.x).toBeLessThan(-6);
    expect(frame.position.y).toBeGreaterThan(3.5);
    expect(frame.position.y).toBeLessThan(5.8);
    expect(frame.position.z).toBeLessThan(-11);
    expect(frame.lookAt.y).toBeGreaterThanOrEqual(0.9);
    expect(frame.lookAt.z).toBeGreaterThan(0);
    expect(frame.fov).toBeGreaterThanOrEqual(34);
    expect(frame.fov).toBeLessThanOrEqual(40);
  });
});
