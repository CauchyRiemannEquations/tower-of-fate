import type { PathId, RelicId } from '../../types';
import { BALANCE } from '../config/balance';

/**
 * 길·유물·계약 보상이 위험/점수 계산에 미치는 효과를
 * 하나의 수정자(Mods) 객체로 모아 순수 함수로 만든다.
 *
 * 적용 순서 (risk.ts에서 보장):
 *  ① 요인별 위험 산출 — 배율(comScale, supportScale) 적용
 *  ② 평탄 증감 — flatDelta, oppositeSideBonus, highValueCut
 *  ③ 초반의 가호 — 비율 감소 (표시 요인으로 노출)
 *  ④ 클램프 [clampMin, clampMax]
 */

export interface RiskMods {
  /** 매 배치 평탄 위험 증가 (탐욕의 길) */
  flatDelta: number;
  /** 무게중심(기울기) 위험 배율 */
  comScale: number;
  /** 지지면 부족 위험 배율 */
  supportScale: number;
  /** 직전 배치의 반대편에 놓을 때 위험 증감 (균형의 저울) */
  oppositeSideBonus: number;
  /** 직전 배치가 탑 중심 기준 어느 쪽이었는지 (-1/0/1) */
  prevSide: -1 | 0 | 1;
  /** PERFECT 판정 픽셀 범위 */
  perfectPx: number;
  /** 다음 유리/금괴 배치 위험 감소 (정밀공학자 보상, 1회성) */
  highValueCut: number;
  /** 유리 위 유리 추가 위험 (유리 장인의 대가) */
  glassOnGlassExtra: number;
}

export interface ScoreMods {
  /** 기본 점수 배율 (안정의 길) */
  scoreScale: number;
  /** 30%+ 생존 배율 추가 */
  riskMultBonus: number;
  /** 50%+ 생존 배율 추가 (도박사의 주사위) */
  diceBonus: number;
  /** PERFECT 콤보 단계당 보너스 */
  comboStep: number;
  /** 좌우 교차 배치 점수 보너스 사용 여부 (균형 설계자) */
  alternateBonus: boolean;
  prevSide: -1 | 0 | 1;
  /** 유리 연속 체인 사용 여부와 현재 연속 수 (유리 장인) */
  glassChainOn: boolean;
  glassStreak: number;
}

/** 한 판 동안 유지되는 효과 상태 — actions가 소유하고 여기서 해석한다 */
export interface RunEffects {
  paths: PathId[];
  relics: RelicId[];
  /** 기울기 위험 감소 버프 남은 배치 수 (균형/대칭 계약 보상) */
  buffTiltTurns: number;
  /** 생존 배율 보너스 버프 남은 배치 수 (탐욕 계약 보상) */
  buffGreedTurns: number;
  /** 다음 유리/금괴 위험 감소 대기 중 (정밀공학자 계약 보상) */
  buffHighValueCut: boolean;
  /** 직전 배치의 탑 중심 기준 방향 */
  prevSide: -1 | 0 | 1;
  /** 현재 유리 연속 배치 수 */
  glassStreak: number;
}

export function initialEffects(): RunEffects {
  return {
    paths: [],
    relics: [],
    buffTiltTurns: 0,
    buffGreedTurns: 0,
    buffHighValueCut: false,
    prevSide: 0,
    glassStreak: 0,
  };
}

const E = BALANCE.effects;

export function buildRiskMods(fx: RunEffects): RiskMods {
  const has = (r: RelicId) => fx.relics.includes(r);
  const onPath = (p: PathId) => fx.paths.includes(p);

  return {
    flatDelta: onPath('greed') ? E.greedFlatRisk : 0,
    comScale: fx.buffTiltTurns > 0 ? E.buffTiltScale : 1,
    supportScale: has('wedge') ? E.wedgeSupportScale : 1,
    oppositeSideBonus: has('scales') ? E.scalesOppositeBonus : 0,
    prevSide: fx.prevSide,
    perfectPx:
      BALANCE.risk.perfectPx + (onPath('balance') ? E.balancePerfectPx : 0),
    highValueCut: fx.buffHighValueCut ? E.buffHighValueCut : 0,
    glassOnGlassExtra: onPath('glass') ? E.glassOnGlassExtra : 0,
  };
}

export function buildScoreMods(fx: RunEffects): ScoreMods {
  const has = (r: RelicId) => fx.relics.includes(r);
  const onPath = (p: PathId) => fx.paths.includes(p);

  return {
    scoreScale: onPath('stable') ? E.stableScoreScale : 1,
    riskMultBonus:
      (onPath('greed') ? E.greedMultBonus : 0) +
      (fx.buffGreedTurns > 0 ? E.buffGreedMult : 0),
    diceBonus: has('dice') ? E.diceMultBonus : 0,
    comboStep: BALANCE.score.comboStep,
    alternateBonus: onPath('balance'),
    prevSide: fx.prevSide,
    glassChainOn: onPath('glass'),
    glassStreak: fx.glassStreak,
  };
}

export function neutralRiskMods(): RiskMods {
  return buildRiskMods(initialEffects());
}

export function neutralScoreMods(): ScoreMods {
  return buildScoreMods(initialEffects());
}
