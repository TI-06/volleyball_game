import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

describe('application match flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('moves from title to difficulty selection', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'CPU MATCH' }));
    expect(screen.getByRole('heading', { name: '難易度を選択' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /NORMAL/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /EXPERT/ })).toBeDisabled();
  });

  it('opens the match shell after selecting an unlocked difficulty', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'CPU MATCH' }));
    fireEvent.click(screen.getByRole('button', { name: /NORMAL/ }));
    expect(screen.getByTestId('match-screen')).toBeInTheDocument();
    expect(screen.getByText(/TUTORIAL/)).toBeInTheDocument();
  });
});
