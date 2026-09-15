import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Gameplay V3 prototype route', () => {
  it('opens the isolated V3 prototype only when ?v3=1 is present', () => {
    window.history.replaceState({}, '', '/?v3=1');
    render(<App />);
    expect(screen.getByTestId('v3-match-screen')).toBeInTheDocument();
  });

  it('keeps the normal title flow unchanged without the prototype flag', () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    expect(screen.queryByTestId('v3-match-screen')).not.toBeInTheDocument();
    expect(screen.getByText('勝ちバレー')).toBeInTheDocument();
  });
});
