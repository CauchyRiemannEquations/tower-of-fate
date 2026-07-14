import { useGameStore } from '../hooks/useGameStore';

/** ?debug 쿼리로 켜는 개발용 패널 */
export function DebugPanel() {
  const s = useGameStore();
  return (
    <div className="debug-panel">
      <div>phase: {s.phase}</div>
      <div>risk: {s.aimRisk?.total ?? '—'}%</div>
      <div>roll: {s.debug.lastRoll >= 0 ? s.debug.lastRoll.toFixed(3) : '—'}</div>
      <div>eff: {s.debug.lastEffective.toFixed(3)}</div>
      <div>comOff: {s.debug.comOffset.toFixed(1)}</div>
      <div>combo: {s.combo}</div>
    </div>
  );
}
