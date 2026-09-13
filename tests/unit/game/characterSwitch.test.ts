import { describe, expect, it } from 'vitest';
import { createMatch } from '../../../src/game/core/createMatch';
import { getSwitchCandidate, requestManualSwitch } from '../../../src/game/input/characterSwitch';

describe('character switching', () => {
  it('chooses the likely receiver in STANDARD mode', () => {
    const base = createMatch(2);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        position: { x: 2.4, y: 3.2, z: -4.8 },
        velocity: { x: 0.1, y: -2.5, z: -0.2 },
      },
    };

    const decision = getSwitchCandidate(state, {
      mode: 'STANDARD',
      currentPlayerId: 'home-0',
    });

    expect(decision.playerId).toBe('home-2');
    expect(decision.reason).toBe('BALL_TARGET');
    expect(decision.warningLead).toBeCloseTo(0.35);
  });

  it('does not force an automatic switch during strong STANDARD movement input', () => {
    const base = createMatch(2);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        position: { x: 2.4, y: 3.2, z: -4.8 },
        velocity: { x: 0.1, y: -2.5, z: -0.2 },
      },
    };

    expect(
      getSwitchCandidate(state, {
        mode: 'STANDARD',
        currentPlayerId: 'home-0',
        strongMovement: true,
      }),
    ).toMatchObject({ playerId: null, reason: 'HELD_BY_INPUT' });
  });

  it('disables automatic switching in MANUAL mode', () => {
    const state = createMatch(3);
    expect(
      getSwitchCandidate(state, { mode: 'MANUAL', currentPlayerId: 'home-0' }),
    ).toMatchObject({ playerId: null, reason: 'MANUAL_MODE' });
  });

  it('queues a manual switch while the current player cannot cancel the action', () => {
    const base = createMatch(4);
    const state = {
      ...base,
      players: base.players.map((player) =>
        player.id === 'home-0' ? { ...player, isAirborne: true } : player,
      ),
    };

    expect(requestManualSwitch(state, 'home-0', 'home-2')).toEqual({
      activePlayerId: 'home-0',
      queuedPlayerId: 'home-2',
    });
  });

  it('switches quickly to the teammate under the actual set trajectory', () => {
    const base = createMatch(5);
    const state = {
      ...base,
      rally: { ...base.rally, phase: 'RALLY' as const },
      ball: {
        ...base.ball,
        inPlay: true,
        lastTouchedBy: 'home-1',
        position: { x: 0.4, y: 2.1, z: -1.1 },
        velocity: { x: 4.2, y: 3.6, z: 0.35 },
      },
    };

    const decision = getSwitchCandidate(state, {
      mode: 'STANDARD',
      currentPlayerId: 'home-1',
    });

    expect(decision.playerId).toBe('home-2');
    expect(decision.warningLead).toBeCloseTo(0.08);
  });
});
