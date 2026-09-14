import type { CpuDifficulty } from '../../game/ai/difficulty';
import { PLAYER_TEAM, STARTER_ROSTER } from '../../game/characters/roster';

const LEVELS: readonly CpuDifficulty[] = [
  'BEGINNER',
  'NORMAL',
  'HARD',
  'EXPERT',
  'MASTER',
];

const SUBTITLE: Record<CpuDifficulty, string> = {
  BEGINNER: '操作練習向け',
  NORMAL: '基本の読み合い',
  HARD: 'ブロック位置を読む',
  EXPERT: '守備の穴まで狙う',
  MASTER: '対人戦を想定した判断',
};

interface DifficultyScreenProps {
  unlocked: readonly CpuDifficulty[];
  onSelect: (difficulty: CpuDifficulty) => void;
  onBack: () => void;
}

export function DifficultyScreen({ unlocked, onSelect, onBack }: DifficultyScreenProps) {
  return (
    <main className="menu-screen">
      <header className="menu-header">
        <button type="button" className="text-button" onClick={onBack}>
          ← BACK
        </button>
        <div>
          <span className="menu-kicker">CPU MATCH</span>
          <h1>難易度を選択</h1>
        </div>
      </header>

      <section className="difficulty-grid" aria-label="CPU難易度">
        {LEVELS.map((difficulty, index) => {
          const available = unlocked.includes(difficulty);
          return (
            <button
              key={difficulty}
              type="button"
              className={`difficulty-card${available ? '' : ' is-locked'}`}
              disabled={!available}
              onClick={() => onSelect(difficulty)}
            >
              <span className="difficulty-card__level">LV {index + 1}</span>
              <strong>{difficulty}</strong>
              <small>{available ? SUBTITLE[difficulty] : 'LOCKED'}</small>
            </button>
          );
        })}
      </section>

      <section className="team-preview">
        <div>
          <span className="menu-kicker">FOCUS PLAYER</span>
          <h2>KAI + SUPPORT</h2>
        </div>
        <div className="team-preview__players">
          {PLAYER_TEAM.map((id) => {
            const character = STARTER_ROSTER[id];
            return (
              <article key={id} className="mini-player-card">
                <span>{id === 'kai' ? `YOU · ${character.role}` : `AI · ${character.role}`}</span>
                <strong>{character.name}</strong>
                <small>{character.archetype}</small>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
