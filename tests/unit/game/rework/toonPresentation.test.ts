import { describe, expect, it } from 'vitest';
import { poseForEvent, poseForPlayerState } from '../../../../src/game/rework/render/toonPresentation';
import { createMatch } from '../../../../src/game/core/createMatch';

describe('rework toon presentation', () => {
  it('maps volleyball contacts to distinct readable poses', () => {
    expect(poseForEvent({ type: 'RECEIVE', actorId: 'home-0' })).toBe('RECEIVE');
    expect(poseForEvent({ type: 'SET', actorId: 'home-1' })).toBe('SET');
    expect(poseForEvent({ type: 'SPIKE', actorId: 'home-0' })).toBe('SPIKE');
    expect(poseForEvent({ type: 'BLOCK', actorId: 'away-1' })).toBe('BLOCK');
  });

  it('keeps airborne players in jump silhouette when no contact pose is active', () => {
    const match = createMatch(1);
    const kai = match.players.find((player) => player.id === 'home-0')!;
    expect(poseForPlayerState({ ...kai, isAirborne: true })).toBe('JUMP');
    expect(poseForPlayerState(kai)).toBe('IDLE');
  });
});
