import type { CpuDifficulty } from '../../game/ai/difficulty';

export interface MatchResultView {
  difficulty: CpuDifficulty;
  homeScore: number;
  awayScore: number;
  highestSpikeKmh: number;
  perfectCount: number;
}

interface ResultScreenProps {
  result: MatchResultView;
  onRematch: () => void;
  onDifficulty: () => void;
  onTitle: () => void;
}

export function ResultScreen({ result, onRematch, onDifficulty, onTitle }: ResultScreenProps) {
  const won = result.homeScore > result.awayScore;
  return (
    <main className="result-screen">
      <span className="menu-kicker">{result.difficulty}</span>
      <h1>{won ? 'WIN' : 'LOSE'}</h1>
      <div className="result-score" aria-label="試合結果">
        <strong>{result.homeScore}</strong>
        <span>-</span>
        <strong>{result.awayScore}</strong>
      </div>
      <div className="result-stats">
        <div><span>BEST SPIKE</span><strong>{result.highestSpikeKmh.toFixed(1)} km/h</strong></div>
        <div><span>PERFECT</span><strong>{result.perfectCount}</strong></div>
      </div>
      <div className="result-actions">
        <button type="button" className="primary-button" onClick={onRematch}>REMATCH</button>
        <button type="button" className="secondary-button" onClick={onDifficulty}>難易度変更</button>
        <button type="button" className="text-button" onClick={onTitle}>TITLE</button>
      </div>
    </main>
  );
}
