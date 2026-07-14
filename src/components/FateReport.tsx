import { useMemo, useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import {
  BUCKET_LABELS,
  BUCKET_ORDER,
  bucketize,
  highestSurvived,
  lastDecisionEV,
  loadCumulative,
  survivedStreakProb,
} from '../game/systems/analytics';
import type { CumulativeStats } from '../types';
import { IcBook, IcChevronDown, IcChevronUp } from './icons';

function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

function BucketTable({ stats }: { stats: CumulativeStats }) {
  return (
    <table className="fr-table">
      <thead>
        <tr>
          <th>위험 구간</th>
          <th>시도</th>
          <th>생존</th>
          <th>실제</th>
          <th>이론</th>
        </tr>
      </thead>
      <tbody>
        {BUCKET_ORDER.map((k) => {
          const b = stats[k];
          const actual = b.attempts > 0 ? b.survived / b.attempts : null;
          const theory =
            b.attempts > 0 ? 1 - b.riskSum / b.attempts / 100 : null;
          return (
            <tr key={k}>
              <td>{BUCKET_LABELS[k]}</td>
              <td>{b.attempts}</td>
              <td>{b.survived}</td>
              <td>{actual !== null ? pct(actual, 0) : '—'}</td>
              <td>{theory !== null ? pct(theory, 0) : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * 운명 분석서 — 이번 판의 실제 위험과 선택을 사후 분석한다.
 * 게임 종료 화면에서만, 원할 때 펼쳐 본다.
 */
export function FateReport() {
  const s = useGameStore();
  const [open, setOpen] = useState(false);

  const log = s.runLog;
  const info = s.gameOver;

  const analysis = useMemo(() => {
    if (log.length === 0) return null;
    return {
      run: bucketize(log),
      cumulative: loadCumulative(),
      streak: survivedStreakProb(log),
      survivedCount: log.filter((a) => a.survived).length,
      top: highestSurvived(log),
      ev: info ? lastDecisionEV(log, info.towerAtStake) : null,
    };
  }, [log, info]);

  if (!analysis || log.length === 0) return null;

  return (
    <div className="fate-report">
      <button
        className="btn btn-ghost fr-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="btn-main">
          <IcBook />
          운명 분석서 {open ? <IcChevronUp size={13} /> : <IcChevronDown size={13} />}
        </span>
      </button>

      {open && (
        <div className="fr-body">
          <p className="fr-line">
            이번 판 {analysis.survivedCount}번의 도전을 모두 생존할 확률은{' '}
            <b>약 {pct(analysis.streak)}</b>였습니다.
          </p>

          {analysis.top && (
            <p className="fr-line">
              가장 아찔했던 순간 — 위험 <b>{analysis.top.risk}%</b>를 뚫고 +
              {analysis.top.gained}점. 생존 확률은 {100 - analysis.top.risk}%
              였습니다.
            </p>
          )}

          <div className="fr-section-title">이번 판 기록</div>
          <BucketTable stats={analysis.run} />

          <details className="fr-details">
            <summary>누적 기록 보기</summary>
            <BucketTable stats={analysis.cumulative} />
          </details>

          {analysis.ev && analysis.ev.towerAtStake > 0 && (
            <details className="fr-details">
              <summary>마지막 결정의 단순 기대값</summary>
              <div className="fr-ev">
                <div>
                  걸려 있던 탑 위 점수: <b>{analysis.ev.towerAtStake}점</b>
                </div>
                <div>
                  다음 블록 성공 시 예상 획득: +{analysis.ev.expectedGain}점 (성공
                  확률 {pct(analysis.ev.successProb, 0)})
                </div>
                <div>
                  계속 쌓기 기대값 ≈ <b>{Math.round(analysis.ev.evContinue)}점</b>{' '}
                  / 멈추기 = <b>{analysis.ev.evStop}점</b>
                </div>
                <p className="fr-note">
                  마지막 시도의 위험·점수를 그대로 쓴 단순 추정입니다.
                </p>
              </div>
            </details>
          )}

          <details className="fr-details">
            <summary>계산 방식</summary>
            <p className="fr-note">
              연속 생존 확률은 각 턴의 (1 − 붕괴 위험)을 모두 곱한 값입니다. 이론
              생존율은 구간 내 시도들의 평균 위험으로 계산하며, 표시된 위험과
              실제 판정은 동일한 값을 사용합니다.
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
