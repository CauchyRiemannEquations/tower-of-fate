import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';
import { IcFlag, IcGem } from './icons';

/** 체크포인트 도달 시 빌드 방향(길) 또는 유물을 고르는 모달 */
export function CheckpointModal() {
  const s = useGameStore();
  if (s.phase !== 'checkpoint' || !s.checkpointOffers) return null;

  return (
    <div className="overlay modal-overlay" role="dialog" aria-label="체크포인트 선택">
      <div className="modal-panel">
        <h2 className="modal-title">
          <IcFlag size={20} />
          {s.floor}층 체크포인트
        </h2>
        <p className="modal-sub">이번 판의 방향을 정하세요</p>
        <div className="option-list">
          {s.checkpointOffers.map((o) => (
            <button
              key={`${o.kind}-${o.id}`}
              className={`option-card ${o.kind === 'relic' ? 'option-relic' : ''}`}
              onClick={() => actions.chooseCheckpoint(o)}
            >
              <span className="option-name">
                {o.kind === 'relic' && <IcGem size={13} />}
                {o.name}
                <em className="option-kind">{o.kind === 'relic' ? '유물' : '길'}</em>
              </span>
              <span className="option-desc">{o.desc}</span>
              {o.tradeoff && <span className="option-tradeoff">대가: {o.tradeoff}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost btn-skip" onClick={actions.skipCheckpoint}>
          보상 없이 계속
        </button>
      </div>
    </div>
  );
}
