import { useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { BLOCKS, BLOCK_ORDER } from '../game/config/blocks';
import { actions } from '../game/state/actions';
import { IcChevronDown, IcChevronUp, IcDeck, IcDice } from './icons';

/**
 * 운명 덱 정보 — 접힌 칩 하나로 시작해, 펼치면
 * 종류별 남은 수량과 (예언 효과 보유 시) 다음 카드를 보여준다.
 */
export function DeckPanel() {
  const s = useGameStore();
  const [open, setOpen] = useState(false);
  const d = s.deck;

  return (
    <div className="deck-panel">
      {open && (
        <div className="deck-popover" role="region" aria-label="덱 상세">
          <div className="deck-rows">
            {BLOCK_ORDER.map((id) => (
              <div key={id} className="deck-row">
                <i className={`deck-dot dot-${id}`} />
                <span className="deck-row-name">{BLOCKS[id].name}</span>
                <span className="deck-row-count">{d.remainingByType[id]}</span>
              </div>
            ))}
          </div>
          <div className="deck-discard">버림 더미 {d.discardCount}장</div>
          {d.upcoming.length > 0 && (
            <div className="deck-upcoming">
              <span className="deck-upcoming-label">다음 카드</span>
              {d.upcoming.map((id, i) => (
                <span key={`${id}-${i}`} className={`deck-next dot-${id}`}>
                  {BLOCKS[id].name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="deck-chip-row">
        <button
          className="sys-chip"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <IcDeck size={13} />덱 {d.drawCount}장
          {open ? <IcChevronDown size={12} /> : <IcChevronUp size={12} />}
        </button>
        {s.rerolls > 0 && s.phase === 'choosing' && (
          <button className="sys-chip sys-chip-action" onClick={actions.reroll}>
            <IcDice size={13} />
            리롤 {s.rerolls}
          </button>
        )}
      </div>
    </div>
  );
}
