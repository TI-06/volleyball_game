import { useCallback, useRef, useState } from 'react';
import type { CpuDifficulty } from '../game/ai/difficulty';
import { saveMatchResult } from '../persistence/recordStore';
import { loadSettings, saveSettings } from '../persistence/settingsStore';
import {
  TUTORIAL_MATCH_SEED,
  createSessionSeed,
  nextMatchSeed,
} from './matchSeed';
import { DifficultyScreen } from './screens/DifficultyScreen';
import { ReworkMatchScreen } from './screens/ReworkMatchScreen';
import { ResultScreen, type MatchResultView } from './screens/ResultScreen';
import { TitleScreen } from './screens/TitleScreen';

export type AppScreen = 'TITLE' | 'DIFFICULTY' | 'MATCH' | 'RESULT';

export function App() {
  const [screen, setScreen] = useState<AppScreen>('TITLE');
  const [settings, setSettings] = useState(() => loadSettings());
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [result, setResult] = useState<MatchResultView | null>(null);
  const [tutorialForMatch, setTutorialForMatch] = useState(false);
  const [matchSeed, setMatchSeed] = useState(TUTORIAL_MATCH_SEED);
  const normalSeedRef = useRef(createSessionSeed());

  const startMatch = useCallback(
    (nextDifficulty: CpuDifficulty) => {
      const tutorial = !settings.tutorialComplete;
      setDifficulty(nextDifficulty);
      setResult(null);
      setTutorialForMatch(tutorial);
      if (tutorial) {
        setMatchSeed(TUTORIAL_MATCH_SEED);
      } else {
        normalSeedRef.current = nextMatchSeed(normalSeedRef.current);
        setMatchSeed(normalSeedRef.current);
      }
      setScreen('MATCH');
    },
    [settings.tutorialComplete],
  );

  const finishTutorial = useCallback(() => {
    setTutorialForMatch(false);
    setSettings((current) => {
      const next = { ...current, tutorialComplete: true };
      saveSettings(next);
      return next;
    });
  }, []);

  const finishMatch = useCallback((nextResult: MatchResultView) => {
    setResult(nextResult);
    const persisted = saveMatchResult({
      difficulty: nextResult.difficulty,
      homeScore: nextResult.homeScore,
      awayScore: nextResult.awayScore,
      highestSpikeKmh: nextResult.highestSpikeKmh,
      perfectCount: nextResult.perfectCount,
    });
    setSettings(persisted.settings);
    setScreen('RESULT');
  }, []);

  if (screen === 'DIFFICULTY') {
    return (
      <DifficultyScreen
        unlocked={settings.unlockedDifficulties}
        onSelect={startMatch}
        onBack={() => setScreen('TITLE')}
      />
    );
  }

  if (screen === 'MATCH') {
    return (
      <ReworkMatchScreen
        seed={matchSeed}
        difficulty={difficulty}
        tutorial={tutorialForMatch}
        onTutorialComplete={finishTutorial}
        onFinished={finishMatch}
      />
    );
  }

  if (screen === 'RESULT' && result) {
    return (
      <ResultScreen
        result={result}
        onRematch={() => startMatch(difficulty)}
        onDifficulty={() => setScreen('DIFFICULTY')}
        onTitle={() => setScreen('TITLE')}
      />
    );
  }

  return <TitleScreen onCpuMatch={() => setScreen('DIFFICULTY')} />;
}
