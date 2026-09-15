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
  aspect: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getV3CameraPose({
  controlledPosition,
  ballPosition,
  phase,
  aspect,
}: V3CameraPoseInput): V3CameraPose {
  const attacking = phase === 'ATTACK_APPROACH' || phase === 'ATTACK_AIRBORNE';
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const compactBackoff = clamp((1.72 - safeAspect) * 2.5, 0, 1.6);
  const backDistance = (attacking ? 5.05 : 6.25) + compactBackoff;

  return {
    position: {
      x: controlledPosition.x * 0.72 + ballPosition.x * 0.08,
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
