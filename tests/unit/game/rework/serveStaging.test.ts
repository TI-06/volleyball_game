import { describe, expect, it } from 'vitest';
import { getServeOrigin } from '../../../../src/game/actions/serve';
import { createMatch } from '../../../../src/game/core/createMatch';
import { getReworkServeStagePosition } from '../../../../src/game/rework/render/serveStaging';

describe('rework serve staging', () => {
  it('uses the exact FLOAT serve origin while the server is waiting', () => {
    const match = createMatch(130);
    const kai = match.players.find((player) => player.id === 'home-0');
    expect(kai).toBeDefined();
    if (!kai) return;

    expect(getReworkServeStagePosition(kai)).toEqual(getServeOrigin(kai, 'FLOAT'));
    expect(getReworkServeStagePosition(kai).y).toBe(2.35);
  });
});
