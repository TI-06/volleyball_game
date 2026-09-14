import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the game title and CPU match entry point', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'VOLLEYBALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CPU MATCH' })).toBeInTheDocument();
  });

  it('opens the fixed-control rework match from difficulty select', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'CPU MATCH' }));
    fireEvent.click(screen.getByRole('button', { name: /NORMAL/ }));

    expect(screen.getByTestId('rework-match-screen')).toBeInTheDocument();
    expect(screen.getByText('KAI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PLAY/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /POWER/i })).toBeInTheDocument();
  });
});
