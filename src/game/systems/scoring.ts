import type { BlockDef } from '../../types';
import { BALANCE } from '../config/balance';
import { neutralScoreMods, type ScoreMods } from './modifiers';

/** 고위험 생존 보너스 기본 배율 */
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
  /** perfect 판정 이후의 콤보 수 (이번 것 포함) */
  combo: number;
  /** 이번 배치의 탑 중심 기준 방향 */
  side: -1 | 0 | 1;
  mods?: ScoreMods;
}

/**
 * 블록 생존 시 획득 점수.
 * 배율 적용 순서: 기본 위험 배율 + 보너스 배율 → 기본 점수 배율(scoreScale)
 * → 유리 체인 → 교차 배치 보너스 → PERFECT/콤보 평탄 가산.
 */
export function computeGain({
  def,
  riskPct,
  perfect,
  combo,
  side,
  mods = neutralScoreMods(),
}: GainParams): number {
  const s = BALANCE.score;
  const E = BALANCE.effects;

  let mult = riskMultiplier(riskPct);
  if (riskPct >= 30) mult += mods.riskMultBonus;
  if (riskPct >= 50) mult += mods.diceBonus;

  let gained = Math.round(def.score * mult * mods.scoreScale);

  // 유리 장인: 유리 연속 체인 (직전까지의 연속 수 기준, 최대 제한)
  if (mods.glassChainOn && def.fragile && mods.glassStreak >= 1) {
    const chain = Math.min(mods.glassStreak, E.glassChainMax);
    gained = Math.round(gained * (1 + E.glassChainStep * chain));
  }

  // 균형 설계자: 좌우 교차 배치 보너스
  if (
    mods.alternateBonus &&
    side !== 0 &&
    mods.prevSide !== 0 &&
    side === -mods.prevSide
  ) {
    gained = Math.round(gained * (1 + E.alternateScoreBonus));
  }

  if (perfect) {
    gained += s.perfectFlat + Math.max(0, combo - 1) * mods.comboStep;
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
