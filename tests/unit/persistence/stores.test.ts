import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../../../src/persistence/gameStorage';
import { loadRecords, saveMatchResult } from '../../../src/persistence/recordStore';
import { loadSettings } from '../../../src/persistence/settingsStore';

describe('local persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('falls back safely when storage is missing or invalid', () => {
    expect(loadSettings()).toMatchObject({
      tutorialComplete: false,
      switchMode: 'STANDARD',
      cameraMode: 'STANDARD',
      unlockedDifficulties: ['BEGINNER', 'NORMAL', 'HARD'],
    });

    window.localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadRecords()).toMatchObject({ matchesPlayed: 0, wins: 0 });
  });

  it('ignores unknown future fields while keeping known settings', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 99,
        settings: {
          tutorialComplete: true,
          switchMode: 'MANUAL',
          cameraMode: 'LOW',
          unlockedDifficulties: ['MASTER'],
          futureThing: 'ignored',
        },
        records: { futureRecords: true },
      }),
    );

    expect(loadSettings()).toMatchObject({
      tutorialComplete: true,
      switchMode: 'MANUAL',
      cameraMode: 'LOW',
    });
  });

  it('unlocks EXPERT after a HARD win and MASTER after an EXPERT win', () => {
    let persisted = saveMatchResult({
      difficulty: 'HARD',
      homeScore: 15,
      awayScore: 10,
      highestSpikeKmh: 112,
      perfectCount: 5,
    });
    expect(persisted.settings.unlockedDifficulties).toContain('EXPERT');

    persisted = saveMatchResult({
      difficulty: 'EXPERT',
      homeScore: 15,
      awayScore: 13,
      highestSpikeKmh: 121,
      perfectCount: 7,
    });
    expect(persisted.settings.unlockedDifficulties).toContain('MASTER');
    expect(persisted.records.highestSpikeKmh).toBe(121);
    expect(persisted.records.perfectCount).toBe(12);
  });
});
