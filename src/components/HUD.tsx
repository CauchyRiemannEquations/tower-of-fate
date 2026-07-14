import { useGameStore } from '../hooks/useGameStore';
import { actions } from '../game/state/actions';
import { IcFloor, IcLock, IcSoundOff, IcSoundOn, IcSpark, IcTrophy } from './icons';

function riskClass(pct: number): string {
  if (pct < 20) return 'safe';
  if (pct < 40) return 'caution';
  if (pct < 60) return 'warning';
  return 'danger';
}

export function HUD() {
  const s = useGameStore();
  const risk = s.aimRisk;
  const pct = risk?.total ?? null;

  return (
    <div className="hud">
      <div className="hud-row">
        <span className="chip floor-chip">
          <IcFloor />
          {s.floor}층
        </span>
        <span className="chip best-chip">
          <IcTrophy />
          {s.best.toLocaleString()}
        </span>
        <button
          className="icon-btn"
          onClick={actions.toggleSound}
          aria-label="사운드 켜기/끄기"
        >
          {s.soundOn ? <IcSoundOn size={17} /> : <IcSoundOff size={17} />}
        </button>
      </div>
      <div className="hud-row">
        <span className="chip vault-chip">
          <IcLock />
          금고 {s.vault.toLocaleString()}
        </span>
        <span className="chip tower-chip">
          <IcSpark />
          탑 위 {s.tower.toLocaleString()}
        </span>
      </div>

      <div className={`risk-panel ${pct !== null ? riskClass(pct) : 'idle'}`}>
        <div className="risk-label-row">
          <span className="risk-label">붕괴 위험</span>
          <span className="risk-pct">{pct !== null ? `${pct}%` : '—'}</span>
        </div>
        <div className="risk-bar-track">
          <div
            className="risk-bar-fill"
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
        {risk && (
          <div className="risk-factors">
            {risk.factors.slice(0, 3).map((f, i) => (
              <span
                key={`${f.label}-${i}`}
                className={`factor ${f.delta > 0 ? 'up' : 'down'}`}
              >
                {f.label} {f.delta > 0 ? `+${f.delta}` : f.delta}%
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
