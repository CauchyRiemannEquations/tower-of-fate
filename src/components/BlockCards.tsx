import { BLOCKS } from '../game/config/blocks';
import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';

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

export function BlockCards() {
  const s = useGameStore();
  const busy = s.phase === 'dropping' || s.phase === 'collapsing';

  return (
    <div className={`cards ${busy ? 'cards-busy' : ''}`}>
      {s.offers.map((id, i) => {
        const def = BLOCKS[id];
        const selected = s.selected === id && s.phase === 'aiming';
        return (
          <button
            key={`${id}-${i}`}
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
        );
      })}
    </div>
  );
}
