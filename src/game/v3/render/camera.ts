import type { V3DefenseKind } from '../core/runtime';
import type { V3RallyPhase, V3Vec2, V3Vec3 } from '../types';

export interface V3CameraPose {
  position: V3Vec3;
  target: V3Vec3;
  fov: number;
}

interface V3CameraPoseInput {
  controlledPosition: V3Vec2;
  ballPosition: V3Vec3;
  phase: V3RallyPhase;
  defenseKind?: V3DefenseKind;
  aspect: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getV3CameraPose({
  controlledPosition,
  ballPosition,
  phase,
  defenseKind = 'RECEIVE',
  aspect,
}: V3CameraPoseInput): V3CameraPose {
  const attacking = phase === 'ATTACK_APPROACH' || phase === 'ATTACK_AIRBORNE';
  const blocking = defenseKind === 'BLOCK' && phase === 'DEFENSE_READ';
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const compactBackoff = clamp((1.72 - safeAspect) * 2.5, 0, 1.6);

  if (blocking) {
    // Block reads need a closer, lower rear camera than floor defense. Keep
    // enough distance to read lateral alignment while making the net, ball,
    // blocker hands, and opposing hitter share the same compact phone frame.
    const backDistance = 4.55 + compactBackoff * 0.45;
    return {
      position: {
        x: controlledPosition.x * 0.7 + ballPosition.x * 0.08 + 0.55,
        y: 4.05,
        z: controlledPosition.z - backDistance,
      },
      target: {
        x: controlledPosition.x * 0.32 + ballPosition.x * 0.68,
        y: Math.max(2.15, 1.1 + ballPosition.y * 0.5),
        z: controlledPosition.z * 0.18 + ballPosition.z * 0.82,
      },
      fov: 49,
    };
  }

  const backDistance = (attacking ? 5.05 : 6.25) + compactBackoff;
  const touchControlLaneOffset = attacking ? 0 : 1.0;

  // A straight rear camera flattens the spike silhouette: the hitting-arm
  // windup and tucked legs overlap the torso. Start orbiting during approach
  // and move farther toward the attacker's outside shoulder once airborne.
  // This remains behind the player and keeps the ball/net in front while
  // making the volleyball-specific pose readable on a phone.
  const attackSide = controlledPosition.x >= 0 ? 1 : -1;
  const attackOrbitOffset =
    phase === 'ATTACK_AIRBORNE'
      ? attackSide * 2.15
      : phase === 'ATTACK_APPROACH'
        ? attackSide * 0.9
        : 0;

  return {
    position: {
      x:
        controlledPosition.x * 0.72 +
        ballPosition.x * 0.08 +
        touchControlLaneOffset +
        attackOrbitOffset,
      y: attacking ? 4.15 : 4.65,
      z: controlledPosition.z - backDistance,
    },
    target: {
      x: controlledPosition.x * 0.36 + ballPosition.x * 0.64,
      y: Math.max(1.65, 0.78 + ballPosition.y * 0.58),
      z: controlledPosition.z * 0.34 + ballPosition.z * 0.66,
    },
    fov: attacking ? 49 : 54,
  };
}