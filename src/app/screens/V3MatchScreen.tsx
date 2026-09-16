import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { FIXED_STEP_SECONDS } from '../../game/core/constants';
import {
  createV3Runtime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeEvent,
  type V3RuntimeInput,
  type V3RuntimeState,
} from '../../game/v3/core/runtime';
import { V3Scene } from '../../game/v3/render/V3Scene';
import type { V3RallyPhase, V3Vec2 } from '../../game/v3/types';
import { V3MovementPad } from '../../ui/v3/V3MovementPad';

interface V3MatchScreenProps {
  seed: number;
}

interface V3HudState {
  home: number;
  away: number;
  phase: V3RallyPhase;
  controlledPlayerId: string;
  forecastStage: string | null;
  lastEvent: V3RuntimeEvent | null;
}

const PHASE_LABEL: Record<V3RallyPhase, string> = {
  DEFENSE_READ: 'DEFENSE READ',
  RECEIVE_PREP: 'RECEIVE PREP',
  SET_BUILDUP: 'SET BUILDUP',
  ATTACK_APPROACH: 'ATTACK APPROACH',
  ATTACK_AIRBORNE: 'ATTACK AIRBORNE',
  OPPONENT_DEFENSE: 'OPPONENT DEFENSE',
};

function createInput(): V3RuntimeInput {
  return emptyV3RuntimeInput();
}

function isLocalVisualAudit(): boolean {
  if (typeof window === 'undefined') return false;
  const localHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  if (!localHost) return false;
  return new URLSearchParams(window.location.search).get('v3audit') === '1';
}

export function V3MatchScreen({ seed }: V3MatchScreenProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<V3RuntimeState>(createV3Runtime(seed));
  const inputRef = useRef<V3RuntimeInput>(createInput());
  const attackPointerRef = useRef<number | null>(null);
  const attackOriginRef = useRef({ x: 0, y: 0 });
  const [attackActive, setAttackActive] = useState(false);
  const [hud, setHud] = useState<V3HudState>(() => ({
    home: runtimeRef.current.score.home,
    away: runtimeRef.current.score.away,
    phase: runtimeRef.current.phase,
    controlledPlayerId: runtimeRef.current.controlledPlayerId,
    forecastStage: runtimeRef.current.forecast?.stage ?? null,
    lastEvent: runtimeRef.current.lastEvent,
  }));

  const syncHud = useCallback((runtime: V3RuntimeState) => {
    setHud({
      home: runtime.score.home,
      away: runtime.score.away,
      phase: runtime.phase,
      controlledPlayerId: runtime.controlledPlayerId,
      forecastStage: runtime.forecast?.stage ?? null,
      lastEvent: runtime.lastEvent,
    });
  }, []);

  useEffect(() => {
    let runtime = createV3Runtime(seed);
    const visualAudit = isLocalVisualAudit();
    runtimeRef.current = runtime;
    inputRef.current = createInput();
    syncHud(runtime);

    const host = sceneHostRef.current;
    if (!host || typeof WebGLRenderingContext === 'undefined') return undefined;

    const scene = new V3Scene(host, runtime);
    let animationFrame = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let hudAccumulator = 0;

    const frame = (now: number) => {
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (!visualAudit) {
        accumulator += delta;
        hudAccumulator += delta;

        while (accumulator >= FIXED_STEP_SECONDS) {
          runtime = stepV3Runtime(runtime, inputRef.current, FIXED_STEP_SECONDS);
          inputRef.current.actionPressed = false;
          inputRef.current.divePressed = false;
          inputRef.current.jumpPressed = false;
          inputRef.current.attackGesture = null;
          accumulator -= FIXED_STEP_SECONDS;
        }
      }

      runtimeRef.current = runtime;
      scene.update(runtime, visualAudit ? 0 : delta);
      if (!visualAudit && hudAccumulator >= 0.08) {
        syncHud(runtime);
        hudAccumulator = 0;
      }
      animationFrame = window.requestAnimationFrame(frame);
    };

    animationFrame = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      scene.dispose();
    };
  }, [seed, syncHud]);

  const handleMove = useCallback((move: V3Vec2) => {
    inputRef.current.move = move;
  }, []);

  const press = useCallback((kind: 'ACTION' | 'DIVE' | 'JUMP') => {
    if (kind === 'ACTION') inputRef.current.actionPressed = true;
    if (kind === 'DIVE') inputRef.current.divePressed = true;
    if (kind === 'JUMP') inputRef.current.jumpPressed = true;
  }, []);

  const onAttackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (attackPointerRef.current !== null) return;
    attackPointerRef.current = event.pointerId;
    attackOriginRef.current = { x: event.clientX, y: event.clientY };
    setAttackActive(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const finishAttack = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    if (attackPointerRef.current !== event.pointerId) return;
    const dx = event.clientX - attackOriginRef.current.x;
    const dy = event.clientY - attackOriginRef.current.y;
    attackPointerRef.current = null;
    setAttackActive(false);
    if (!cancelled) inputRef.current.attackGesture = { x: dx, y: dy };
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const defensive = hud.phase === 'DEFENSE_READ' || hud.phase === 'RECEIVE_PREP';
  const canJump = hud.phase === 'ATTACK_APPROACH';
  const canAttack = hud.phase === 'ATTACK_AIRBORNE';

  return (
    <main className="v3-match" data-testid="v3-match-screen">
      <div className="v3-scene-host" ref={sceneHostRef} aria-label="Gameplay V3 court" />

      <header className="v3-topbar">
        <div className="v3-prototype-badge">GAMEPLAY V3</div>
        <strong className="v3-score" aria-label={`PLAYER ${hud.home} CPU ${hud.away}`}>
          {hud.home} - {hud.away}
        </strong>
        <div className="v3-phase">
          <strong>{PHASE_LABEL[hud.phase]}</strong>
          <small>{hud.forecastStage ?? hud.lastEvent?.type ?? hud.controlledPlayerId}</small>
        </div>
      </header>

      <div className="v3-control-layer">
        <V3MovementPad onMove={handleMove} />

        <div className="v3-actions">
          <button
            type="button"
            className="v3-action-button v3-action-button--action"
            disabled={!defensive}
            onPointerDown={() => press('ACTION')}
          >
            ACTION
          </button>
          <button
            type="button"
            className="v3-action-button v3-action-button--dive"
            disabled={!defensive}
            onPointerDown={() => press('DIVE')}
          >
            DIVE
          </button>
          <button
            type="button"
            className="v3-action-button v3-action-button--jump"
            disabled={!canJump}
            onPointerDown={() => press('JUMP')}
          >
            JUMP
          </button>
          <div
            className={`v3-attack-pad${attackActive ? ' is-active' : ''}${canAttack ? ' is-ready' : ''}`}
            data-testid="v3-attack-pad"
            aria-label="ATTACK swipe pad"
            onPointerDown={onAttackPointerDown}
            onPointerUp={(event) => finishAttack(event)}
            onPointerCancel={(event) => finishAttack(event, true)}
          >
            <strong>ATTACK</strong>
            <span>↙ CROSS · ↑ POWER · ↗ LINE</span>
          </div>
        </div>
      </div>
    </main>
  );
}
