import { BLOCKS } from '../game/config/blocks';
import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';
import { IcBookmark } from './icons';

function WeightDots({ weight }: { weight: number }) {
  return (
    <span className="weight-dots" title={`무게 ${weight}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < weight ? 'on' : ''} />
      ))}
    </span>
  );
}

/** 블록별 CSS 표정 — Phaser 텍스처의 얼굴과 같은 인상 */
function MiniFace({ id }: { id: string }) {
  return (
    <span className={`mf mf-${id}`}>
      <span className="mf-eyes">
        <i className="mf-eye" />
        <i className="mf-eye" />
      </span>
      <i className="mf-mouth" />
    </span>
  );
}

/** 예약 슬롯 — 보관된 블록은 언제든 일반 선택처럼 사용 */
export function ReserveChip() {
  const s = useGameStore();
  const r = s.reserve;
  const busy = s.phase === 'dropping' || s.phase === 'collapsing';

  if (!r.block) {
    return (
      <span className="sys-chip sys-chip-idle">
        <IcBookmark size={13} />
        예약 비어 있음 · {r.uses}회
      </span>
    );
  }
  const def = BLOCKS[r.block];
  const selected = s.phase === 'aiming' && s.selected === r.block;
  return (
    <button
      className={`sys-chip sys-chip-reserved ${selected ? 'selected' : ''}`}
      onClick={actions.selectReserved}
      disabled={busy}
    >
      <IcBookmark size={13} />
      <i className={`deck-dot dot-${r.block}`} />
      {def.name} 사용
    </button>
  );
}

export function BlockCards() {
  const s = useGameStore();
  const busy = s.phase === 'dropping' || s.phase === 'collapsing';
  const canReserve = s.reserve.uses > 0 && !busy;

  return (
    <div className={`cards ${busy ? 'cards-busy' : ''}`}>
      {s.offers.map((id, i) => {
        const def = BLOCKS[id];
        const selected = s.selected === id && s.phase === 'aiming';
        return (
          <div key={`${id}-${i}`} className="card-wrap">
            <button
              className={`card card-${id} ${selected ? 'selected' : ''}`}
              onClick={() => actions.selectBlock(id)}
              disabled={busy}
            >
              <div className={`mini-block mb-${id}`}>
                <MiniFace id={id} />
              </div>
              <div className="card-name">{def.name}</div>
              <div className="card-score">+{def.score}점</div>
              <div className="card-meta">
                <WeightDots weight={def.weight} />
                <span className="card-risk">위험 {def.baseRisk}%</span>
              </div>
              <div className="card-desc">{def.desc}</div>
            </button>
            {canReserve && (
              <button
                className="reserve-btn"
                onClick={() => actions.reserveBlock(i)}
                aria-label={`${def.name} 예약`}
                title="예약 슬롯에 보관"
              >
                <IcBookmark size={13} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
