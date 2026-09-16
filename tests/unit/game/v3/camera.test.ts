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

  it('reserves the right side of the frame for touch controls during defense', () => {
    const controlledPosition = { x: 2.6, z: -6.15 };
    const ballPosition = { x: -1.1, y: 3.05, z: 1.2 };
    const neutralCameraX = controlledPosition.x * 0.72 + ballPosition.x * 0.08;
    const pose = getV3CameraPose({
      controlledPosition,
      ballPosition,
      phase: 'DEFENSE_READ',
      aspect: 844 / 390,
    });

    expect(pose.position.x - neutralCameraX).toBeGreaterThanOrEqual(0.9);
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

  it('moves closer to the net during BLOCK read so KAI and the attacker stay readable', () => {
    const normalDefense = getV3CameraPose({
      controlledPosition: { x: 0.4, z: -1.05 },
      ballPosition: { x: -0.7, y: 2.9, z: 1.2 },
      phase: 'DEFENSE_READ',
      aspect: 844 / 390,
    });
    const blockRead = getV3CameraPose({
      controlledPosition: { x: 0.4, z: -1.05 },
      ballPosition: { x: -0.7, y: 2.9, z: 1.2 },
      phase: 'DEFENSE_READ',
      defenseKind: 'BLOCK',
      aspect: 844 / 390,
    });

    expect(blockRead.position.z).toBeGreaterThan(normalDefense.position.z + 1.1);
    expect(blockRead.position.z).toBeLessThan(blockRead.target.z - 3.2);
    expect(blockRead.position.y).toBeLessThan(normalDefense.position.y);
    expect(blockRead.target.y).toBeGreaterThanOrEqual(2.15);
    expect(blockRead.fov).toBeLessThan(normalDefense.fov);
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

  it('moves to an oblique rear angle in ATTACK_AIRBORNE so the hitting arm and tucked legs stay readable', () => {
    const rightLane = getV3CameraPose({
      controlledPosition: { x: 2.6, z: -3.5 },
      ballPosition: { x: 2.45, y: 3.35, z: -0.7 },
      phase: 'ATTACK_AIRBORNE',
      aspect: 16 / 9,
    });
    const leftLane = getV3CameraPose({
      controlledPosition: { x: -2.6, z: -3.5 },
      ballPosition: { x: -2.45, y: 3.35, z: -0.7 },
      phase: 'ATTACK_AIRBORNE',
      aspect: 16 / 9,
    });

    expect(rightLane.position.x - rightLane.target.x).toBeGreaterThan(1.45);
    expect(leftLane.position.x - leftLane.target.x).toBeLessThan(-1.45);
    expect(rightLane.position.z).toBeLessThan(rightLane.target.z - 3.5);
    expect(leftLane.position.z).toBeLessThan(leftLane.target.z - 3.5);
  });
});