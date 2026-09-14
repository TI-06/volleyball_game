import { useCallback, useEffect, useRef, useState } from 'react';
import type { CpuDifficulty } from '../../game/ai/difficulty';
import type { CameraSetting } from '../../game/camera/cameraDirector';
import { PLAYER_TEAM, type CharacterId } from '../../game/characters/roster';
import { FIXED_STEP_SECONDS } from '../../game/core/constants';
import { getSwitchCandidate } from '../../game/input/characterSwitch';
import { interpretActionGesture } from '../../game/input/gesture';
import type { ActionKind, SwipeInput, SwitchMode } from '../../game/input/inputTypes';
import { constrainServeReadyMove } from '../../game/input/serveReadyMovement';
import { GameScene } from '../../game/render/GameScene';
import {
  createMatchRuntime,
  getCurrentAction,
  requestRuntimeSwitch,
  stepMatchRuntime,
  type MatchRuntimeState,
  type RuntimeEvent,
  type RuntimeInput,
} from '../../game/runtime/gameRuntime';
import { MatchHud } from '../../ui/MatchHud';
import { shouldPauseMatchForViewport } from '../matchViewport';
import { TutorialScreen } from './TutorialScreen';
import type { MatchResultView } from './ResultScreen';

const MATCH_FINISH_DELAY_MS = 900;

interface MatchScreenProps {
  seed: number;
  difficulty: CpuDifficulty;
  switchMode: SwitchMode;
  cameraMode: CameraSetting;
  tutorial: boolean;
  onTutorialComplete: () => void;
  onFinished: (result: MatchResultView) => void;
}

interface HudState {
  homeScore: number;
  awayScore: number;
  action: ActionKind | null;
  activeCharacterId: CharacterId;
  suggestedCharacterId: CharacterId | null;
  event: RuntimeEvent | null;
}

function runtimeCharacterId(runtime: MatchRuntimeState, playerId: string): CharacterId {
  const characterId = runtime.match.players.find((player) => player.id === playerId)?.characterId;
  return (characterId ?? 'kai') as CharacterId;
}

function createInput(): RuntimeInput {
  return {
    move: { x: 0, z: 0 },
    aim: { x: 0, z: 6.2 },
    swipe: null,
    actionPressed: false,
    actionReleased: false,
    requestedPlayerId: null,
    selectedAttack: 'POWER',
    selectedSetTempo: 'NORMAL',
  };
}

