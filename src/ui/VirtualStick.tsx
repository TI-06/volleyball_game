import { useRef, useState, type PointerEvent } from 'react';

interface VirtualStickProps {
  onMove: (vector: { x: number; z: number }) => void;
  onRelease?: () => void;
}

const MAX_RADIUS = 56;

export function VirtualStick({ onMove, onRelease }: VirtualStickProps) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const update = (event: PointerEvent<HTMLDivElement>) => {
    if (!origin.current || activePointerId.current !== event.pointerId) return;

    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    const length = Math.hypot(dx, dy);
    const scale = length > MAX_RADIUS ? MAX_RADIUS / length : 1;
    const x = dx * scale;
    const y = dy * scale;

    setThumb({ x, y });
    // The court camera sits behind the home side: screen-up is forward toward the net (+Z).
    onMove({ x: x / MAX_RADIUS, z: -y / MAX_RADIUS });
  };

  const release = (pointerId?: number) => {
    if (pointerId !== undefined && activePointerId.current !== pointerId) return;
    origin.current = null;
    activePointerId.current = null;
    setActive(false);
    setThumb({ x: 0, y: 0 });
    onMove({ x: 0, z: 0 });
    onRelease?.();
  };

  return (
    <div
      className={`virtual-stick-zone${active ? ' is-active' : ''}`}
      aria-label="移動"
      onPointerDown={(event) => {
        if (activePointerId.current !== null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        activePointerId.current = event.pointerId;
        origin.current = { x: event.clientX, y: event.clientY };
        setActive(true);
        setThumb({ x: 0, y: 0 });
      }}
      onPointerMove={(event) => {
        if (active) update(event);
      }}
      onPointerUp={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
    >
      {active ? (
        <div className="virtual-stick-base">
          <div
            className="virtual-stick-thumb"
            style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
          />
        </div>
      ) : null}
    </div>
  );
}
