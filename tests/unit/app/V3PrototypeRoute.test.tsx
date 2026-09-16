import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App, getV3RouteSeed } from '../../../src/app/App';

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

  it('allows a deterministic seed override only on local diagnostic hosts', () => {
    expect(getV3RouteSeed('localhost', '?v3seed=72')).toBe(72);
    expect(getV3RouteSeed('127.0.0.1', '?v3seed=72')).toBe(72);
    expect(getV3RouteSeed('game.example.com', '?v3seed=72')).toBe(73);
    expect(getV3RouteSeed('localhost', '?v3seed=not-a-number')).toBe(73);
    expect(getV3RouteSeed('localhost', '?v3seed=-1')).toBe(73);
  });
});