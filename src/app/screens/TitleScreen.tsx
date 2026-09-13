import type { CameraSetting } from '../../game/camera/cameraDirector';
import type { SwitchMode } from '../../game/input/inputTypes';

interface TitleScreenProps {
  switchMode: SwitchMode;
  cameraMode: CameraSetting;
  onCpuMatch: () => void;
  onSwitchModeChange: (mode: SwitchMode) => void;
  onCameraModeChange: (mode: CameraSetting) => void;
}

const SWITCH_MODES: readonly { value: SwitchMode; label: string }[] = [
  { value: 'CASUAL', label: 'CASUAL' },
  { value: 'STANDARD', label: 'STANDARD' },
  { value: 'MANUAL', label: 'MANUAL' },
];

const CAMERA_MODES: readonly { value: CameraSetting; label: string }[] = [
  { value: 'STANDARD', label: 'DYNAMIC' },
  { value: 'LOW', label: 'LOW' },
  { value: 'OFF', label: 'OFF' },
];

export function TitleScreen({
  switchMode,
  cameraMode,
  onCpuMatch,
  onSwitchModeChange,
  onCameraModeChange,
}: TitleScreenProps) {
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

        <details className="title-settings">
          <summary>SETTINGS</summary>
          <div className="title-settings__row">
            <span>AUTO SWITCH</span>
            <div className="segmented-control" aria-label="キャラ切替モード">
              {SWITCH_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={switchMode === mode.value ? 'is-active' : undefined}
                  aria-pressed={switchMode === mode.value}
                  onClick={() => onSwitchModeChange(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          <div className="title-settings__row">
            <span>CAMERA</span>
            <div className="segmented-control" aria-label="カメラ演出">
              {CAMERA_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  className={cameraMode === mode.value ? 'is-active' : undefined}
                  aria-pressed={cameraMode === mode.value}
                  onClick={() => onCameraModeChange(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}
