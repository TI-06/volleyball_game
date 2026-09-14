import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TutorialScreen } from '../../../src/app/screens/TutorialScreen';

describe('TutorialScreen', () => {
  it('does not advance when the required volleyball action misses', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const { rerender } = render(
      <TutorialScreen event={null} onComplete={onComplete} onSkip={onSkip} />,
    );

    expect(screen.getByText('まずは拾う')).toBeInTheDocument();
    rerender(
      <TutorialScreen
        event={{ type: 'RECEIVE', actorId: 'home-2', quality: 'MISS' }}
        onComplete={onComplete}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByText('まずは拾う')).toBeInTheDocument();
    expect(screen.queryByText('攻撃につなぐ')).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('advances after a successful home receive and lets the player skip explicitly', () => {
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const { rerender } = render(
      <TutorialScreen event={null} onComplete={onComplete} onSkip={onSkip} />,
    );

    rerender(
      <TutorialScreen
        event={{ type: 'RECEIVE', actorId: 'home-2', quality: 'GREAT' }}
        onComplete={onComplete}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByText('攻撃につなぐ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SKIP' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
