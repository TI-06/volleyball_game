import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeEvent } from '../../../src/game/runtime/matchRuntime';
import { MatchFeedback } from '../../../src/ui/MatchFeedback';

afterEach(() => {
  vi.useRealTimers();
});

describe('MatchFeedback', () => {
  it('keeps a perfect spike visible after the source event resets', () => {
    vi.useFakeTimers();
    const event: RuntimeEvent = {
      type: 'SPIKE',
      actorId: 'home-0',
      quality: 'PERFECT',
      value: 121.4,
    };
    const view = render(<MatchFeedback event={event} />);

    expect(screen.getByText('PERFECT SPIKE')).toBeInTheDocument();
    expect(screen.getByText('121.4 km/h')).toBeInTheDocument();

    view.rerender(<MatchFeedback event={null} />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText('PERFECT SPIKE')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('PERFECT SPIKE')).not.toBeInTheDocument();
  });

  it('shows a perfect block as SHUT OUT', () => {
    render(
      <MatchFeedback
        event={{ type: 'BLOCK', actorId: 'home-0', quality: 'PERFECT' }}
      />,
    );

    expect(screen.getByText('SHUT OUT!')).toBeInTheDocument();
  });
});
