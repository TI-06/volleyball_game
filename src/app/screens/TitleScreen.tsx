interface TitleScreenProps {
  onCpuMatch: () => void;
}

export function TitleScreen({ onCpuMatch }: TitleScreenProps) {
  return (
    <main className="app-shell app-shell--title">
      <section className="title-screen" aria-labelledby="game-title">
        <p className="title-screen__eyebrow">3 VS 3 VOLLEYBALL ACTION</p>
        <h1 id="game-title" className="title-screen__title">
          VOLLEYBALL
        </h1>
        <p className="title-screen__lead">読んで、つないで、自分で決める。</p>
        <button className="primary-button" type="button" onClick={onCpuMatch}>
          CPU MATCH
        </button>
      </section>
    </main>
  );
}
