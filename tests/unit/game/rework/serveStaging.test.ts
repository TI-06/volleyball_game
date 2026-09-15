import { describe, expect, it } from 'vitest';
import { COURT } from '../../../../src/game/core/constants';
import { createMatch } from '../../../../src/game/core/createMatch';
import { getReworkServeStagePosition } from '../../../../src/game/rework/render/serveStaging';

describe('rework serve staging', () => {
  it('holds the staged ball near the server hand instead of covering the face', () => {
    const match = createMatch(130);
    const kai = match.players.find((player) => player.id === 'home-0');
    expect(kai).toBeDefined();
    if (!kai) return;

    const position = getReworkServeStagePosition(kai);
    expect(position.y).toBeGreaterThanOrEqual(1.3);
    expect(position.y).toBeLessThanOrEqual(1.6);
    expect(Math.abs(position.x - kai.position.x)).toBeGreaterThanOrEqual(0.28);
    expect(position.z).toBeGreaterThan(-(COURT.length / 2 + 0.35));
    expect(position.z).toBeLessThan(-COURT.length / 2 + 0.5);
  });
});
