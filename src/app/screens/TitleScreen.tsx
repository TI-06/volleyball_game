interface TitleScreenProps {
  onCpuMatch: () => void;
}

export function TitleScreen({ onCpuMatch }: TitleScreenProps) {
  return (
    <main className="app-shell app-shell--title">
      <section className="title-screen" aria-labelledby="game-title">
        <p className="title-screen__eyebrow">3 VS 3 / ONE PLAYER FOCUS</p>
        <h1 id="game-title" className="title-screen__title">
          VOLLEYBALL
        </h1>
        <p className="title-screen__lead">拾う。上がる。跳ぶ。決める。</p>
        <button className="primary-button" type="button" onClick={onCpuMatch}>
          CPU MATCH
        </button>
        <p className="title-screen__control-note">LANDSCAPE · DRAG + PLAY + POWER</p>
      </section>
    </main>
  );
}
