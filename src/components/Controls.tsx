import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';
import { IcDrop, IcLock } from './icons';

export function Controls() {
  const s = useGameStore();
  const canDrop = s.phase === 'aiming';
  const canBank =
    (s.phase === 'choosing' || s.phase === 'aiming') && s.tower + s.vault > 0;

  return (
    <div className="controls">
      <button
        className="btn btn-bank"
        onClick={actions.bankAndEscape}
        disabled={!canBank}
      >
        <span className="btn-main">
          <IcLock size={17} />
          점수 확정
        </span>
        <small>{(s.vault + s.tower).toLocaleString()}점 갖고 탈출</small>
      </button>
      <button
        className="btn btn-drop"
        onClick={actions.requestDrop}
        disabled={!canDrop}
      >
        <span className="btn-main">
          <IcDrop size={18} />
          떨어뜨리기
        </span>
        <small>{canDrop ? '드래그로 위치 조절' : '블록을 선택하세요'}</small>
      </button>
    </div>
  );
}
