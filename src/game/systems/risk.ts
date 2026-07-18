import type { BlockDef, RiskBreakdown, RiskFactor } from '../../types';
import { BALANCE } from '../config/balance';
import { tower } from './tower';
import { neutralRiskMods, type RiskMods } from './modifiers';

const R = BALANCE.risk;

/** 탑 중심 기준 배치 방향 (-1: 왼쪽, 0: 중앙, 1: 오른쪽) */
export function placementSide(x: number): -1 | 0 | 1 {
  const center = tower.blocks[0]?.x ?? 0;
  const dx = x - center;
  if (Math.abs(dx) <= 4) return 0;
  return dx > 0 ? 1 : -1;
}

/**
 * 배치 후보 위치 x에 블록을 놓았을 때의 붕괴 위험.
 *
 * 이 함수가 반환하는 total이 그대로 붕괴 판정 확률로 쓰인다
 * (표시 확률 == 판정 확률). 수정자 적용 순서:
 *  ① 요인별 위험 산출(배율 적용) → ② 평탄 증감 → ③ 초반의 가호 → ④ 클램프
 */
export function computeRisk(
  def: BlockDef,
  x: number,
  mods: RiskMods = neutralRiskMods(),
  fateTargetX: number | null = null,
): RiskBreakdown {
  const factors: RiskFactor[] = [];
  let total = 0;
  const add = (label: string, delta: number) => {
    if (delta === 0) return;
    factors.push({ label, delta });
    total += delta;
  };

  add('기본 위험', def.baseRisk);

  const below = tower.top();
  // PERFECT는 안전한 중심이 아니라 이번 턴의 운명의 표식으로 판정한다.
  const perfect =
    fateTargetX !== null && Math.abs(x - fateTargetX) <= mods.perfectPx;

  if (!below) {
    // 첫 블록: 받침대 위 배치
    const ratio = Math.min(1.2, Math.abs(x) / (BALANCE.design.groundWidth / 2));
    if (Math.abs(x) <= R.stableCenterPx) {
      add('안정적인 중심', R.stableCenterBonus);
    } else if (ratio > 0.25) {
      add('받침대 가장자리', Math.round(ratio * 14));
    }
  } else {
    const dx = x - below.x;
    const absDx = Math.abs(dx);
    const halfBelow = below.def.width / 2;
    const half = def.width / 2;

    // ① 중심 치우침
    const offsetRatio = Math.min(1.4, absDx / halfBelow);
    if (absDx <= R.stableCenterPx) {
      add('안정적인 중심', R.stableCenterBonus);
    } else if (offsetRatio < 0.14) {
      add('안정된 중심', R.centeredBonus);
    } else {
      add('치우친 배치', Math.round(offsetRatio * R.offsetMax));
    }

    // ① 접촉 면적
    const left = Math.max(x - half, below.x - halfBelow);
    const right = Math.min(x + half, below.x + halfBelow);
    const overlap = Math.max(0, right - left);
    const overlapRatio = Math.min(1, overlap / def.width);
    if (overlapRatio < 0.995) {
      add(
        '지지면 부족',
        Math.round((1 - overlapRatio) * R.supportMax * mods.supportScale),
      );
    } else if (below.def.width >= def.width * 1.2) {
      add('넓은 지지면', R.wideSupportBonus);
    }

    // ① 무게
    if (def.weight >= 3) {
      add('무거운 블록', def.weight * 2);
      if (below.def.width < def.width) {
        add('아래가 더 좁음', 6);
      }
    }

    // ① 재질 조합
    if (below.def.fragile) {
      if (def.weight >= 3) add('유리가 짓눌림', 12);
      else if (def.fragile) add('유리 위 유리', 8 + mods.glassOnGlassExtra);
    }

    // ① 탑 전체 무게중심 (배율 적용)
    const com = tower.comX({ def, x });
    const comRatio = Math.min(
      1.3,
      Math.abs(com - (tower.blocks[0]?.x ?? 0)) / tower.baseHalfWidth(),
    );
    if (comRatio > 0.16) {
      add('탑 기울기', Math.round(comRatio * R.comMax * mods.comScale));
    }

    // ① 높이
    const floorBelow = tower.blocks.length;
    if (floorBelow >= R.heightFreeFloors + 1) {
      add(
        '아찔한 높이',
        Math.round((floorBelow - R.heightFreeFloors) * R.heightPerFloor),
      );
    }

    // ① 기초석 안정화
    if (tower.hasStabilizerNearTop(3)) {
      add('기초석의 가호', R.foundationBonus);
    }
  }

  // ② 평탄 증감
  if (mods.flatDelta !== 0) add('탐욕의 대가', mods.flatDelta);

  const side = placementSide(x);
  if (
    mods.oppositeSideBonus !== 0 &&
    side !== 0 &&
    mods.prevSide !== 0 &&
    side === -mods.prevSide
  ) {
    add('균형의 저울', mods.oppositeSideBonus);
  }

  if (mods.highValueCut > 0 && (def.fragile || def.id === 'gold')) {
    add('계약의 가호', -mods.highValueCut);
  }

  // ③ 초반의 가호 — 초반 층은 위험을 크게 낮춘다 (표시 요인으로 노출)
  const placingFloor = tower.blocks.length + 1;
  if (placingFloor <= R.earlyFloors && total > R.clampMin) {
    const grace = Math.round(total * (1 - R.earlyFactor));
    if (grace > 0) add('초반의 가호', -grace);
  }

  // ④ 클램프
  total = Math.max(R.clampMin, Math.min(R.clampMax, Math.round(total)));

  factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { total, factors, perfect };
}
