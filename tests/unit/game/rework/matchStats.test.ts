import { describe, expect, it } from 'vitest';
import {
  createReworkMatchStats,
  recordReworkEvent,
} from '../../../../src/game/rework/matchStats';

describe('rework match stats', () => {
  it('counts an unreturned KAI spike as a spike kill', () => {
    let stats = createReworkMatchStats();
    stats = recordReworkEvent(stats, { type: 'SPIKE', actorId: 'home-0', quality: 'GREAT', value: 112 });
    stats = recordReworkEvent(stats, { type: 'POINT', value: 1 });

    expect(stats.spikeKills).toBe(1);
    expect(stats.blockPoints).toBe(0);
    expect(stats.highestSpikeKmh).toBe(112);
  });

  it('does not count a spike kill after the opponent successfully returns it', () => {
    let stats = createReworkMatchStats();
    stats = recordReworkEvent(stats, { type: 'SPIKE', actorId: 'home-0', quality: 'GREAT', value: 105 });
    stats = recordReworkEvent(stats, { type: 'RECEIVE', actorId: 'away-0', quality: 'GOOD' });
    stats = recordReworkEvent(stats, { type: 'POINT', value: 1 });

    expect(stats.spikeKills).toBe(0);
  });

  it('tracks perfect passes, block points and longest rally contacts', () => {
    let stats = createReworkMatchStats();
    stats = recordReworkEvent(stats, { type: 'SERVE', actorId: 'away-0' });
    stats = recordReworkEvent(stats, { type: 'RECEIVE', actorId: 'home-0', quality: 'PERFECT' });
    stats = recordReworkEvent(stats, { type: 'SET', actorId: 'home-1', quality: 'GREAT' });
    stats = recordReworkEvent(stats, { type: 'SPIKE', actorId: 'away-0', quality: 'GOOD' });
    stats = recordReworkEvent(stats, { type: 'BLOCK', actorId: 'home-0', quality: 'PERFECT' });
    stats = recordReworkEvent(stats, { type: 'POINT', value: 1 });

    expect(stats.perfectPasses).toBe(1);
    expect(stats.blockPoints).toBe(1);
    expect(stats.longestRally).toBe(5);
    expect(stats.currentRallyContacts).toBe(0);
  });
});
