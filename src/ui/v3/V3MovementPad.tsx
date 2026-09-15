import { useRef, useState, type PointerEvent } from 'react';
import type { V3Vec2 } from '../../game/v3/types';

interface V3MovementPadProps {
  onMove: (move: V3Vec2) => void;
}

const PAD_RADIUS_PX = 64;

function clampMove(x: number, z: number): V3Vec2 {
  const magnitude = Math.hypot(x, z);
  if (magnitude <= 1 || magnitude === 0) return { x, z };
  return { x: x / magnitude, z: z / magnitude };
}

export function V3MovementPad({ onMove }: V3MovementPadProps) {
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [move, setMove] = useState<V3Vec2>({ x: 0, z: 0 });
  const [active, setActive] = useState(false);

  const update = (clientX: number, clientY: number) => {
    const dx = (clientX - originRef.current.x) / PAD_RADIUS_PX;
    const dz = -(clientY - originRef.current.y) / PAD_RADIUS_PX;
    const next = clampMove(dx, dz);
    setMove(next);
    onMove(next);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = event.pointerId;
    originRef.current = { x: event.clientX, y: event.clientY };
    setActive(true);
    setMove({ x: 0, z: 0 });
    onMove({ x: 0, z: 0 });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    update(event.clientX, event.clientY);
  };

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    setActive(false);
    setMove({ x: 0, z: 0 });
    onMove({ x: 0, z: 0 });
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  return (
    <div
      className={`v3-movement-pad${active ? ' is-active' : ''}`}
      data-testid="v3-movement-pad"
      aria-label="2D movement pad"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <span className="v3-movement-pad__label">MOVE</span>
      <span className="v3-movement-pad__net">NET</span>
      <i
        className="v3-movement-pad__thumb"
        style={{ transform: `translate(${move.x * 34}px, ${-move.z * 34}px)` }}
      />
    </div>
  );
}
