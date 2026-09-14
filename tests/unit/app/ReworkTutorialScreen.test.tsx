import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReworkTutorialScreen } from '../../../src/app/screens/ReworkTutorialScreen';

const noop = () => undefined;

describe('ReworkTutorialScreen', () => {
  it('does not advance receive step on MISS', () => {
    render(
      <ReworkTutorialScreen
        event={{ type: 'RECEIVE', actorId: 'home-0', quality: 'MISS' }}
        onComplete={vi.fn()}
        onSkip={noop}
      />,
    );

    expect(screen.getByText('PLAYで拾う')).toBeInTheDocument();
  });

  it('advances after a successful receive', () => {
    render(
      <ReworkTutorialScreen
        event={{ type: 'RECEIVE', actorId: 'home-0', quality: 'GOOD' }}
        onComplete={vi.fn()}
        onSkip={noop}
      />,
    );

    expect(screen.getByText('POWERで跳ぶ')).toBeInTheDocument();
  });

  it('does not complete the spike step on MISS', () => {
    const onComplete = vi.fn();
    const { rerender } = render(
      <ReworkTutorialScreen
        event={{ type: 'RECEIVE', actorId: 'home-0', quality: 'GOOD' }}
        onComplete={onComplete}
        onSkip={noop}
      />,
    );
    rerender(
      <ReworkTutorialScreen
        event={{ type: 'JUMP', actorId: 'home-0' }}
        onComplete={onComplete}
        onSkip={noop}
      />,
    );
    rerender(
      <ReworkTutorialScreen
        event={{ type: 'SPIKE', actorId: 'home-0', quality: 'MISS' }}
        onComplete={onComplete}
        onSkip={noop}
      />,
    );

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText('POWERをスワイプ')).toBeInTheDocument();
  });
});