export function MatchScreen({
  seed,
  difficulty,
  switchMode,
  cameraMode,
  tutorial,
  onTutorialComplete,
  onFinished,
}: MatchScreenProps) {
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<MatchRuntimeState>(createMatchRuntime(seed, difficulty, switchMode));
  const inputRef = useRef<RuntimeInput>(createInput());
  const finishSentRef = useRef(false);
  const statsRef = useRef({ highestSpikeKmh: 0, perfectCount: 0 });
  const initialTutorialRef = useRef(tutorial);
  const [tutorialActive, setTutorialActive] = useState(tutorial);
  const [hud, setHud] = useState<HudState>(() => ({
    homeScore: 0,
    awayScore: 0,
    action: getCurrentAction(runtimeRef.current),
    activeCharacterId: 'kai',
    suggestedCharacterId: null,
    event: null,
  }));

  const updateHud = useCallback((runtime: MatchRuntimeState, event: RuntimeEvent | null) => {
    const switchDecision = getSwitchCandidate(runtime.match, {
      mode: runtime.switchMode,
      currentPlayerId: runtime.controlledPlayerId,
    });
    setHud({
      homeScore: runtime.match.score.home,
      awayScore: runtime.match.score.away,
      action: getCurrentAction(runtime),
      activeCharacterId: runtimeCharacterId(runtime, runtime.controlledPlayerId),
      suggestedCharacterId: switchDecision.playerId
        ? runtimeCharacterId(runtime, switchDecision.playerId)
        : null,
      event,
    });
  }, []);

  useEffect(() => {
    let runtime = createMatchRuntime(seed, difficulty, switchMode);
    if (initialTutorialRef.current) {
      runtime = {
        ...runtime,
        controlledPlayerId: 'home-2',
        match: {
          ...runtime.match,
          rally: {
            ...runtime.match.rally,
            servingSide: 'away',
            serverIndex: { home: 0, away: 0 },
          },
        },
      };
    }
    runtimeRef.current = runtime;
    inputRef.current = createInput();
    finishSentRef.current = false;
    statsRef.current = { highestSpikeKmh: 0, perfectCount: 0 };
    updateHud(runtime, null);

    const host = sceneHostRef.current;
    if (!host || typeof WebGLRenderingContext === 'undefined') return undefined;

    const scene = new GameScene(host, runtime.match);
    let animationFrame = 0;
    let finishTimer: number | null = null;
    let lastTime = performance.now();
    let accumulator = 0;
    let hudAccumulator = 0;

    const frame = (now: number) => {
      if (shouldPauseMatchForViewport(window.innerWidth, window.innerHeight)) {
        lastTime = now;
        accumulator = 0;
        inputRef.current.move = { x: 0, z: 0 };
        inputRef.current.actionPressed = false;
        inputRef.current.actionReleased = false;
        animationFrame = window.requestAnimationFrame(frame);
        return;
      }

      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      accumulator += delta;
      hudAccumulator += delta;
      let latestEvent: RuntimeEvent | null = null;

      while (accumulator >= FIXED_STEP_SECONDS) {
        inputRef.current.move = constrainServeReadyMove(
          runtime.match.rally.phase,
          inputRef.current.move,
        );
        runtime = stepMatchRuntime(runtime, inputRef.current, FIXED_STEP_SECONDS);
        const event = runtime.lastEvent;
        if (event) {
          scene.playEvent(event);
          const isPlayerEvent = event.actorId?.startsWith('home-') ?? false;
          if (isPlayerEvent && event.quality === 'PERFECT') {
            statsRef.current.perfectCount += 1;
          }
          if (isPlayerEvent && event.type === 'SPIKE' && event.value) {
            statsRef.current.highestSpikeKmh = Math.max(
              statsRef.current.highestSpikeKmh,
              event.value,
            );
          }
          if (isPlayerEvent || latestEvent === null) {
            latestEvent = event;
          }
        }

        inputRef.current.actionPressed = false;
        inputRef.current.actionReleased = false;
        accumulator -= FIXED_STEP_SECONDS;
      }

      runtimeRef.current = runtime;
      scene.update(runtime.match, delta, {
        controlledPlayerId: runtime.controlledPlayerId,
        cameraSetting: cameraMode,
      });

      if (latestEvent || hudAccumulator >= 0.1) {
        updateHud(runtime, latestEvent);
        hudAccumulator = 0;
      }

      if (runtime.match.winner && !finishSentRef.current) {
        finishSentRef.current = true;
        updateHud(runtime, latestEvent);
        finishTimer = window.setTimeout(() => {
          onFinished({
            difficulty,
            homeScore: runtime.match.score.home,
            awayScore: runtime.match.score.away,
            highestSpikeKmh: statsRef.current.highestSpikeKmh,
            perfectCount: statsRef.current.perfectCount,
          });
        }, MATCH_FINISH_DELAY_MS);
        return;
      }

      animationFrame = window.requestAnimationFrame(frame);
    };

    animationFrame = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (finishTimer !== null) {
        window.clearTimeout(finishTimer);
      }
      scene.dispose();
    };
  }, [cameraMode, difficulty, onFinished, seed, switchMode, updateHud]);

  const completeTutorial = useCallback(() => {
    setTutorialActive(false);
    onTutorialComplete();
  }, [onTutorialComplete]);

  const commitGesture = useCallback((action: ActionKind, swipe: SwipeInput) => {
    const intent = interpretActionGesture(action, swipe);
    inputRef.current.swipe = swipe;
    inputRef.current.aim = { x: intent.aimX, z: intent.aimZ };
    if (intent.attackIntent) inputRef.current.selectedAttack = intent.attackIntent;
    if (intent.setTempo) inputRef.current.selectedSetTempo = intent.setTempo;
    inputRef.current.actionPressed = true;
  }, []);

  return (
    <main className="match-screen" data-testid="match-screen">
      <div ref={sceneHostRef} className="match-scene" />
      <div className="controlled-player-label">{hud.activeCharacterId.toUpperCase()}</div>
      <MatchHud
        homeScore={hud.homeScore}
        awayScore={hud.awayScore}
        action={hud.action}
        event={hud.event}
        characterIds={PLAYER_TEAM}
        activeCharacterId={hud.activeCharacterId}
        suggestedCharacterId={hud.suggestedCharacterId}
        onMove={(move) => {
          inputRef.current.move = constrainServeReadyMove(
            runtimeRef.current.match.rally.phase,
            move,
          );
        }}
        onActionPress={() => {
          inputRef.current.actionPressed = true;
        }}
        onActionRelease={() => {
          inputRef.current.actionReleased = true;
        }}
        onActionGesture={commitGesture}
        onCharacterSelect={(characterId) => {
          const player = runtimeRef.current.match.players.find(
            (candidate) => candidate.side === 'home' && candidate.characterId === characterId,
          );
          if (!player) return;
          runtimeRef.current = requestRuntimeSwitch(runtimeRef.current, player.id);
          updateHud(runtimeRef.current, null);
        }}
      />
      {tutorialActive ? (
        <TutorialScreen
          event={hud.event}
          onComplete={completeTutorial}
          onSkip={completeTutorial}
        />
      ) : null}
    </main>
  );
}
