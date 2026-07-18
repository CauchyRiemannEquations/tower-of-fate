import { useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { actions } from '../game/state/actions';
import { RELIC_SPECS } from '../game/systems/checkpoints';
import {
  IcExit,
  IcFloor,
  IcGem,
  IcLock,
  IcScroll,
  IcSoundOff,
  IcSoundOn,
  IcSpark,
} from './icons';

function riskClass(pct: number): string {
  if (pct < 20) return 'safe';
  if (pct < 40) return 'caution';
  if (pct < 60) return 'warning';
  return 'danger';
}

/** 게임 중 나가기 — 확정하지 않은 점수를 잃으므로 한 번 확인한다 */
function ExitConfirm({ onClose }: { onClose: () => void }) {
  const s = useGameStore();
  return (
    <div className="overlay modal-overlay" role="dialog" aria-label="나가기 확인">
      <div className="modal-panel exit-panel">
        <h2 className="modal-title">
          <IcExit size={20} />
          메인으로 나갈까요?
        </h2>
        <p className="modal-sub">
          {s.tower > 0
            ? `확정하지 않은 탑 위 ${s.tower.toLocaleString()}점을 잃어요.`
            : '진행 중인 판이 종료돼요.'}
        </p>
        <div className="go-buttons">
          <button className="btn btn-primary" onClick={onClose} autoFocus>
            계속 쌓기
          </button>
          <button className="btn btn-ghost" onClick={actions.toMenu}>
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}

export function HUD() {
  const s = useGameStore();
  const [showExit, setShowExit] = useState(false);
  const risk = s.aimRisk;
  const pct = risk?.total ?? null;

  return (
    <div className="hud">
      <div className="hud-row">
        <span className="chip floor-chip">
          <IcFloor />
          {s.floor}층
        </span>
        <span className="chip vault-chip">
          <IcLock />
          {s.vault.toLocaleString()}
        </span>
        <span className="chip tower-chip">
          <IcSpark />
          {s.tower.toLocaleString()}
        </span>
        <button
          className="icon-btn"
          onClick={actions.toggleSound}
          aria-label="사운드 켜기/끄기"
        >
          {s.soundOn ? <IcSoundOn size={16} /> : <IcSoundOff size={16} />}
        </button>
        <button
          className="icon-btn"
          onClick={() => setShowExit(true)}
          aria-label="메인 화면으로 나가기"
        >
          <IcExit size={16} />
        </button>
      </div>

      <div className={`risk-panel ${pct !== null ? riskClass(pct) : 'idle'}`}>
        <div className="risk-label-row">
          <span className="risk-label">붕괴 위험</span>
          {risk && (
            <span className={`fate-readout ${risk.perfect ? 'hit' : ''}`}>
              {risk.perfect ? '표식 적중 · PERFECT' : '황금 표식을 노리세요'}
            </span>
          )}
          {risk && (
            <span className="risk-factors-inline">
              {risk.factors.slice(0, 2).map((f, i) => (
                <span
                  key={`${f.label}-${i}`}
                  className={`factor ${f.delta > 0 ? 'up' : 'down'}`}
                >
                  {f.label} {f.delta > 0 ? `+${f.delta}` : f.delta}%
                </span>
              ))}
            </span>
          )}
          <span className="risk-pct">{pct !== null ? `${pct}%` : '—'}</span>
        </div>
        <div className="risk-bar-track">
          <div className="risk-bar-fill" style={{ width: `${pct ?? 0}%` }} />
        </div>
      </div>

      {(s.contract || s.relics.length > 0) && (
        <div className="hud-row hud-sub-row">
          {s.contract && (
            <span className="chip contract-chip" title={s.contract.desc}>
              <IcScroll size={13} />
              {s.contract.name} · {s.contract.progressText} · {s.contract.remaining}턴
            </span>
          )}
          {s.relics.map((r) => (
            <span key={r} className="chip relic-chip" title={RELIC_SPECS[r].desc}>
              <IcGem size={12} />
              {RELIC_SPECS[r].name}
            </span>
          ))}
        </div>
      )}

      {showExit && <ExitConfirm onClose={() => setShowExit(false)} />}
    </div>
  );
}
