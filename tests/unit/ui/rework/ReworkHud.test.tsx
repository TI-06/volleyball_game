import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReworkHud } from '../../../../src/ui/rework/ReworkHud';

describe('ReworkHud', () => {
  it('shows score, KAI and fixed action zones without character switching', () => {
    render(
      <ReworkHud
        homeScore={4}
        awayScore={3}
        playLabel="RECEIVE"
        powerLabel="NONE"
        event={null}
        onMove={() => undefined}
        onPlayPress={() => undefined}
        onPowerPress={() => undefined}
        onPowerRelease={() => undefined}
        onPowerCancel={() => undefined}
      />,
    );
    expect(screen.getByText('KAI')).toBeInTheDocument();
    expect(screen.getByLabelText('PLAYER 4 CPU 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PLAY RECEIVE/i })).toBeInTheDocument();
    expect(screen.queryByText('REN', { selector: 'button *' })).not.toBeInTheDocument();
  });
});
