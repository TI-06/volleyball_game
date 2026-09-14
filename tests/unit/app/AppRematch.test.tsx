import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../../../src/persistence/gameStorage';

vi.mock('../../../src/app/screens/ReworkMatchScreen', () => ({
  ReworkMatchScreen: ({
    seed,
    difficulty,
    tutorial,
    onTutorialComplete,
    onFinished,
  }: {
    seed: number;
    difficulty: 'BEGINNER' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER';
    tutorial: boolean;
    onTutorialComplete: () => void;
    onFinished: (result: {
      difficulty: 'BEGINNER' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER';
      homeScore: number;
      awayScore: number;
      highestSpikeKmh: number;
      perfectCount: number;
    }) => void;
  }) => (
    <div
      data-testid="mock-rework-match"
      data-seed={seed}
      data-tutorial={String(tutorial)}
    >
      <button type="button" onClick={onTutorialComplete}>COMPLETE TUTORIAL</button>
      <button
        type="button"
        onClick={() => onFinished({
          difficulty,
          homeScore: 15,
          awayScore: 10,
          highestSpikeKmh: 108.4,
          perfectCount: 2,
        })}
      >
        FINISH MATCH
      </button>
    </div>
  ),
}));

import { App } from '../../../src/app/App';

describe('App rematch lifecycle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('rematches with tutorial off, a normal seed, and no duplicate saved result', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'CPU MATCH' }));
    fireEvent.click(screen.getByRole('button', { name: /NORMAL/ }));

    const firstMatch = screen.getByTestId('mock-rework-match');
    expect(firstMatch).toHaveAttribute('data-seed', '1');
    expect(firstMatch).toHaveAttribute('data-tutorial', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'COMPLETE TUTORIAL' }));
    fireEvent.click(screen.getByRole('button', { name: 'FINISH MATCH' }));

    const savedAfterFinish = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      records?: { matchesPlayed?: number };
    };
    expect(savedAfterFinish.records?.matchesPlayed).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'REMATCH' }));

    const rematch = screen.getByTestId('mock-rework-match');
    expect(rematch).toHaveAttribute('data-tutorial', 'false');
    expect(rematch.getAttribute('data-seed')).not.toBe('1');

    const savedAfterRematch = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      records?: { matchesPlayed?: number };
    };
    expect(savedAfterRematch.records?.matchesPlayed).toBe(1);
  });
});
