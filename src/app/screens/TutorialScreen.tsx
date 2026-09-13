import { useEffect, useMemo, useState } from 'react';
import type { RuntimeEvent } from '../../game/runtime/matchRuntime';

const STEPS = [
  { event: 'RECEIVE', title: 'まずは拾う', body: '左スティックで落下地点へ移動して、RECEIVEをタイミングよく押そう。' },
  { event: 'SET', title: '攻撃につなぐ', body: 'セッターに切り替わったらSETをスワイプ。速さと方向でトスを選ぶ。' },
  { event: 'JUMP', title: '助走からジャンプ', body: 'アタッカーへ切り替わったら、打点に合わせてJUMP。' },
  { event: 'SPIKE', title: '自分で決める', body: '空中でSPIKEをスワイプ。コースとタイミングを合わせて打ち切ろう。' },
  { event: 'BLOCK', title: '最後はブロック', body: '相手攻撃に合わせてネット前へ。JUMPして、空中でBLOCKをタイミングよく押そう。' },
] as const;

interface TutorialScreenProps {
  event: RuntimeEvent | null;
  onComplete: () => void;
  onSkip: () => void;
}

function isSuccessfulTutorialEvent(event: RuntimeEvent): boolean {
  if (event.type === 'JUMP') return true;
  if (event.type === 'RECEIVE' || event.type === 'SET' || event.type === 'SPIKE' || event.type === 'BLOCK') {
    return Boolean(event.quality && event.quality !== 'MISS');
  }
  return true;
}

export function TutorialScreen({ event, onComplete, onSkip }: TutorialScreenProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const progress = useMemo(() => `${step + 1} / ${STEPS.length}`, [step]);

  useEffect(() => {
    if (!event || !current || event.actorId?.startsWith('away-')) return;
    if (event.type !== current.event || !isSuccessfulTutorialEvent(event)) return;
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
