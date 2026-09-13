import { STARTER_ROSTER, type CharacterId } from '../game/characters/roster';

interface CharacterSwitcherProps {
  characterIds: readonly CharacterId[];
  activeCharacterId: CharacterId;
  suggestedCharacterId?: CharacterId | null;
  onSelect: (characterId: CharacterId) => void;
}

export function CharacterSwitcher({
  characterIds,
  activeCharacterId,
  suggestedCharacterId = null,
  onSelect,
}: CharacterSwitcherProps) {
  return (
    <div className="character-switcher" aria-label="操作選手切替">
      {characterIds.map((characterId) => {
        const character = STARTER_ROSTER[characterId];
        const active = characterId === activeCharacterId;
        const suggested = characterId === suggestedCharacterId && !active;

        return (
          <button
            key={character.id}
            type="button"
            className={`character-card${active ? ' is-active' : ''}${suggested ? ' is-suggested' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(characterId)}
          >
            <span className="character-card__role">{character.role}</span>
            <strong>{character.name}</strong>
          </button>
        );
      })}
    </div>
  );
}
