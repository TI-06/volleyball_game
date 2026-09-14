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

  it('uses a mirrored diagonal view so positive depth movement reads screen-right toward NET', () => {
    const frame = getReworkCameraFrame(createMatch(2), 0);
    expect(frame.position.x).toBeLessThan(-15);
    expect(frame.position.z).toBeLessThan(-4);
  });
});
