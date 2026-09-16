import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Gameplay V3 main route', () => {
  it('launches Gameplay V3 at the normal root URL', () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    expect(screen.getByTestId('v3-match-screen')).toBeInTheDocument();
  });

  it('does not require the old ?v3=1 prototype flag', () => {
    window.history.replaceState({}, '', '/?anything=1');
    render(<App />);
    expect(screen.getByTestId('v3-match-screen')).toBeInTheDocument();
  });
});
