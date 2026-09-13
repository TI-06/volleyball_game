import { useEffect, useMemo, useState } from 'react';
import type { RuntimeEvent } from '../game/runtime/matchRuntime';

interface MatchFeedbackProps {
  event: RuntimeEvent | null;
}

function feedbackFor(event: RuntimeEvent): { title: string; detail?: string; emphasis: boolean } | null {
  if (event.type === 'POINT') {
    return { title: 'POINT', emphasis: true };
  }

  if (event.type === 'SPIKE') {
    if (!event.quality || event.quality === 'MISS' || event.quality === 'BAD') return null;
    return {
      title: event.quality === 'PERFECT' ? 'PERFECT SPIKE' : `${event.quality} SPIKE`,
      detail: event.value ? `${event.value.toFixed(1)} km/h` : undefined,
      emphasis: event.quality === 'PERFECT',
    };
  }

  if (event.type === 'BLOCK') {
    if (event.quality === 'PERFECT') return { title: 'SHUT OUT!', emphasis: true };
    if (event.quality === 'GREAT' || event.quality === 'GOOD') {
      return { title: 'BLOCK TOUCH', emphasis: false };
    }
    return null;
  }

  if (event.type === 'DIVE' && event.quality && event.quality !== 'MISS') {
    return {
      title: event.quality === 'PERFECT' || event.quality === 'GREAT' ? 'NICE SAVE' : 'DIVE',
      emphasis: event.quality === 'PERFECT',
    };
  }

  if ((event.type === 'RECEIVE' || event.type === 'SET') && event.quality) {
    if (event.quality !== 'PERFECT' && event.quality !== 'GREAT') return null;
    return {
      title: `${event.quality} ${event.type}`,
      emphasis: event.quality === 'PERFECT',
    };
  }

  if (event.type === 'SERVE') {
    return { title: 'SERVE', emphasis: false };
  }

  return null;
}

export function MatchFeedback({ event }: MatchFeedbackProps) {
  const [visibleEvent, setVisibleEvent] = useState<RuntimeEvent | null>(null);

  useEffect(() => {
    if (!event) return undefined;
    const feedback = feedbackFor(event);
    if (!feedback) return undefined;

    setVisibleEvent(event);
    const timeout = window.setTimeout(
      () => setVisibleEvent((current) => (current === event ? null : current)),
      event.type === 'POINT' ? 780 : 620,
    );
    return () => window.clearTimeout(timeout);
  }, [event]);

  const feedback = useMemo(
    () => (visibleEvent ? feedbackFor(visibleEvent) : null),
    [visibleEvent],
  );

  if (!feedback) return null;

  return (
    <div
      className={`match-feedback${feedback.emphasis ? ' is-emphasis' : ''}`}
      role="status"
      aria-live="polite"
    >
      <strong>{feedback.title}</strong>
      {feedback.detail ? <span>{feedback.detail}</span> : null}
    </div>
  );
}
