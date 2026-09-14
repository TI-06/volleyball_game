import type { CpuDifficulty } from '../../game/ai/difficulty';

export interface MatchResultView {
  difficulty: CpuDifficulty;
  homeScore: number;
  awayScore: number;
  highestSpikeKmh: number;
  perfectCount: number;
  spikeKills?: number;
  blockPoints?: number;
  perfectPasses?: number;
  longestRally?: number;
}

interface ResultScreenProps {
  result: MatchResultView;
  onRematch: () => void;
  onDifficulty: () => void;
  onTitle: () => void;
}

export function ResultScreen({ result, onRematch, onDifficulty, onTitle }: ResultScreenProps) {
  const won = result.homeScore > result.awayScore;
  const spikeKills = result.spikeKills ?? 0;
  const blockPoints = result.blockPoints ?? 0;
  const perfectPasses = result.perfectPasses ?? 0;
  const longestRally = result.longestRally ?? 0;

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
        <div><span>SPIKE KILL</span><strong>{spikeKills}</strong></div>
        <div><span>BLOCK</span><strong>{blockPoints}</strong></div>
        <div><span>PERFECT PASS</span><strong>{perfectPasses}</strong></div>
        <div><span>LONGEST RALLY</span><strong>{longestRally}</strong></div>
        <div><span>BEST SPIKE</span><strong>{result.highestSpikeKmh.toFixed(1)} km/h</strong></div>
      </div>
      <div className="result-actions">
        <button type="button" className="primary-button" onClick={onRematch}>REMATCH</button>
        <button type="button" className="secondary-button" onClick={onDifficulty}>難易度変更</button>
        <button type="button" className="text-button" onClick={onTitle}>TITLE</button>
      </div>
    </main>
  );
}
