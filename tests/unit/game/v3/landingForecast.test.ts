import { describe, expect, it } from 'vitest';
import { createLandingForecast, type ForecastStage } from '../../../../src/game/v3/prediction/landingForecast';

const stages: ForecastStage[] = ['SET_READ', 'APPROACH_READ', 'CONTACT_READ', 'FLIGHT_CONFIRMED'];

function distanceToActual(forecast: { center: { x: number; z: number } }) {
  return Math.hypot(forecast.center.x - 2.1, forecast.center.z + 6.8);
}

describe('V3 landing forecast', () => {
  it('narrows and converges as the attack reveals more information', () => {
    const forecasts = stages.map((stage) =>
      createLandingForecast({
        stage,
        readOrigin: { x: -1.8, z: -4.7 },
        actualLanding: { x: 2.1, z: -6.8 },
        noiseSample: 0.55,
      }),
    );

    expect(forecasts.map((forecast) => forecast.radius)).toEqual([2.6, 1.8, 1.05, 0.42]);
    for (let index = 1; index < forecasts.length; index += 1) {
      expect(distanceToActual(forecasts[index])).toBeLessThan(distanceToActual(forecasts[index - 1]));
      expect(forecasts[index].confidence).toBeGreaterThan(forecasts[index - 1].confidence);
    }
  });

  it('is deterministic for identical read information and noise', () => {
    const input = {
      stage: 'APPROACH_READ' as const,
      readOrigin: { x: 0.4, z: -4.2 },
      actualLanding: { x: -2.4, z: -7.1 },
      noiseSample: -0.35,
    };
    expect(createLandingForecast(input)).toEqual(createLandingForecast(input));
  });
});
