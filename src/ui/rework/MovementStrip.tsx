import { useRef, useState, type PointerEvent } from 'react';

interface MovementStripProps {
  onMove: (axis: number) => void;
}

function clampAxis(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function MovementStrip({ onMove }: MovementStripProps) {
  const activePointerId = useRef<number | null>(null);
  const originX = useRef(0);
  const [active, setActive] = useState(false);
  const [axis, setAxis] = useState(0);

  const update = (clientX: number) => {
    const next = clampAxis((clientX - originX.current) / 92);
    setAxis(next);
    onMove(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = event.pointerId;
    originX.current = event.clientX;
    setActive(true);
    setAxis(0);
    onMove(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    update(event.clientX);
  };

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    activePointerId.current = null;
    setActive(false);
    setAxis(0);
    onMove(0);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  return (
    <div
      className={`rework-movement-strip${active ? ' is-active' : ''}`}
      data-testid="rework-movement-strip"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div className="rework-movement-strip__guide">
        <span>BACK</span>
        <i style={{ transform: `translateX(${axis * 34}px)` }} />
        <span>NET</span>
      </div>
    </div>
  );
}
