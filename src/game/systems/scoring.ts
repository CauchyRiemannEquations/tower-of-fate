import type { BlockDef } from '../../types';
import { BALANCE } from '../config/balance';

/**
 * 점수 모델 — "한 층 더 vs 지금 탈출"이 기대값 문제가 되도록 설계.
 *
 * 획득 점수 = 블록 점수 × (1 + riskBoost × p)
 *          + 걸린 점수(stake) × min(oddsCap, p/(1−p)) × payoutEdge
 *
 * p/(1−p)는 붕괴 확률 p의 공정 배당률이다. payoutEdge < 1 이므로
 * 위험 배치의 스테이크 기대 손실은 (1 − payoutEdge) × p × stake:
 * 걸린 점수가 커질수록 한 층 더의 기대값이 서서히 나빠지고,
 * 어느 순간 탈출이 수학적 정답이 된다. 그 지점을 읽는 것이 실력이다.
 */

/** 붕괴 확률 p(0~1)의 배당률 — 상한이 있는 p/(1−p) */
export function riskOdds(p: number): number {
  const s = BALANCE.score;
  return Math.min(s.oddsCap, p / Math.max(0.05, 1 - p));
}

export interface GainParams {
  def: BlockDef;
  riskPct: number;
  perfect: boolean;
  /** perfect 판정 이후의 콤보 수 (이번 것 포함) */
  combo: number;
  /** 배치 시점에 탑 위에 걸려 있던 미확정 점수 */
  stake: number;
}

/** 블록 생존 시 획득 점수 */
export function computeGain({
  def,
  riskPct,
  perfect,
  combo,
  stake,
}: GainParams): number {
  const s = BALANCE.score;
  const p = riskPct / 100;

  // PERFECT 콤보는 하우스 엣지를 깎는다 (edgeCap 미만 유지)
  const edge = Math.min(
    s.edgeCap,
    s.payoutEdge + (perfect ? combo : 0) * s.comboEdgeStep,
  );

  let gained = Math.round(
    def.score * (1 + s.riskBoost * p) * (perfect ? s.perfectMult : 1),
  );
  gained += Math.round(stake * riskOdds(p) * edge);

  if (perfect) {
    gained += s.perfectFlat + Math.max(0, combo - 1) * s.comboStep;
  }
  return gained;
}

/**
 * 이 배치의 기대값 — 생존 시 gain을 얻고, 붕괴 시 stake를 잃는다.
 * 조준 중 HUD에 그대로 표시된다.
 */
export function placementEV(
  gain: number,
  riskPct: number,
  stake: number,
): number {
  const p = riskPct / 100;
  return (1 - p) * gain - p * stake;
}

/** 체크포인트에서 자동 저장되는 비율. 해당 없으면 0. */
export function checkpointFraction(floor: number): number {
  const cp = BALANCE.checkpoints;
  if (floor <= 0 || floor % cp.every !== 0) return 0;
  const idx = Math.min(cp.fractions.length - 1, floor / cp.every - 1);
  return cp.fractions[idx];
}
