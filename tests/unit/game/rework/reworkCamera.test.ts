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

  it('uses enough diagonal offset to keep attack lanes readable', () => {
    const frame = getReworkCameraFrame(createMatch(2), 0);
    expect(frame.position.x).toBeGreaterThan(15);
    expect(Math.abs(frame.position.z)).toBeGreaterThan(4);
  });
});
