import type { ReworkActionLabel, ReworkEvent, ReworkSwipe } from '../../game/rework/types';
import { DualActionPad } from './DualActionPad';
import { MovementStrip } from './MovementStrip';
import { ReworkFeedback } from './ReworkFeedback';

interface ReworkHudProps {
  homeScore: number;
  awayScore: number;
  playLabel: ReworkActionLabel;
  powerLabel: ReworkActionLabel;
  event: ReworkEvent | null;
  onMove: (axis: number) => void;
  onPlayPress: () => void;
  onPowerPress: () => void;
  onPowerRelease: (swipe: ReworkSwipe | null) => void;
}

export function ReworkHud({
  homeScore,
  awayScore,
  playLabel,
  powerLabel,
  event,
  onMove,
  onPlayPress,
  onPowerPress,
  onPowerRelease,
}: ReworkHudProps) {
  return (
    <div className="rework-hud">
      <div className="rework-focus-id">
        <small>ACE / FOCUS</small>
        <strong>KAI</strong>
      </div>
      <div className="rework-score" aria-label={`PLAYER ${homeScore} CPU ${awayScore}`}>
        <span>PLAYER</span>
        <strong>{homeScore}</strong>
        <i>15 PT</i>
        <strong>{awayScore}</strong>
        <span>CPU</span>
      </div>
      <ReworkFeedback event={event} />
      <div className="rework-hud__movement">
        <MovementStrip onMove={onMove} />
      </div>
      <div className="rework-hud__actions">
        <DualActionPad
          playLabel={playLabel}
          powerLabel={powerLabel}
          onPlayPress={onPlayPress}
          onPowerPress={onPowerPress}
          onPowerRelease={onPowerRelease}
        />
      </div>
    </div>
  );
}
