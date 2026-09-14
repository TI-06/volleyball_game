import { describe, expect, it } from 'vitest';
import { MotionPlayer } from '../../../src/game/rework/render/character/motionPlayer';
import type { MotionClip } from '../../../src/game/rework/render/character/motionTypes';
import { DEFAULT_VISUAL_RIG } from '../../../src/game/rework/render/character/visualRig';

function clip(overrides: Partial<MotionClip> = {}): MotionClip {
  return {
    id: 'test',
    durationMs: 1000,
    loop: false,
    keyframes: [
      { at: 0, joints: { root: { x: 0, rotation: 0 }, wristR: { rotation: 0 } } },
      { at: 1, joints: { root: { x: 10, rotation: 1 }, wristR: { rotation: 2 } } },
    ],
    ...overrides,
  };
}

describe('MotionPlayer', () => {
  it('returns the bind pose before any clip is played', () => {
    const player = new MotionPlayer();
    const sample = player.sample(0);

    expect(player.currentClipId).toBeNull();
    expect(sample.normalizedTime).toBe(0);
    expect(sample.atContact).toBe(false);
    expect(sample.pose.root).toEqual(DEFAULT_VISUAL_RIG.bindPose.root);
  });

  it('interpolates position and rotation at the midpoint', () => {
    const player = new MotionPlayer();
    player.play(clip(), 100);

    const sample = player.sample(600);

    expect(sample.normalizedTime).toBeCloseTo(0.5, 5);
    expect(sample.pose.root.x).toBeCloseTo(5, 5);
    expect(sample.pose.root.rotation).toBeCloseTo(0.5, 5);
    expect(sample.pose.wristR.rotation).toBeCloseTo(1, 5);
  });

  it('drops and bends idle arms into a natural athletic ready stance', () => {
    const player = new MotionPlayer();
    player.play(
      clip({
        id: 'idle_ready',
        loop: true,
        keyframes: [
          {
            at: 0,
            joints: {
              shoulderL: { rotation: 0.22 },
              shoulderR: { rotation: -0.22 },
            },
          },
          { at: 1, joints: {} },
        ],
      }),
      0,
    );

    const sample = player.sample(0);
    expect(sample.pose.shoulderL.rotation).toBeGreaterThanOrEqual(1.05);
    expect(sample.pose.shoulderR.rotation).toBeLessThanOrEqual(-1.05);
    expect(sample.pose.elbowL.rotation).toBeLessThanOrEqual(-0.2);
    expect(sample.pose.elbowR.rotation).toBeGreaterThanOrEqual(0.2);
  });

  it('loops a looping clip deterministically', () => {
    const player = new MotionPlayer();
    player.play(clip({ id: 'idle', loop: true }), 0);

    const sample = player.sample(1250);

    expect(sample.normalizedTime).toBeCloseTo(0.25, 5);
    expect(sample.pose.root.x).toBeCloseTo(2.5, 5);
  });

  it('clamps a non-looping clip to its final pose', () => {
    const player = new MotionPlayer();
    player.play(clip(), 0);

    const sample = player.sample(1800);

    expect(sample.normalizedTime).toBe(1);
    expect(sample.pose.root.x).toBe(10);
    expect(sample.pose.wristR.rotation).toBe(2);
  });

  it('reports the contact marker only around the encoded contact window', () => {
    const player = new MotionPlayer();
    player.play(clip({ contactAt: 0.6 }), 0);

    expect(player.sample(530).atContact).toBe(false);
    expect(player.sample(600).atContact).toBe(true);
    expect(player.sample(640).atContact).toBe(true);
    expect(player.sample(700).atContact).toBe(false);
  });

  it('preserves omitted joint properties across cumulative keyframes', () => {
    const player = new MotionPlayer();
    player.play(
      clip({
        keyframes: [
          { at: 0, joints: { wristR: { rotation: 0.4, x: 0.2 } } },
          { at: 0.5, joints: { wristR: { rotation: 1.2 } } },
          { at: 1, joints: { wristR: { rotation: 2 } } },
        ],
      }),
      0,
    );

    expect(player.sample(750).pose.wristR.x).toBeCloseTo(0.2, 5);
  });

  it('blends from the currently sampled pose without an instantaneous jump', () => {
    const player = new MotionPlayer();
    player.play(clip({ id: 'first' }), 0);
    const beforeSwitch = player.sample(500).pose.root.x;

    const second = clip({
      id: 'second',
      keyframes: [
        { at: 0, joints: { root: { x: -8, rotation: -1 } } },
        { at: 1, joints: { root: { x: -4, rotation: -0.5 } } },
      ],
    });
    player.play(second, 500, 200);

    expect(player.currentClipId).toBe('second');
    expect(player.sample(500).pose.root.x).toBeCloseTo(beforeSwitch, 5);
    expect(player.sample(600).pose.root.x).toBeLessThan(beforeSwitch);
    expect(player.sample(700).pose.root.x).toBeCloseTo(-7.2, 5);
  });
});
