import { describe, expect, it } from 'vitest';
import { chooseCpuServeTarget } from '../../../src/game/ai/serveTargeting';

const receivers = [
  { id: 'home-0', x: -2.6, z: -5.5, receive: 62 },
  { id: 'home-1', x: 0, z: -5.5, receive: 78 },
  { id: 'home-2', x: 2.6, z: -5.5, receive: 96 },
] as const;

describe('cpu serve targeting', () => {
  it('is deterministic for the same match seed and rally index', () => {
    const first = chooseCpuServeTarget('HARD', 12345, 4, receivers);
    const second = chooseCpuServeTarget('HARD', 12345, 4, receivers);
    expect(second).toEqual(first);
  });

  it('keeps beginner serves in a forgiving central band', () => {
    for (let rally = 0; rally < 12; rally += 1) {
      const target = chooseCpuServeTarget('BEGINNER', 99, rally, receivers);
      expect(Math.abs(target.x)).toBeLessThanOrEqual(1.8);
      expect(target.z).toBeGreaterThanOrEqual(-6.4);
      expect(target.z).toBeLessThanOrEqual(-4.6);
    }
  });

  it('makes harder cpu levels exploit the weaker receiver without locking every serve to them', () => {
    const targets = Array.from({ length: 18 }, (_, rally) =>
      chooseCpuServeTarget('EXPERT', 777, rally, receivers),
    );
    const nearKai = targets.filter((target) => Math.abs(target.x - receivers[0].x) < 1.15).length;
    const distinctLanes = new Set(targets.map((target) => Math.round(target.x))).size;

    expect(nearKai).toBeGreaterThanOrEqual(7);
    expect(nearKai).toBeLessThan(18);
    expect(distinctLanes).toBeGreaterThanOrEqual(3);
  });

  it('lets master mix weak-receiver pressure with open-space serves', () => {
    const targets = Array.from({ length: 20 }, (_, rally) =>
      chooseCpuServeTarget('MASTER', 424242, rally, receivers),
    );
    const rounded = new Set(targets.map((target) => `${target.x.toFixed(1)}:${target.z.toFixed(1)}`));

    expect(rounded.size).toBeGreaterThanOrEqual(6);
    expect(targets.some((target) => Math.abs(target.x) < 1.3)).toBe(true);
    expect(targets.some((target) => Math.abs(target.x) > 2.5)).toBe(true);
  });

  it('always returns a legal home-court target', () => {
    for (const difficulty of ['BEGINNER', 'NORMAL', 'HARD', 'EXPERT', 'MASTER'] as const) {
      for (let rally = 0; rally < 16; rally += 1) {
        const target = chooseCpuServeTarget(difficulty, 314159, rally, receivers);
        expect(target.x).toBeGreaterThanOrEqual(-4.2);
        expect(target.x).toBeLessThanOrEqual(4.2);
        expect(target.z).toBeGreaterThanOrEqual(-8.2);
        expect(target.z).toBeLessThanOrEqual(-3.8);
      }
    }
  });
});
