import type { BlockDef } from '../../types';
import { BALANCE } from '../config/balance';

/**
 * 점수 모델 — "한 층 더 vs 지금 탈출"이 기댓값 문제가 되도록 설계.
 *
 * 획득 점수 = 블록 점수 × (1 + riskBoost × p)
 *          + 걸린 점수(stake) × riskOdds(p) × payoutEdge
 *
 * riskOdds는 stakeRiskFloor를 넘는 초과 위험의 배당률이다:
 * 저위험(중앙) 배치는 블록 점수만 얻고 스테이크는 불리지 못하므로,
 * 걸린 점수가 커질수록 안전 반복 쌓기는 명백히 기댓값 마이너스가
 * 된다. 점수를 불리려면 문턱 위의 진짜 베팅이 필요하고,
 * payoutEdge(< 1)의 하우스 엣지 때문에 그 베팅도 언젠가는 멈춰야
 * 한다. 그 지점을 읽는 것이 실력이다.
 */

/**
 * 붕괴 확률 p(0~1)의 스테이크 배당률.
 * stakeRiskFloor 이하의 위험에는 배당이 없다 — 안전한 배치는
 * 스테이크를 불리지 못하므로, 걸린 점수를 키우려면 진짜 위험을
 * 감수해야 한다. 문턱을 넘는 초과 위험에만 배당이 붙는다.
 */
export function riskOdds(p: number): number {
  const s = BALANCE.score;
  const excess = Math.max(0, p - s.stakeRiskFloor);
  return Math.min(s.oddsCap, excess / Math.max(0.05, 1 - p));
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
 * 이 배치의 기댓값 — 생존 시 gain을 얻고, 붕괴 시 stake를 잃는다.
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
