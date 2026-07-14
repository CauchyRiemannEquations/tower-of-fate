import type {
  BucketKey,
  CumulativeStats,
  RiskAttempt,
} from '../../types';
import { LS_KEYS } from '../config/balance';

/**
 * 운명 분석서 — 게임 종료 화면에서 펼쳐보는 사후 확률 분석.
 * 모든 계산은 판정에 실제 사용된 위험 값(runLog)만을 근거로 하며,
 * 플레이 중에는 노출되지 않는다.
 */

export function bucketOf(risk: number): BucketKey {
  if (risk < 20) return 'b0';
  if (risk < 40) return 'b20';
  if (risk < 60) return 'b40';
  return 'b60';
}

export const BUCKET_LABELS: Record<BucketKey, string> = {
  b0: '0~19%',
  b20: '20~39%',
  b40: '40~59%',
  b60: '60% 이상',
};

export const BUCKET_ORDER: BucketKey[] = ['b0', 'b20', 'b40', 'b60'];

export function emptyStats(): CumulativeStats {
  return {
    b0: { attempts: 0, survived: 0, riskSum: 0 },
    b20: { attempts: 0, survived: 0, riskSum: 0 },
    b40: { attempts: 0, survived: 0, riskSum: 0 },
    b60: { attempts: 0, survived: 0, riskSum: 0 },
  };
}

/** 시도 로그 → 위험 구간별 통계 */
export function bucketize(log: RiskAttempt[]): CumulativeStats {
  const stats = emptyStats();
  for (const a of log) {
    const b = stats[bucketOf(a.risk)];
    b.attempts += 1;
    if (a.survived) b.survived += 1;
    b.riskSum += a.risk;
  }
  return stats;
}

export function mergeStats(
  a: CumulativeStats,
  b: CumulativeStats,
): CumulativeStats {
  const out = emptyStats();
  for (const k of BUCKET_ORDER) {
    out[k] = {
      attempts: a[k].attempts + b[k].attempts,
      survived: a[k].survived + b[k].survived,
      riskSum: a[k].riskSum + b[k].riskSum,
    };
  }
  return out;
}

/**
 * 생존한 시도들을 모두 통과할 이론적 확률 (0~1).
 * 각 턴의 생존 확률 (1 - 위험)을 곱해 계산한다.
 */
export function survivedStreakProb(log: RiskAttempt[]): number {
  return log
    .filter((a) => a.survived)
    .reduce((p, a) => p * (1 - a.risk / 100), 1);
}

/** 이번 판에서 생존한 가장 높은 위험의 시도 */
export function highestSurvived(log: RiskAttempt[]): RiskAttempt | null {
  let best: RiskAttempt | null = null;
  for (const a of log) {
    if (a.survived && (!best || a.risk > best.risk)) best = a;
  }
  return best;
}

/**
 * 마지막 결정 시점의 단순 기대값 분석.
 *
 * 가정 (사실이 아닌 근사치이며 UI에도 "단순 추정"으로 표기):
 * - "한 층 더"의 예상 획득 점수는 마지막 시도의 획득 점수(붕괴 시
 *   해당 블록의 기본 점수 추정치)와 같다.
 * - 성공 확률은 마지막 시도에 표시된 위험을 그대로 사용한다.
 * - 붕괴 시 탑 위 점수를 전부 잃는다(유물 효과 제외).
 */
export interface EvAnalysis {
  /** 걸려 있던 탑 위 점수 */
  towerAtStake: number;
  /** 다음 블록 성공 시 예상 획득 */
  expectedGain: number;
  /** 성공 확률 (0~1) */
  successProb: number;
  /** 계속 쌓을 때의 단순 기대값 */
  evContinue: number;
  /** 멈출 때의 확정값 */
  evStop: number;
}

export function lastDecisionEV(
  log: RiskAttempt[],
  towerAtStake: number,
): EvAnalysis | null {
  if (log.length === 0) return null;
  const last = log[log.length - 1];
  const successProb = 1 - last.risk / 100;
  const expectedGain = Math.max(last.gained, 0);
  return {
    towerAtStake,
    expectedGain,
    successProb,
    evContinue: (towerAtStake + expectedGain) * successProb,
    evStop: towerAtStake,
  };
}

// ── 누적 통계 저장 ──────────────────────────────────

export function loadCumulative(): CumulativeStats {
  try {
    const raw = localStorage.getItem(LS_KEYS.analytics);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as CumulativeStats;
    // 필드 누락 방어
    return mergeStats(emptyStats(), parsed);
  } catch {
    return emptyStats();
  }
}

export function saveCumulative(stats: CumulativeStats) {
  try {
    localStorage.setItem(LS_KEYS.analytics, JSON.stringify(stats));
  } catch {
    /* 저장 실패는 무시 */
  }
}

/** 이번 판 로그를 누적 통계에 반영하고 저장 */
export function recordRun(log: RiskAttempt[]): CumulativeStats {
  const merged = mergeStats(loadCumulative(), bucketize(log));
  saveCumulative(merged);
  return merged;
}
