import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { V3_FIXED_STEP_SECONDS } from '../../game/v3/core/constants';
import {
  createV3Runtime,
  emptyV3RuntimeInput,
  stepV3Runtime,
  type V3RuntimeEvent,
  type V3RuntimeInput,
  type V3RuntimeState,
} from '../../game/v3/core/runtime';
import {
  createV3VisualAuditState,
  isV3ManualE2EMode,
  parseV3VisualAuditScenario,
  type V3VisualAuditScenario,
} from '../../game/v3/presentation/visualAuditScenario';
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
  time: number;
  controlledX: number;
  controlledZ: number;
  landingX: number;
  landingZ: number;
  bufferedAction: string | null;
}

export interface V3PointFeedback {
  title: 'POINT!' | 'CPU POINT';
  detail: string | null;
  side: 'home' | 'away';
}

const V3_STARTUP_HOLD_SECONDS = 1.25;
const V3_MANUAL_ADVANCE_EVENT = 'v3:e2e-advance';
const V3_MAX_MANUAL_ADVANCE_SECONDS = 5;
const V3_POINT_FEEDBACK_SECONDS = 0.75;

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

function currentVisualAuditScenario(): V3VisualAuditScenario | null {
  if (typeof window === 'undefined') return null;
  return parseV3VisualAuditScenario(window.location.hostname, window.location.search);
}

function currentManualE2EMode(): boolean {
  if (typeof window === 'undefined') return false;
  return isV3ManualE2EMode(window.location.hostname, window.location.search);
}

function createInitialRuntime(seed: number): V3RuntimeState {
  const scenario = currentVisualAuditScenario();
  return scenario ? createV3VisualAuditState(scenario, seed) : createV3Runtime(seed);
}

function toHud(runtime: V3RuntimeState): V3HudState {
  const controlled = runtime.players.find((player) => player.id === runtime.controlledPlayerId);
  return {
    home: runtime.score.home,
    away: runtime.score.away,
    phase: runtime.phase,
    controlledPlayerId: runtime.controlledPlayerId,
    forecastStage: runtime.forecast?.stage ?? null,
    lastEvent: runtime.lastEvent,
    time: runtime.time,
    controlledX: controlled?.position.x ?? Number.NaN,
    controlledZ: controlled?.position.z ?? Number.NaN,
    landingX: runtime.rally.landingTarget.x,
    landingZ: runtime.rally.landingTarget.z,
    bufferedAction: runtime.bufferedAction?.kind ?? null,
  };
}

function clearOneShotInput(input: V3RuntimeInput): void {
  input.actionPressed = false;
  input.divePressed = false;
  input.jumpPressed = false;
  input.attackGesture = null;
}

export function isV3JumpControlEnabled(
  phase: V3RallyPhase,
  controlledPlayerId: string,
): boolean {
  return (
    phase === 'ATTACK_APPROACH' ||
    (phase === 'SET_BUILDUP' && controlledPlayerId === 'home-0')
  );
}

export function getV3PointFeedback(
  lastEvent: V3RuntimeEvent | null,
  rallyTime: number,
): V3PointFeedback | null {
  if (!lastEvent || !Number.isFinite(rallyTime) || rallyTime < 0 || rallyTime > V3_POINT_FEEDBACK_SECONDS) {
    return null;
  }

  if (lastEvent.type === 'ATTACK') {
    return {
      title: lastEvent.point === 'home' ? 'POINT!' : 'CPU POINT',
      detail: lastEvent.point === 'home' ? lastEvent.intent : null,
      side: lastEvent.point,
    };
  }

  if (lastEvent.type === 'POINT') {
    return {
      title: lastEvent.point === 'home' ? 'POINT!' : 'CPU POINT',
      detail: null,
      side: lastEvent.point,
    };
  }

  return null;
}

