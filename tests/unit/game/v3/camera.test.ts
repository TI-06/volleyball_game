import { describe, expect, it } from 'vitest';
import { getV3CameraPose } from '../../../../src/game/v3/render/camera';

describe('V3 third-person camera', () => {
  it('stays behind the controlled defender while looking through play toward the ball', () => {
    const pose = getV3CameraPose({
      controlledPosition: { x: 2.6, z: -6.15 },
      ballPosition: { x: -1.1, y: 3.05, z: 1.2 },
      phase: 'DEFENSE_READ',
      aspect: 16 / 9,
    });

    expect(pose.position.z).toBeLessThan(-9);
    expect(pose.position.y).toBeGreaterThan(3.2);
    expect(pose.target.z).toBeGreaterThan(-5.5);
    expect(pose.fov).toBeGreaterThanOrEqual(48);
    expect(pose.fov).toBeLessThanOrEqual(60);
  });

  it('backs up slightly on compact landscape screens instead of cropping the rally', () => {
    const wide = getV3CameraPose({
      controlledPosition: { x: 0, z: -5 },
      ballPosition: { x: 2.8, y: 2.7, z: 2.2 },
      phase: 'DEFENSE_READ',
      aspect: 2,
    });
    const compact = getV3CameraPose({
      controlledPosition: { x: 0, z: -5 },
      ballPosition: { x: 2.8, y: 2.7, z: 2.2 },
      phase: 'DEFENSE_READ',
      aspect: 1.45,
    });

    expect(compact.position.z).toBeLessThan(wide.position.z);
  });

  it('tightens the framing during the attack without crossing in front of KAI', () => {
    const defense = getV3CameraPose({
      controlledPosition: { x: -2.6, z: -4.35 },
      ballPosition: { x: -2.3, y: 3.2, z: -0.7 },
      phase: 'DEFENSE_READ',
      aspect: 16 / 9,
    });
    const attack = getV3CameraPose({
      controlledPosition: { x: -2.6, z: -3.5 },
      ballPosition: { x: -2.5, y: 3.35, z: -0.7 },
      phase: 'ATTACK_AIRBORNE',
      aspect: 16 / 9,
    });

    expect(attack.position.z).toBeLessThan(-3.5);
    expect(attack.fov).toBeLessThanOrEqual(defense.fov);
  });
});
