import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  V3MatchScreen,
  isV3JumpControlEnabled,
} from '../../../src/app/screens/V3MatchScreen';

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('V3MatchScreen', () => {
  it('renders the production mobile controls without prototype copy', () => {
    render(<V3MatchScreen seed={73} />);

    expect(screen.getByTestId('v3-match-screen')).toBeInTheDocument();
    expect(screen.getByTestId('v3-movement-pad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ACTION' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DIVE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JUMP' })).toBeInTheDocument();
    expect(screen.getByTestId('v3-attack-pad')).toBeInTheDocument();
    expect(screen.getByText('VOLLEYBALL')).toBeInTheDocument();
    expect(screen.queryByText('GAMEPLAY V3')).not.toBeInTheDocument();
    expect(screen.getByText('DEFENSE READ')).toBeInTheDocument();
    expect(screen.getByText('0 - 0')).toBeInTheDocument();
  });

  it('enables early JUMP only after KAI owns the SET BUILDUP', () => {
    expect(isV3JumpControlEnabled('SET_BUILDUP', 'home-0')).toBe(true);
    expect(isV3JumpControlEnabled('SET_BUILDUP', 'home-1')).toBe(false);
    expect(isV3JumpControlEnabled('SET_BUILDUP', 'home-2')).toBe(false);
    expect(isV3JumpControlEnabled('ATTACK_APPROACH', 'home-0')).toBe(true);
    expect(isV3JumpControlEnabled('ATTACK_AIRBORNE', 'home-0')).toBe(false);
  });

  it('freezes the requested local set audit state in the HUD', () => {
    window.history.replaceState({}, '', '/?v3audit=set');
    render(<V3MatchScreen seed={73} />);

    expect(screen.getByText('ATTACK APPROACH')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JUMP' })).toBeEnabled();
  });

  it('freezes the requested local spike audit state in the HUD', () => {
    window.history.replaceState({}, '', '/?v3audit=spike');
    render(<V3MatchScreen seed={73} />);

    expect(screen.getByText('ATTACK AIRBORNE')).toBeInTheDocument();
    expect(screen.getByTestId('v3-attack-pad')).toHaveClass('is-ready');
  });
});