export function V3MatchScreen({ seed }: V3MatchScreenProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<V3RuntimeState>(createInitialRuntime(seed));
  const inputRef = useRef<V3RuntimeInput>(createInput());
  const attackPointerRef = useRef<number | null>(null);
  const attackOriginRef = useRef({ x: 0, y: 0 });
  const [attackActive, setAttackActive] = useState(false);
  const [hud, setHud] = useState<V3HudState>(() => toHud(runtimeRef.current));

  const syncHud = useCallback((runtime: V3RuntimeState) => {
    setHud(toHud(runtime));
  }, []);

  useEffect(() => {
    const auditScenario = currentVisualAuditScenario();
    const visualAudit = auditScenario !== null;
    const manualE2E = currentManualE2EMode();
    let runtime = auditScenario ? createV3VisualAuditState(auditScenario, seed) : createV3Runtime(seed);
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
    let startupHoldRemaining = V3_STARTUP_HOLD_SECONDS;

    const advanceRuntime = (seconds: number) => {
      let remaining = Math.min(
        V3_MAX_MANUAL_ADVANCE_SECONDS,
        Math.max(0, Number.isFinite(seconds) ? seconds : 0),
      );
      while (remaining > 0.000001) {
        const dt = Math.min(V3_FIXED_STEP_SECONDS, remaining);
        runtime = stepV3Runtime(runtime, inputRef.current, dt);
        clearOneShotInput(inputRef.current);
        remaining -= dt;
      }
      runtimeRef.current = runtime;
      syncHud(runtime);
      scene.update(runtime, 0);
    };

    const handleManualAdvance = (event: Event) => {
      const seconds = Number((event as CustomEvent<number>).detail);
      advanceRuntime(seconds);
    };

    if (manualE2E) {
      window.addEventListener(V3_MANUAL_ADVANCE_EVENT, handleManualAdvance);
    }

    const frame = (now: number) => {
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (!visualAudit && !manualE2E) {
        if (startupHoldRemaining > 0) {
          startupHoldRemaining = Math.max(0, startupHoldRemaining - delta);
        } else {
          accumulator += delta;
          hudAccumulator += delta;

          while (accumulator >= V3_FIXED_STEP_SECONDS) {
            runtime = stepV3Runtime(runtime, inputRef.current, V3_FIXED_STEP_SECONDS);
            clearOneShotInput(inputRef.current);
            accumulator -= V3_FIXED_STEP_SECONDS;
          }
        }
      }

      runtimeRef.current = runtime;
      // Audit/manual scenarios can freeze simulation state while presentation
      // time keeps moving so articulated poses remain visible and testable.
      scene.update(runtime, delta);
      if (!visualAudit && !manualE2E && startupHoldRemaining <= 0 && hudAccumulator >= 0.08) {
        syncHud(runtime);
        hudAccumulator = 0;
      }
      animationFrame = window.requestAnimationFrame(frame);
    };

    animationFrame = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (manualE2E) {
        window.removeEventListener(V3_MANUAL_ADVANCE_EVENT, handleManualAdvance);
      }
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
  const canJump = isV3JumpControlEnabled(hud.phase, hud.controlledPlayerId);
  const canAttack = hud.phase === 'ATTACK_AIRBORNE';
  const pointFeedback = getV3PointFeedback(hud.lastEvent, hud.time);

  return (
    <main
      className="v3-match"
      data-testid="v3-match-screen"
      data-v3-time={hud.time.toFixed(3)}
      data-v3-controlled-x={hud.controlledX.toFixed(3)}
      data-v3-controlled-z={hud.controlledZ.toFixed(3)}
      data-v3-landing-x={hud.landingX.toFixed(3)}
      data-v3-landing-z={hud.landingZ.toFixed(3)}
      data-v3-buffered-action={hud.bufferedAction ?? ''}
      data-v3-last-event={hud.lastEvent?.type ?? ''}
      data-v3-rally-phase={hud.phase}
    >
      <div className="v3-scene-host" ref={sceneHostRef} aria-label="Volleyball court" />

      <header className="v3-topbar">
        <div className="v3-prototype-badge">VOLLEYBALL</div>
        <strong className="v3-score" aria-label={`PLAYER ${hud.home} CPU ${hud.away}`}>
          {hud.home} - {hud.away}
        </strong>
        <div className="v3-phase">
          <strong>{PHASE_LABEL[hud.phase]}</strong>
          <small>{hud.forecastStage ?? hud.lastEvent?.type ?? hud.controlledPlayerId}</small>
        </div>
      </header>

      {pointFeedback ? (
        <div
          className={`v3-point-feedback v3-point-feedback--${pointFeedback.side}`}
          data-testid="v3-point-feedback"
          aria-live="polite"
        >
          <strong>{pointFeedback.title}</strong>
          {pointFeedback.detail ? <span>{pointFeedback.detail}</span> : null}
        </div>
      ) : null}

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
