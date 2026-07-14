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
 * 붕괴 판정. 표시 확률과 크게 어긋나지 않는 선에서
 * 초반 완충과 1회 저위험 보호 장치를 둔다.
 */
export function judgeCollapse(
  riskPct: number,
  floor: number,
  fairness: FairnessState,
): JudgeOutcome {
  let effective = riskPct / 100;
  if (floor <= BALANCE.risk.earlyFloors) {
    effective *= BALANCE.risk.earlyFactor;
  }

  const roll = Math.random();

  if (roll < effective) {
    // 저위험 억울사 방지: 게임당 1회, 낮은 위험에서의 붕괴는 아슬아슬 생존으로 전환
    if (!fairness.shieldUsed && riskPct < BALANCE.risk.shieldBelow && floor > BALANCE.risk.earlyFloors) {
      fairness.shieldUsed = true;
      return { collapsed: false, nearMiss: true, roll, effective };
    }
    return { collapsed: true, nearMiss: false, roll, effective };
  }

  // 간발의 차로 생존 → 연출용 니어미스
  const nearMiss = riskPct >= 30 && roll < effective + 0.05;
  return { collapsed: false, nearMiss, roll, effective };
}
