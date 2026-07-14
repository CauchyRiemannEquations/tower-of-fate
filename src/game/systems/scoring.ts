import type { BlockDef } from '../../types';
import { BALANCE } from '../config/balance';

/** 고위험 생존 보너스 배율 */
export function riskMultiplier(riskPct: number): number {
  const s = BALANCE.score;
  if (riskPct >= 70) return s.mult70;
  if (riskPct >= 50) return s.mult50;
  if (riskPct >= 30) return s.mult30;
  return 1;
}

export interface GainParams {
  def: BlockDef;
  riskPct: number;
  perfect: boolean;
  combo: number; // perfect 판정 이후의 콤보 수 (이번 것 포함)
}

export function computeGain({ def, riskPct, perfect, combo }: GainParams): number {
  const s = BALANCE.score;
  let gained = Math.round(def.score * riskMultiplier(riskPct));
  if (perfect) {
    gained += s.perfectFlat + Math.max(0, combo - 1) * s.comboStep;
  }
  return gained;
}

/** 체크포인트에서 자동 저장되는 비율. 해당 없으면 0. */
export function checkpointFraction(floor: number): number {
  const cp = BALANCE.checkpoints;
  if (floor <= 0 || floor % cp.every !== 0) return 0;
  const idx = Math.min(cp.fractions.length - 1, floor / cp.every - 1);
  return cp.fractions[idx];
}
