import { describe, expect, it } from 'vitest';
import { createReworkRuntime } from '../../../../src/game/rework/playableRuntime';
import { prepareReworkTutorial } from '../../../../src/game/rework/tutorialStart';

describe('rework tutorial start', () => {
  it('starts with an away float serve traveling toward KAI', () => {
    const runtime = prepareReworkTutorial(createReworkRuntime(1, 'NORMAL'));
    expect(runtime.match.rally.phase).toBe('RALLY');
    expect(runtime.match.ball.lastContact).toBe('SERVE');
    expect(runtime.match.ball.lastTouchedBy?.startsWith('away-')).toBe(true);
    expect(runtime.match.ball.velocity.z).toBeLessThan(0);
    expect(runtime.focusPlayerId).toBe('home-0');
  });
});
