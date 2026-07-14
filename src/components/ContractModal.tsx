import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';
import { IcScroll } from './icons';

/** 예언 계약 선택 모달 — 3~4층마다 제안되는 짧은 도전 */
export function ContractModal() {
  const s = useGameStore();
  if (s.phase !== 'contract' || !s.contractOffers) return null;

  return (
    <div className="overlay modal-overlay" role="dialog" aria-label="예언 계약 선택">
      <div className="modal-panel">
        <h2 className="modal-title">
          <IcScroll size={20} />
          예언의 계약
        </h2>
        <p className="modal-sub">하나를 골라 3번의 배치 동안 도전하세요</p>
        <div className="option-list">
          {s.contractOffers.map((c) => (
            <button
              key={c.id}
              className="option-card"
              onClick={() => actions.chooseContract(c.id)}
            >
              <span className="option-name">{c.name}</span>
              <span className="option-desc">{c.desc}</span>
              <span className="option-reward">보상: {c.reward}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-skip" onClick={actions.skipContract}>
          이번에는 넘어가기
        </button>
      </div>
    </div>
  );
}
