import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { V3MatchScreen } from '../../../src/app/screens/V3MatchScreen';

describe('V3MatchScreen', () => {
  it('renders the playable mobile-first v3 controls without requiring WebGL', () => {
    render(<V3MatchScreen seed={73} />);

    expect(screen.getByTestId('v3-match-screen')).toBeInTheDocument();
    expect(screen.getByTestId('v3-movement-pad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ACTION' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DIVE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JUMP' })).toBeInTheDocument();
    expect(screen.getByTestId('v3-attack-pad')).toBeInTheDocument();
    expect(screen.getByText('DEFENSE READ')).toBeInTheDocument();
    expect(screen.getByText('0 - 0')).toBeInTheDocument();
  });
});
