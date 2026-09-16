import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  V3MatchScreen,
  getV3PointFeedback,
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

  it('shows BLOCK instead of receive controls during a quick-attack read', () => {
    render(<V3MatchScreen seed={72} />);

    expect(screen.getByTestId('v3-match-screen')).toHaveAttribute('data-v3-defense-kind', 'BLOCK');
    expect(screen.getByText('BLOCK READ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ACTION' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'DIVE' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'BLOCK' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'JUMP' })).not.toBeInTheDocument();
  });

  it('shows a short point beat only for scoring events', () => {
    expect(
      getV3PointFeedback(
        {
          type: 'ATTACK',
          quality: 'GOOD',
          intent: 'POWER',
          actorId: 'home-0',
          point: 'home',
        },
        0.2,
      ),
    ).toEqual({ title: 'POINT!', detail: 'POWER', side: 'home' });
    expect(getV3PointFeedback({ type: 'POINT', point: 'away' }, 0.3)).toEqual({
      title: 'CPU POINT',
      detail: null,
      side: 'away',
    });
    expect(
      getV3PointFeedback({ type: 'BLOCK', result: 'STUFF', actorId: 'home-0' }, 0.2),
    ).toEqual({
      title: 'POINT!',
      detail: 'STUFF BLOCK',
      side: 'home',
    });
    expect(
      getV3PointFeedback({ type: 'BLOCK', result: 'MISS', actorId: 'home-0' }, 0.2),
    ).toBeNull();
    expect(getV3PointFeedback({ type: 'SET', actorId: 'home-1' }, 0.2)).toBeNull();
    expect(
      getV3PointFeedback(
        {
          type: 'ATTACK',
          quality: 'GOOD',
          intent: 'CROSS',
          actorId: 'home-0',
          point: 'home',
        },
        0.8,
      ),
    ).toBeNull();
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