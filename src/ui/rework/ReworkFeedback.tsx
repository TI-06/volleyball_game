import { useEffect, useRef, useState } from 'react';
import type { ReworkEvent } from '../../game/rework/types';

function label(event: ReworkEvent): string | null {
  if (event.type === 'POINT') return event.value && event.value > 0 ? 'POINT!' : 'CPU POINT';
  if (event.type === 'SPIKE') {
    const speed = event.value ? ` ${Math.round(event.value)} km/h` : '';
    return `${event.quality === 'PERFECT' ? 'PERFECT ' : ''}SPIKE${speed}`;
  }
  if (event.type === 'BLOCK') return event.quality === 'PERFECT' ? 'SHUT OUT!' : 'BLOCK TOUCH';
  if (event.type === 'RECEIVE' && event.quality === 'PERFECT') return 'PERFECT PASS';
  if (event.type === 'SET' && event.quality === 'PERFECT') return 'CLEAN SET';
  return null;
}

export function ReworkFeedback({ event }: { event: ReworkEvent | null }) {
  const [visible, setVisible] = useState<ReworkEvent | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!event || !label(event)) return;
    setVisible(event);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setVisible(null);
      timer.current = null;
    }, event.type === 'POINT' ? 820 : 620);
  }, [event]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const text = visible ? label(visible) : null;
  return text ? <div className="rework-feedback">{text}</div> : null;
}
