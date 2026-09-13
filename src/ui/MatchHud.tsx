import type { CharacterId } from '../game/characters/roster';
import type { ActionKind, SwipeInput } from '../game/input/inputTypes';
import { ActionButton } from './ActionButton';
import { CharacterSwitcher } from './CharacterSwitcher';
import { VirtualStick } from './VirtualStick';

interface MatchHudProps {
  homeScore: number;
  awayScore: number;
  action: ActionKind | null;
  characterIds: readonly CharacterId[];
  activeCharacterId: CharacterId;
  suggestedCharacterId?: CharacterId | null;
  onMove: (move: { x: number; z: number }) => void;
  onActionPress: (action: ActionKind) => void;
  onActionRelease: (action: ActionKind) => void;
  onActionGesture: (action: ActionKind, swipe: SwipeInput) => void;
  onCharacterSelect: (characterId: CharacterId) => void;
}

export function MatchHud({
  homeScore,
  awayScore,
  action,
  characterIds,
  activeCharacterId,
  suggestedCharacterId,
  onMove,
  onActionPress,
  onActionRelease,
  onActionGesture,
  onCharacterSelect,
}: MatchHudProps) {
  return (
    <div className="match-hud">
      <div className="score-hud" aria-label={`PLAYER ${homeScore} CPU ${awayScore}`}>
        <span>PLAYER</span><strong>{homeScore}</strong><i>SET 1</i><strong>{awayScore}</strong><span>CPU</span>
      </div>
      <div className="match-hud__move">
        <VirtualStick onMove={onMove} />
      </div>
      <div className="match-hud__switch">
        <CharacterSwitcher
          characterIds={characterIds}
          activeCharacterId={activeCharacterId}
          suggestedCharacterId={suggestedCharacterId}
          onSelect={onCharacterSelect}
        />
      </div>
      <div className="match-hud__action">
        <ActionButton
          action={action}
          onPress={onActionPress}
          onRelease={onActionRelease}
          onGesture={onActionGesture}
        />
      </div>
    </div>
  );
}
