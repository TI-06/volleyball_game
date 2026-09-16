import { V3_HOME_COURT_BOUNDS } from '../core/movement';
import type { V3Vec2 } from '../types';

export type ForecastStage =
  | 'SET_READ'
  | 'APPROACH_READ'
  | 'CONTACT_READ'
  | 'FLIGHT_CONFIRMED';

export interface LandingForecastInput {
  stage: ForecastStage;
  readOrigin: V3Vec2;
  actualLanding: V3Vec2;
  noiseSample: number;
  radiusScale?: number;
}

export interface LandingForecast {
  center: V3Vec2;
  radius: number;
  confidence: number;
  stage: ForecastStage;
}

const STAGE_PROFILE: Record<
  ForecastStage,
  { radius: number; blend: number; confidence: number }
> = {
  SET_READ: { radius: 2.6, blend: 0.2, confidence: 0.22 },
  APPROACH_READ: { radius: 1.8, blend: 0.45, confidence: 0.48 },
  CONTACT_READ: { radius: 1.05, blend: 0.72, confidence: 0.74 },
  FLIGHT_CONFIRMED: { radius: 0.42, blend: 0.94, confidence: 0.96 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function createLandingForecast(input: LandingForecastInput): LandingForecast {
  const profile = STAGE_PROFILE[input.stage];
  const noise = clamp(Number.isFinite(input.noiseSample) ? input.noiseSample : 0, -1, 1);
  const radiusScale =
    Number.isFinite(input.radiusScale) && (input.radiusScale ?? 0) > 0
      ? input.radiusScale!
      : 1;
  const remaining = 1 - profile.blend;
  const noiseX = noise * profile.radius * 0.09;
  const noiseZ = -noise * profile.radius * 0.04;
  const center = {
    x: clamp(
      lerp(input.readOrigin.x, input.actualLanding.x, profile.blend) + noiseX * remaining,
      V3_HOME_COURT_BOUNDS.minX,
      V3_HOME_COURT_BOUNDS.maxX,
    ),
    z: clamp(
      lerp(input.readOrigin.z, input.actualLanding.z, profile.blend) + noiseZ * remaining,
      V3_HOME_COURT_BOUNDS.minZ,
      V3_HOME_COURT_BOUNDS.maxZ,
    ),
  };

  return {
    center,
    radius: profile.radius * radiusScale,
    confidence: profile.confidence,
    stage: input.stage,
  };
}
