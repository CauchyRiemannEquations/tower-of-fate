import type { BlockDef, RiskBreakdown, RiskFactor } from '../../types';
import { BALANCE } from '../config/balance';
import { tower } from './tower';

const R = BALANCE.risk;

interface Hazard {
  label: string;
  /** 독립 붕괴 원인의 확률 (0~1) */
  p: number;
}

interface Relief {
  label: string;
  /** 결합 위험에 곱해지는 감소율 (0~1) */
  r: number;
}

/**
 * 배치 후보 위치 x에 블록을 놓았을 때의 붕괴 위험.
 *
 * 이 함수가 반환하는 total이 그대로 붕괴 판정 확률로 쓰인다
 * (표시 확률 == 판정 확률).
 *
 * 계산 방식:
 *  ① 위험 요인을 각각 독립 원인의 확률 pᵢ로 산출
 *  ② 확률 결합 — total = 1 − ∏(1 − pᵢ)
 *  ③ 완화 요인 — total ×= (1 − r) (안정된 중심·기초석·초반의 가호 등)
 *  ④ 클램프 [clampMin, clampMax]
 *
 * UI 표시용 factors의 delta(%)는 요인별 기여분이다: 위험 요인은
 * 결합 위험을 pᵢ 비례로 배분한 값, 완화 요인은 곱해질 때 실제로
 * 줄인 값(음수)이라 delta의 합이 최종 total과 (반올림 오차 안에서)
 * 일치한다.
 */
export function computeRisk(
  def: BlockDef,
  x: number,
  fateTargetX: number | null = null,
): RiskBreakdown {
  const hazards: Hazard[] = [];
  const reliefs: Relief[] = [];
  const hazard = (label: string, p: number) => {
    if (p > 0) hazards.push({ label, p: Math.min(0.99, p) });
  };
  const relief = (label: string, r: number) => {
    if (r > 0) reliefs.push({ label, r: Math.min(0.95, r) });
  };

  const below = tower.top();
  // PERFECT는 안전한 중심이 아니라 이번 턴의 운명의 표식으로 판정한다.
  const perfect =
    fateTargetX !== null && Math.abs(x - fateTargetX) <= BALANCE.fate.targetPx;

  // 받침: 블록이 있으면 그 블록, 없으면 바닥
  const supX = below?.x ?? 0;
  const supHalf = (below ? below.def.width : BALANCE.design.groundWidth) / 2;

  hazard('블록의 불안정성', def.baseRisk / 100);

  // ① 받침 중심 치우침
  const dx = x - supX;
  const absDx = Math.abs(dx);
  const offsetRatio = Math.min(1.4, absDx / supHalf);
  if (absDx <= R.stableCenterPx) {
    relief('안정된 중심', R.stableCenterRelief);
  } else {
    hazard('치우친 배치', R.offsetMax * Math.pow(offsetRatio, R.offsetPower));
  }

  // ① 접촉 면적
  const half = def.width / 2;
  const left = Math.max(x - half, supX - supHalf);
  const right = Math.min(x + half, supX + supHalf);
  const overlapRatio = Math.min(1, Math.max(0, right - left) / def.width);
  const deficiency = 1 - overlapRatio;
  if (deficiency > 0.005) {
    hazard('지지면 부족', R.supportMax * Math.pow(deficiency, R.supportPower));
  } else if (below && below.def.width >= def.width * 1.2) {
    relief('넓은 지지면', R.wideSupportRelief);
  }

  // ① 층별 정역학 — 최악 오버행 층의 무게중심 쏠림
  const overhang = tower.worstOverhang({ def, x });
  const t = (overhang - R.statics.safeRatio) / (1 - R.statics.safeRatio);
  if (t > 0) {
    hazard('탑의 기울어짐', Math.min(R.statics.cap, R.statics.max * t * t));
  }

  // ① 무게와 재질
  if (def.weight >= 3) {
    hazard('무거운 블록', (def.weight - 2) * R.weightFactor);
  }
  if (below?.def.fragile) {
    if (def.weight >= 3) hazard('유리가 짓눌림', R.crushFragile);
    else if (def.fragile) hazard('유리 위 유리', R.glassOnGlass);
  }

  // ① 높이
  const floorsOver = tower.blocks.length - R.heightFreeFloors;
  if (floorsOver > 0) {
    hazard('아찔한 높이', floorsOver * R.heightPerFloor);
  }

  // 기초석 안정화
  if (tower.hasStabilizerNearTop(3)) {
    relief('기초석의 가호', R.foundationRelief);
  }

  // 운명의 표식 적중 — 치우친 자리의 위험 일부를 상쇄
  if (perfect) {
    relief('표식의 가호', R.fateRelief);
  }

  // 초반의 가호 — 초반 층은 위험을 크게 낮춘다 (표시 요인으로 노출)
  const placingFloor = tower.blocks.length + 1;
  if (placingFloor <= R.earlyFloors) {
    relief('초반의 가호', R.earlyRelief);
  }

  // ② 확률 결합
  let survive = 1;
  for (const h of hazards) survive *= 1 - h.p;
  const combined = 1 - survive;

  // ③ 완화 적용
  let total = combined;
  const reliefDeltas: RiskFactor[] = [];
  for (const rl of reliefs) {
    const cut = total * rl.r;
    reliefDeltas.push({ label: rl.label, delta: -Math.round(cut * 100) });
    total -= cut;
  }

  // ④ 클램프
  const totalPct = Math.max(
    R.clampMin,
    Math.min(R.clampMax, Math.round(total * 100)),
  );

  // 표시 요인: 위험 요인은 결합 위험을 pᵢ 비례로 배분
  const pSum = hazards.reduce((s, h) => s + h.p, 0);
  const factors: RiskFactor[] = [];
  if (pSum > 0) {
    for (const h of hazards) {
      const delta = Math.round(((h.p / pSum) * combined) * 100);
      if (delta !== 0) factors.push({ label: h.label, delta });
    }
  }
  for (const d of reliefDeltas) {
    if (d.delta !== 0) factors.push(d);
  }
  factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { total: totalPct, factors, perfect };
}
