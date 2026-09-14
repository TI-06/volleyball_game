import { describe, expect, it } from 'vitest';
import type { ReworkEvent } from '../../../src/game/rework/types';
import {
  ArticulatedMotionController,
  type ArticulatedIntentInput,
} from '../../../src/game/rework/render/character/ArticulatedPlayerView';
import { MOTION_CLIPS } from '../../../src/game/rework/render/character/motionClips';

function input(
  intent: ArticulatedIntentInput['intent'],
  contactEvent: ReworkEvent | null = null,
): ArticulatedIntentInput {
  return { intent, contactEvent };
}

function after(start: number, clip: keyof typeof MOTION_CLIPS): number {
  return start + MOTION_CLIPS[clip].durationMs + 1;
}

describe('ArticulatedMotionController', () => {
  it('returns from a receive contact through recovery to ready', () => {
    const controller = new ArticulatedMotionController();
    controller.update(input('READY'), 0);
    expect(controller.currentClipId).toBe('idle_ready');

    const event: ReworkEvent = { type: 'RECEIVE', actorId: 'home-0', quality: 'GOOD' };
    controller.update(input('RECEIVE', event), 100);
    expect(controller.currentClipId).toBe('receive_contact');

    let now = after(100, 'receive_contact');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('receive_recover');

    now = after(now, 'receive_recover');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('idle_ready');
  });

  it('plays approach, jump, spike contact, landing, then returns to ready', () => {
    const controller = new ArticulatedMotionController();
    let now = 0;
    controller.update(input('SPIKE_APPROACH'), now);
    expect(controller.currentClipId).toBe('spike_approach_1');

    now = after(now, 'spike_approach_1');
    controller.update(input('SPIKE_APPROACH'), now);
    expect(controller.currentClipId).toBe('spike_approach_2');

    now = after(now, 'spike_approach_2');
    controller.update(input('SPIKE_APPROACH'), now);
    expect(controller.currentClipId).toBe('spike_plant');

    now += 20;
    controller.update(input('SPIKE_JUMP'), now);
    expect(controller.currentClipId).toBe('spike_takeoff');

    now = after(now, 'spike_takeoff');
    controller.update(input('SPIKE_JUMP'), now);
    expect(controller.currentClipId).toBe('spike_airborne_cock');

    const spike: ReworkEvent = { type: 'SPIKE', actorId: 'home-0', quality: 'PERFECT' };
    now += 30;
    controller.update(input('SPIKE_CONTACT', spike), now);
    expect(controller.currentClipId).toBe('spike_contact');

    now = after(now, 'spike_contact');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('spike_followthrough');

    now = after(now, 'spike_followthrough');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('land');

    now = after(now, 'land');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('idle_ready');
  });

  it('keeps serve ready before contact and follows through after the real serve event', () => {
    const controller = new ArticulatedMotionController();
    controller.update(input('SERVE'), 0);
    expect(controller.currentClipId).toBe('serve_ready');

    const serve: ReworkEvent = { type: 'SERVE', actorId: 'home-0' };
    controller.update(input('SERVE', serve), 200);
    expect(controller.currentClipId).toBe('serve_swing');

    let now = after(200, 'serve_swing');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('serve_followthrough');

    now = after(now, 'serve_followthrough');
    controller.update(input('READY'), now);
    expect(controller.currentClipId).toBe('idle_ready');
  });
});
