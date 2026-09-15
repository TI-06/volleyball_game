import { useCallback, useEffect, useRef, useState } from 'react';
import type { CpuDifficulty } from '../../game/ai/difficulty';
import { FIXED_STEP_SECONDS } from '../../game/core/constants';
import { playReworkHaptic } from '../../game/rework/haptics';
import {
  createReworkMatchStats,
  recordReworkEvent,
} from '../../game/rework/matchStats';
import {
  createReworkRuntime,
  stepReworkRuntime,
} from '../../game/rework/playableRuntime';
import { ReworkScene } from '../../game/rework/render/ReworkScene';
import { prepareReworkTutorial } from '../../game/rework/tutorialStart';
import type {
  ReworkActionLabel,
  ReworkEvent,
  ReworkInput,
  ReworkRuntimeState,
  ReworkSwipe,
} from '../../game/rework/types';
import { ReworkHud } from '../../ui/rework/ReworkHud';
import { getMatchFinishFramePlan } from '../matchFinishPresentation';
import { shouldPauseMatchForViewport } from '../matchViewport';
import type { MatchResultView } from './ResultScreen';
import { ReworkTutorialScreen } from './ReworkTutorialScreen';

const MATCH_FINISH_DELAY_MS = 900;

interface ReworkMatchScreenProps {
  seed: number;
  difficulty: CpuDifficulty;
  tutorial: boolean;
  onTutorialComplete: () => void;
  onFinished: (result: MatchResultView) => void;
}

interface HudState {
  homeScore: number;
  awayScore: number;
  playLabel: ReworkActionLabel;
  powerLabel: ReworkActionLabel;
  event: ReworkEvent | null;
  cpuReturnSeen: boolean;
}

interface MatchE2eBridgeWindow extends Window {
  __VOLLEYBALL_MATCH_E2E__?: {
    stageSetTransition: () => void;
    getTransitionAuditState: () => {
      lastContact: string | null;
      lastTouchedBy: string | null;
    };
  };
}

function localMatchE2eEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const isLocalhost =
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'localhost';
  return isLocalhost && new URLSearchParams(window.location.search).get('e2e') === '1';
}

function createInput(): ReworkInput {
  return {
    moveAxis: 0,
    playPressed: false,
    powerPressed: false,
    powerReleased: false,
    powerSwipe: null,
    powerCancelled: false,
  };
}

