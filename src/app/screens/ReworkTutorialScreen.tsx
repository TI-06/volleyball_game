import { useEffect, useState } from 'react';
import type { ReworkEvent } from '../../game/rework/types';

function successfulContact(event: ReworkEvent | null, type: 'RECEIVE' | 'SPIKE'): boolean {
  return (
    event?.type === type &&
    event.actorId === 'home-0' &&
    event.quality !== 'MISS'
  );
}

const STEPS = [
  {
    title: 'PLAYで拾う',
    body: '左側を横ドラッグしてボールへ寄り、腕に入る瞬間にPLAY。',
    complete: (event: ReworkEvent | null) => successfulContact(event, 'RECEIVE'),
  },
  {
    title: 'POWERで跳ぶ',
    body: 'RENのトスに助走を合わせ、POWERを押して最高打点へ。',
    complete: (event: ReworkEvent | null) => event?.type === 'JUMP' && event.actorId === 'home-0',
  },
  {
    title: 'POWERをスワイプ',
    body: '空中でPOWERをスワイプ。左右でコース、短い入力でフェイント。',
    complete: (event: ReworkEvent | null) => successfulContact(event, 'SPIKE'),
  },
] as const;

interface ReworkTutorialScreenProps {
  event: ReworkEvent | null;
  onComplete: () => void;
  onSkip: () => void;
}

export function ReworkTutorialScreen({ event, onComplete, onSkip }: ReworkTutorialScreenProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const current = STEPS[step];
    if (!current || !current.complete(event)) return;
    if (step >= STEPS.length - 1) onComplete();
    else setStep((value) => value + 1);
  }, [event, onComplete, step]);

  const current = STEPS[step];
  if (!current) return null;

  return (
    <aside className="rework-tutorial">
      <span>QUICK START {step + 1}/{STEPS.length}</span>
      <strong>{current.title}</strong>
      <p>{current.body}</p>
      <button type="button" onClick={onSkip}>SKIP</button>
    </aside>
  );
}
