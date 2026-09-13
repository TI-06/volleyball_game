import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

describe('App', () => {
  it('shows the game title and CPU match entry point', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'VOLLEYBALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CPU MATCH' })).toBeInTheDocument();
  });
});
