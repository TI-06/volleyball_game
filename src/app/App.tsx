import { useCallback, useState } from 'react';
import type { CpuDifficulty } from '../game/ai/difficulty';
import { loadSettings, saveSettings } from '../persistence/settingsStore';
import { saveMatchResult } from '../persistence/recordStore';
import { DifficultyScreen } from './screens/DifficultyScreen';
import { MatchScreen } from './screens/MatchScreen';
import { ResultScreen, type MatchResultView } from './screens/ResultScreen';
import { TitleScreen } from './screens/TitleScreen';

export type AppScreen = 'TITLE' | 'DIFFICULTY' | 'MATCH' | 'RESULT';

export function App() {
  const [screen, setScreen] = useState<AppScreen>('TITLE');
  const [settings, setSettings] = useState(() => loadSettings());
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [result, setResult] = useState<MatchResultView | null>(null);
  const [tutorialForMatch, setTutorialForMatch] = useState(false);

  const startMatch = useCallback(
    (nextDifficulty: CpuDifficulty) => {
      setDifficulty(nextDifficulty);
      setResult(null);
      setTutorialForMatch(!settings.tutorialComplete);
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
      <MatchScreen
        difficulty={difficulty}
        switchMode={settings.switchMode}
        cameraMode={settings.cameraMode}
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
