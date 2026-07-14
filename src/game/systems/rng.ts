import { BALANCE } from '../config/balance';

export interface JudgeOutcome {
  collapsed: boolean;
  /** 붕괴할 뻔했으나 보호/간발 차이로 살아남음 */
  nearMiss: boolean;
  roll: number;
  effective: number;
}

export interface FairnessState {
  shieldUsed: boolean;
}

/**
 * 붕괴 판정. riskPct는 computeRisk가 표시한 값 그대로이며
 * 여기서 추가 보정 없이 동일한 확률로 판정한다.
 * (초반 완충은 computeRisk의 "초반의 가호" 요인으로 이미 반영됨)
 *
 * 유일한 예외는 저위험 억울사 1회 보호로, 발동 시 붕괴가
 * "아슬아슬 생존"으로 전환되며 니어미스 연출로 명확히 드러난다.
 */
export function judgeCollapse(
  riskPct: number,
  floor: number,
  fairness: FairnessState,
  rng: () => number = Math.random,
): JudgeOutcome {
  const effective = riskPct / 100;
  const roll = rng();

  if (roll < effective) {
    if (
      !fairness.shieldUsed &&
      riskPct < BALANCE.risk.shieldBelow &&
      floor > BALANCE.risk.earlyFloors
    ) {
      fairness.shieldUsed = true;
      return { collapsed: false, nearMiss: true, roll, effective };
    }
    return { collapsed: true, nearMiss: false, roll, effective };
  }

  const nearMiss = riskPct >= 30 && roll < effective + 0.05;
  return { collapsed: false, nearMiss, roll, effective };
}
