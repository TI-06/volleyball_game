import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../../src/app/App';
import { STORAGE_KEY } from '../../../src/persistence/gameStorage';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the game title and CPU match entry point', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'VOLLEYBALL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CPU MATCH' })).toBeInTheDocument();
  });

  it('persists switch and camera settings from the title screen', () => {
    render(<App />);

    fireEvent.click(screen.getByText('SETTINGS'));
    fireEvent.click(screen.getByRole('button', { name: 'MANUAL' }));
    fireEvent.click(screen.getByRole('button', { name: 'OFF' }));

    expect(screen.getByRole('button', { name: 'MANUAL' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'OFF' })).toHaveAttribute('aria-pressed', 'true');

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      settings?: { switchMode?: string; cameraMode?: string };
    };
    expect(saved.settings?.switchMode).toBe('MANUAL');
    expect(saved.settings?.cameraMode).toBe('OFF');
  });
});
