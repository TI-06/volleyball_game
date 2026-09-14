import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../src/game/core/createMatch';
import type { MatchState, PlayerState } from '../../../src/game/core/types';
import type { ReworkEvent } from '../../../src/game/rework/types';
import { resolveVisualIntent } from '../../../src/game/rework/render/character/visualIntent';

function player(state: MatchState, id: string): PlayerState {
  const found = state.players.find((entry) => entry.id === id);
  if (!found) throw new Error(`missing player ${id}`);
  return found;
}

function intent(
  state: MatchState,
  id: string,
  event: ReworkEvent | null = null,
): ReturnType<typeof resolveVisualIntent> {
  return resolveVisualIntent(state, player(state, id), event);
}

describe('resolveVisualIntent', () => {
  it('keeps an idle non-server player ready', () => {
    const state = createMatch(7001);
    expect(intent(state, 'home-1')).toEqual({ intent: 'READY', contactEvent: null });
  });

  it('maps lateral and court-relative movement directions', () => {
    const left = createMatch(7002);
    left.rally.phase = 'RALLY';
    player(left, 'home-0').velocity.x = -1;
    expect(intent(left, 'home-0').intent).toBe('MOVE_LEFT');

    const right = createMatch(7003);
    right.rally.phase = 'RALLY';
    player(right, 'home-0').velocity.x = 1;
    expect(intent(right, 'home-0').intent).toBe('MOVE_RIGHT');

    const homeForward = createMatch(7004);
    homeForward.rally.phase = 'RALLY';
    player(homeForward, 'home-0').velocity.z = 1;
    expect(intent(homeForward, 'home-0').intent).toBe('MOVE_FORWARD');

    const awayForward = createMatch(7005);
    awayForward.rally.phase = 'RALLY';
    player(awayForward, 'away-0').velocity.z = -1;
    expect(intent(awayForward, 'away-0').intent).toBe('MOVE_FORWARD');
  });

  it.each([
    [{ type: 'RECEIVE', actorId: 'home-2' } as ReworkEvent, 'home-2', 'RECEIVE'],
    [{ type: 'SET', actorId: 'home-1' } as ReworkEvent, 'home-1', 'SET'],
    [{ type: 'SERVE', actorId: 'home-0' } as ReworkEvent, 'home-0', 'SERVE'],
    [{ type: 'SPIKE', actorId: 'home-0' } as ReworkEvent, 'home-0', 'SPIKE_CONTACT'],
    [{ type: 'BLOCK', actorId: 'away-1' } as ReworkEvent, 'away-1', 'BLOCK'],
  ])('prefers real %s contact events for the actor', (event, id, expected) => {
    const state = createMatch(7010);
    state.rally.phase = 'RALLY';
    const resolved = intent(state, id, event);
    expect(resolved.intent).toBe(expected);
    expect(resolved.contactEvent).toEqual(event);
  });

  it('puts the current server into serve intent before contact', () => {
    const state = createMatch(7020);
    expect(intent(state, 'home-0').intent).toBe('SERVE');
  });

  it('moves the home ace into spike approach after a teammate set', () => {
    const state = createMatch(7030);
    state.rally.phase = 'RALLY';
    const setEvent: ReworkEvent = { type: 'SET', actorId: 'home-1', quality: 'GOOD' };
    expect(intent(state, 'home-0', setEvent).intent).toBe('SPIKE_APPROACH');
  });

  it('prepares the home ace to block after an opponent set near the net', () => {
    const state = createMatch(7031);
    state.rally.phase = 'RALLY';
    player(state, 'home-0').position.z = -1.4;
    const setEvent: ReworkEvent = { type: 'SET', actorId: 'away-2', quality: 'GOOD' };
    expect(intent(state, 'home-0', setEvent).intent).toBe('BLOCK');
  });

  it('drops the selected home receiver into receive-ready before contact', () => {
    const state = createMatch(7032);
    state.rally.phase = 'RALLY';
    state.ball.inPlay = true;
    state.ball.position = { x: 0, y: 3.1, z: 1.5 };
    state.ball.velocity = { x: 0, y: 1.2, z: -8 };
    state.ball.lastTouchedBy = 'away-0';
    player(state, 'home-0').position = { x: 0, y: 0, z: -4 };
    player(state, 'home-1').position = { x: 4, y: 0, z: -8 };
    player(state, 'home-2').position = { x: -4, y: 0, z: -8 };
    expect(intent(state, 'home-0').intent).toBe('RECEIVE');
  });

  it('uses spike jump for an airborne ace during a rally', () => {
    const state = createMatch(7040);
    state.rally.phase = 'RALLY';
    player(state, 'home-0').isAirborne = true;
    expect(intent(state, 'home-0').intent).toBe('SPIKE_JUMP');
  });

  it('shows celebration and frustration from the resolved point winner', () => {
    const state = createMatch(7050);
    state.rally.phase = 'POINT';
    state.rally.lastPointWinner = 'home';
    expect(intent(state, 'home-0').intent).toBe('CELEBRATE');
    expect(intent(state, 'away-0').intent).toBe('FRUSTRATED');
  });

  it('does not mutate gameplay state while resolving presentation', () => {
    const state = createMatch(7060);
    state.rally.phase = 'RALLY';
    player(state, 'home-0').velocity.x = 1.2;
    const before = structuredClone(state);
    resolveVisualIntent(state, player(state, 'home-0'), null);
    expect(state).toEqual(before);
  });
});
