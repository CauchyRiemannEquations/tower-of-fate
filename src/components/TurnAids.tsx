import { useGameStore } from '../hooks/useGameStore';
import { BLOCKS } from '../game/config/blocks';
import { actions } from '../game/state/actions';
import { IcDice, IcGem } from './icons';

/**
 * 카드 위의 미니 보조 칩 — 평소에는 아무것도 없고,
 * 예언 효과(다음 카드)나 리롤을 보유했을 때만 나타난다.
 */
export function TurnAids() {
  const s = useGameStore();
  const next = s.deck.upcoming[0];
  const showReroll = s.rerolls > 0 && s.phase === 'choosing';

  if (!next && !showReroll) return null;

  return (
    <div className="sys-row">
      {next ? (
        <span className="sys-chip" title="예언 효과: 다음에 나올 카드">
          <IcGem size={12} />
          다음 카드
          <i className={`deck-dot dot-${next}`} />
          {BLOCKS[next].name}
        </span>
      ) : (
        <span />
      )}
      {showReroll && (
        <button className="sys-chip sys-chip-action" onClick={actions.reroll}>
          <IcDice size={13} />
          리롤 {s.rerolls}
        </button>
      )}
    </div>
  );
}
