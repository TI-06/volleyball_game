import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultScreen } from '../../../src/app/screens/ResultScreen';

describe('ResultScreen volleyball stats', () => {
  it('shows rally-specific volleyball stats for the rework match', () => {
    render(
      <ResultScreen
        result={{
          difficulty: 'NORMAL',
          homeScore: 15,
          awayScore: 11,
          highestSpikeKmh: 118.4,
          perfectCount: 5,
          spikeKills: 7,
          blockPoints: 2,
          perfectPasses: 4,
          longestRally: 12,
        }}
        onRematch={() => undefined}
        onDifficulty={() => undefined}
        onTitle={() => undefined}
      />,
    );

    expect(screen.getByText('SPIKE KILL')).toBeInTheDocument();
    expect(screen.getByText('BLOCK')).toBeInTheDocument();
    expect(screen.getByText('PERFECT PASS')).toBeInTheDocument();
    expect(screen.getByText('LONGEST RALLY')).toBeInTheDocument();
    expect(screen.getByText('118.4 km/h')).toBeInTheDocument();
  });
});