export function ReworkMatchScreen({
  seed,
  difficulty,
  tutorial,
  onTutorialComplete,
  onFinished,
}: ReworkMatchScreenProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const initialTutorialRef = useRef(tutorial);
  const runtimeRef = useRef<ReworkRuntimeState>(createReworkRuntime(seed, difficulty));
  const inputRef = useRef<ReworkInput>(createInput());
  const serveAimRef = useRef<ReworkSwipe | null>(null);
  const finishSentRef = useRef(false);
  const cpuReturnSeenRef = useRef(false);
  const statsRef = useRef(createReworkMatchStats());
  const [tutorialActive, setTutorialActive] = useState(tutorial);
  const [hud, setHud] = useState<HudState>(() => ({
    homeScore: 0,
    awayScore: 0,
    playLabel: runtimeRef.current.playLabel,
    powerLabel: runtimeRef.current.powerLabel,
    event: null,
    cpuReturnSeen: false,
  }));

  const updateHud = useCallback((runtime: ReworkRuntimeState, event: ReworkEvent | null) => {
    setHud({
      homeScore: runtime.match.score.home,
      awayScore: runtime.match.score.away,
      playLabel: runtime.playLabel,
      powerLabel: runtime.powerLabel,
      event,
      cpuReturnSeen: cpuReturnSeenRef.current,
    });
  }, []);

  useEffect(() => {
    let runtime = createReworkRuntime(seed, difficulty);
    if (initialTutorialRef.current) runtime = prepareReworkTutorial(runtime);
    runtimeRef.current = runtime;
    inputRef.current = createInput();
    serveAimRef.current = null;
    finishSentRef.current = false;
    cpuReturnSeenRef.current = false;
    statsRef.current = createReworkMatchStats();
    updateHud(runtime, null);

    const host = sceneHostRef.current;
    if (!host || typeof WebGLRenderingContext === 'undefined') return undefined;

    const scene = new ReworkScene(host, runtime.match, runtime.focusPlayerId);
    const e2eWindow = window as MatchE2eBridgeWindow;
    let transitionAuditHold = false;
    if (localMatchE2eEnabled()) {
      e2eWindow.__VOLLEYBALL_MATCH_E2E__ = {
        stageSetTransition: () => {
          const receiveEvent: ReworkEvent = { type: 'RECEIVE', actorId: runtime.focusPlayerId };
          transitionAuditHold = true;
          runtime = {
            ...runtime,
            match: {
              ...runtime.match,
              rally: {
                ...runtime.match.rally,
                phase: 'RALLY',
              },
              ball: {
                ...runtime.match.ball,
                inPlay: true,
                lastTouchedBy: runtime.focusPlayerId,
                lastContact: 'RECEIVE',
                position: { x: 0.9, y: 2.4, z: -2.55 },
                velocity: { x: 0.1, y: 1.5, z: 0.2 },
              },
            },
            playLabel: 'NONE',
            powerLabel: 'NONE',
            lastEvent: receiveEvent,
          };
          runtimeRef.current = runtime;
          inputRef.current = createInput();
          serveAimRef.current = null;
          scene.playEvent(receiveEvent);
          scene.update(runtime.match, 0, null);
          updateHud(runtime, receiveEvent);
        },
        getTransitionAuditState: () => ({
          lastContact: runtime.match.ball.lastContact ?? null,
          lastTouchedBy: runtime.match.ball.lastTouchedBy ?? null,
        }),
      };
    }

    let animationFrame = 0;
    let finishTimer: number | null = null;
    let lastTime = performance.now();
    let accumulator = 0;
    let hudAccumulator = 0;

    const frame = (now: number) => {
      if (shouldPauseMatchForViewport(window.innerWidth, window.innerHeight)) {
        lastTime = now;
        accumulator = 0;
        serveAimRef.current = null;
        inputRef.current.moveAxis = 0;
        inputRef.current.playPressed = false;
        inputRef.current.powerPressed = false;
        inputRef.current.powerReleased = false;
        inputRef.current.powerSwipe = null;
        inputRef.current.powerCancelled = true;
        animationFrame = window.requestAnimationFrame(frame);
        return;
      }

      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      accumulator += delta;
      hudAccumulator += delta;
      let latestEvent: ReworkEvent | null = null;

      while (!transitionAuditHold && accumulator >= FIXED_STEP_SECONDS) {
        runtime = stepReworkRuntime(runtime, inputRef.current, FIXED_STEP_SECONDS);
        if (
          runtime.match.ball.inPlay &&
          runtime.match.ball.lastTouchedBy?.startsWith('away-') &&
          runtime.match.ball.position.z < -0.05 &&
          runtime.match.ball.velocity.z < 0
        ) {
          cpuReturnSeenRef.current = true;
        }

        const event = runtime.lastEvent;
        if (event) {
          statsRef.current = recordReworkEvent(statsRef.current, event);
          scene.playEvent(event);
          playReworkHaptic(event);
          const userEvent = event.actorId === runtime.focusPlayerId;
          if (userEvent || latestEvent === null) latestEvent = event;
        }

        inputRef.current.playPressed = false;
        inputRef.current.powerPressed = false;
        inputRef.current.powerReleased = false;
        inputRef.current.powerSwipe = null;
        inputRef.current.powerCancelled = false;
        accumulator -= FIXED_STEP_SECONDS;
      }
      if (transitionAuditHold) accumulator = 0;

      runtimeRef.current = runtime;
      scene.update(
        runtime.match,
        delta,
        runtime.powerLabel === 'SERVE' ? serveAimRef.current : null,
      );

      if (runtime.powerLabel !== 'SERVE') serveAimRef.current = null;

      if (latestEvent || hudAccumulator >= 0.1) {
        updateHud(runtime, latestEvent);
        hudAccumulator = 0;
      }

      const finishPlan = getMatchFinishFramePlan(Boolean(runtime.match.winner), finishSentRef.current);
      if (finishPlan.startResultTimer) {
        finishSentRef.current = true;
        updateHud(runtime, latestEvent);
        finishTimer = window.setTimeout(() => {
          const stats = statsRef.current;
          onFinished({
            difficulty,
            homeScore: runtime.match.score.home,
            awayScore: runtime.match.score.away,
            highestSpikeKmh: stats.highestSpikeKmh,
            perfectCount: stats.perfectCount,
            spikeKills: stats.spikeKills,
            blockPoints: stats.blockPoints,
            perfectPasses: stats.perfectPasses,
            longestRally: stats.longestRally,
          });
        }, MATCH_FINISH_DELAY_MS);
      }

      if (finishPlan.keepRendering) {
        animationFrame = window.requestAnimationFrame(frame);
      }
    };

    animationFrame = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      if (e2eWindow.__VOLLEYBALL_MATCH_E2E__) {
        delete e2eWindow.__VOLLEYBALL_MATCH_E2E__;
      }
      scene.dispose();
    };
  }, [difficulty, onFinished, seed, updateHud]);

  const finishTutorial = useCallback(() => {
    setTutorialActive(false);
    onTutorialComplete();
  }, [onTutorialComplete]);

  const releasePower = useCallback((swipe: ReworkSwipe | null) => {
    serveAimRef.current = swipe;
    inputRef.current.powerReleased = true;
    inputRef.current.powerSwipe = swipe;
  }, []);

  return (
    <main
      className="rework-match-screen"
      data-testid="rework-match-screen"
      data-cpu-return-seen={hud.cpuReturnSeen ? 'true' : 'false'}
    >
      <div ref={sceneHostRef} className="rework-match-scene" />
      <ReworkHud
        homeScore={hud.homeScore}
        awayScore={hud.awayScore}
        playLabel={hud.playLabel}
        powerLabel={hud.powerLabel}
        event={hud.event}
        onMove={(axis) => {
          inputRef.current.moveAxis = axis;
        }}
        onPlayPress={() => {
          inputRef.current.playPressed = true;
        }}
        onPowerPress={() => {
          serveAimRef.current = null;
          inputRef.current.powerPressed = true;
        }}
        onPowerAim={(swipe) => {
          serveAimRef.current = swipe;
        }}
        onPowerRelease={releasePower}
        onPowerCancel={() => {
          serveAimRef.current = null;
          inputRef.current.powerCancelled = true;
          inputRef.current.powerReleased = false;
          inputRef.current.powerSwipe = null;
        }}
      />
      {tutorialActive ? (
        <ReworkTutorialScreen
          event={hud.event}
          onComplete={finishTutorial}
          onSkip={finishTutorial}
        />
      ) : null}
    </main>
  );
}
