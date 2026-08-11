import { useMemo, useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import {
  BUCKET_LABELS,
  BUCKET_ORDER,
  bucketize,
  highestSurvived,
  lastDecisionEV,
  loadCumulative,
  survivalCurve,
  survivedStreakProb,
} from '../game/systems/analytics';
import type { CumulativeStats, RiskAttempt } from '../types';
import { IcBook, IcChevronDown, IcChevronUp } from './icons';

function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

function riskColor(risk: number): string {
  if (risk < 20) return '#35e0c9';
  if (risk < 40) return '#ffd23c';
  if (risk < 60) return '#ff8c3a';
  return '#ff4d5e';
}

/**
 * 층별 위험 막대 + 생존 확률 감쇠 곡선.
 * 막대는 그 층 배치의 붕괴 위험, 금색 선은 "여기까지 전부
 * 생존할 이론 확률"이 층마다 곱으로 깎여 내려가는 모습이다.
 */
function RiskTimeline({ log }: { log: RiskAttempt[] }) {
  const W = 320;
  const H = 138;
  const padL = 30;
  const padR = 8;
  const padT = 12;
  const padB = 20;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = log.length;
  const curve = survivalCurve(log);

  const xc = (i: number) => padL + ((i + 0.5) / n) * plotW;
  const y = (v: number) => padT + (1 - v) * plotH;
  const barW = Math.max(3, Math.min(16, (plotW / n) * 0.55));
  const labelStep = Math.max(1, Math.ceil(n / 6));

  const curvePath = curve
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xc(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      className="fr-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="층별 붕괴 위험과 생존 확률 곡선"
    >
      {/* 눈금선 0 / 50 / 100% */}
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(v)}
            y2={y(v)}
            stroke="rgba(160,140,255,0.18)"
            strokeWidth="1"
            strokeDasharray={v === 0.5 ? '3 3' : undefined}
          />
          <text
            x={padL - 5}
            y={y(v) + 3}
            textAnchor="end"
            fontSize="8"
            fill="#8d80bb"
          >
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}

      {/* 층별 위험 막대 */}
      {log.map((a, i) => {
        const h = Math.max(1.5, (a.risk / 100) * plotH);
        return (
          <g key={i}>
            <rect
              x={xc(i) - barW / 2}
              y={padT + plotH - h}
              width={barW}
              height={h}
              rx={1.5}
              fill={riskColor(a.risk)}
              opacity={a.survived ? 0.85 : 1}
            />
            {!a.survived && (
              <text
                x={xc(i)}
                y={padT + plotH - h - 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="900"
                fill="#ff4d5e"
              >
                ✕
              </text>
            )}
            {(i % labelStep === 0 || i === n - 1) && (
              <text
                x={xc(i)}
                y={H - 6}
                textAnchor="middle"
                fontSize="8"
                fill="#8d80bb"
              >
                {a.floor}층
              </text>
            )}
          </g>
        );
      })}

      {/* 생존 확률 감쇠 곡선 */}
      <path
        d={curvePath}
        fill="none"
        stroke="#ffe98a"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {curve.map((v, i) => (
        <circle key={i} cx={xc(i)} cy={y(v)} r="2" fill="#ffe98a" />
      ))}
      {/* 곡선 마지막 값 라벨 */}
      <text
        x={Math.min(xc(n - 1) + 4, W - padR)}
        y={Math.max(9, y(curve[n - 1]) - 5)}
        textAnchor={n > 4 ? 'end' : 'start'}
        fontSize="8.5"
        fontWeight="800"
        fill="#ffe98a"
      >
        {pct(curve[n - 1], curve[n - 1] < 0.1 ? 1 : 0)}
      </text>
    </svg>
  );
}

/** 누적 기록의 실제 vs 이론 생존율 비교 막대 */
function BucketBars({ stats }: { stats: CumulativeStats }) {
  const rows = BUCKET_ORDER.filter((k) => stats[k].attempts > 0);
  if (rows.length === 0) return null;
  return (
    <div className="bb-wrap">
      {rows.map((k) => {
        const b = stats[k];
        const actual = b.survived / b.attempts;
        const theory = 1 - b.riskSum / b.attempts / 100;
        return (
          <div key={k} className="bb-row">
            <span className="bb-label">
              {BUCKET_LABELS[k]}
              <em>{b.attempts}회</em>
            </span>
            <div className="bb-bars">
              <div className="bb-track">
                <i className="bb-fill bb-actual" style={{ width: pct(actual, 0) }} />
                <span className="bb-val">실제 {pct(actual, 0)}</span>
              </div>
              <div className="bb-track">
                <i className="bb-fill bb-theory" style={{ width: pct(theory, 0) }} />
                <span className="bb-val">이론 {pct(theory, 0)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
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
    const cumulative = loadCumulative();
    // 누적 전체 — 실제 생존율과 이론 생존율의 수렴을 보여주기 위한 합계
    const total = BUCKET_ORDER.reduce(
      (acc, k) => {
        acc.attempts += cumulative[k].attempts;
        acc.survived += cumulative[k].survived;
        acc.riskSum += cumulative[k].riskSum;
        return acc;
      },
      { attempts: 0, survived: 0, riskSum: 0 },
    );
    return {
      run: bucketize(log),
      cumulative,
      total,
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

          <div className="fr-section-title">층별 위험과 생존 곡선</div>
          <RiskTimeline log={log} />
          <div className="fr-legend">
            <span className="fr-legend-item">
              <i className="fr-swatch fr-swatch-bar" />막대: 그 층의 붕괴 위험
            </span>
            <span className="fr-legend-item">
              <i className="fr-swatch fr-swatch-line" />선: 여기까지 전부 생존할 확률
            </span>
          </div>

          <details className="fr-details">
            <summary>이번 판 구간별 기록</summary>
            <BucketTable stats={analysis.run} />
          </details>

          <details className="fr-details">
            <summary>누적 기록 보기</summary>
            <BucketBars stats={analysis.cumulative} />
            <details className="fr-details fr-details-nested">
              <summary>표로 보기</summary>
              <BucketTable stats={analysis.cumulative} />
            </details>
            {analysis.total.attempts >= 50 && (
              <p className="fr-note">
                지금까지 {analysis.total.attempts.toLocaleString()}번의 판정 —
                실제 생존율{' '}
                {pct(analysis.total.survived / analysis.total.attempts, 0)},
                이론{' '}
                {pct(
                  1 - analysis.total.riskSum / analysis.total.attempts / 100,
                  0,
                )}
                . 판이 쌓일수록 두 숫자는 서로에게 다가가요.
              </p>
            )}
          </details>

          {analysis.ev && analysis.ev.towerAtStake > 0 && (
            <details className="fr-details">
              <summary>마지막 결정의 단순 기댓값</summary>
              <div className="fr-ev">
                <div>
                  걸려 있던 탑 위 점수: <b>{analysis.ev.towerAtStake}점</b>
                </div>
                <div>
                  다음 블록 성공 시 예상 획득: +{analysis.ev.expectedGain}점 (성공
                  확률 {pct(analysis.ev.successProb, 0)})
                </div>
                <div>
                  계속 쌓기 기댓값 ≈ <b>{Math.round(analysis.ev.evContinue)}점</b>{' '}
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
