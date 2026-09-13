import { useEffect, useMemo, useState } from 'react';
import type { RuntimeEvent } from '../../game/runtime/matchRuntime';

const STEPS = [
  { event: 'RECEIVE', title: 'まずは拾う', body: '左スティックで落下地点へ移動して、RECEIVEを押そう。' },
  { event: 'SET', title: '攻撃につなぐ', body: 'セッターに切り替わったらSET。味方が打ちやすいトスを上げる。' },
  { event: 'JUMP', title: '助走からジャンプ', body: 'アタッカーへ切り替わったら、打点に合わせてJUMP。' },
  { event: 'SPIKE', title: '自分で決める', body: '空中でSPIKE。タイミングが良いほど強いボールになる。' },
  { event: 'BLOCK', title: '最後はブロック', body: '相手攻撃に合わせてネット前へ。BLOCKでシャットを狙おう。' },
] as const;

interface TutorialScreenProps {
  event: RuntimeEvent | null;
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialScreen({ event, onComplete, onSkip }: TutorialScreenProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const progress = useMemo(() => `${step + 1} / ${STEPS.length}`, [step]);

  useEffect(() => {
    if (!event || !current || event.actorId?.startsWith('away-')) return;
    if (event.type !== current.event) return;
    if (step === STEPS.length - 1) {
      onComplete();
      return;
    }
    setStep((value) => value + 1);
  }, [current, event, onComplete, step]);

  if (!current) return null;

  return (
    <aside className="tutorial-coach" aria-live="polite">
      <div className="tutorial-coach__progress">TUTORIAL {progress}</div>
      <strong>{current.title}</strong>
      <p>{current.body}</p>
      <button type="button" className="text-button" onClick={onSkip}>
        SKIP
      </button>
    </aside>
  );
}
