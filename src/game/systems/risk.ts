import type { BlockDef, RiskBreakdown, RiskFactor } from '../../types';
import { BALANCE } from '../config/balance';
import { tower } from './tower';

const R = BALANCE.risk;

/**
 * 배치 후보 위치 x에 블록을 놓았을 때의 붕괴 위험을 계산한다.
 * 반환되는 factors는 UI에 "왜 위험한지/안전한지"를 짧게 보여주는 용도.
 */
export function computeRisk(def: BlockDef, x: number): RiskBreakdown {
  const factors: RiskFactor[] = [];
  let total = 0;
  const add = (label: string, delta: number) => {
    if (delta === 0) return;
    factors.push({ label, delta });
    total += delta;
  };

  add('기본 위험', def.baseRisk);

  const below = tower.top();
  let perfect = false;

  if (!below) {
    // 첫 블록: 받침대 위 배치. 중심에서 벗어나면 약간 위험.
    const ratio = Math.min(1.2, Math.abs(x) / (BALANCE.design.groundWidth / 2));
    if (Math.abs(x) <= R.perfectPx) {
      perfect = true;
      add('완벽한 중심', R.perfectBonus);
    } else if (ratio > 0.25) {
      add('받침대 가장자리', Math.round(ratio * 14));
    }
  } else {
    const dx = x - below.x;
    const absDx = Math.abs(dx);
    const halfBelow = below.def.width / 2;
    const half = def.width / 2;

    // 1) 중심 치우침
    const offsetRatio = Math.min(1.4, absDx / halfBelow);
    if (absDx <= R.perfectPx) {
      perfect = true;
      add('완벽한 중심', R.perfectBonus);
    } else if (offsetRatio < 0.14) {
      add('안정된 중심', R.centeredBonus);
    } else {
      add('치우친 배치', Math.round(offsetRatio * R.offsetMax));
    }

    // 2) 접촉 면적 (겹침 비율)
    const left = Math.max(x - half, below.x - halfBelow);
    const right = Math.min(x + half, below.x + halfBelow);
    const overlap = Math.max(0, right - left);
    const overlapRatio = Math.min(1, overlap / def.width);
    if (overlapRatio < 0.995) {
      add('지지면 부족', Math.round((1 - overlapRatio) * R.supportMax));
    } else if (below.def.width >= def.width * 1.2) {
      add('넓은 지지면', R.wideSupportBonus);
    }

    // 3) 무게
    if (def.weight >= 3) {
      add('무거운 블록', def.weight * 2);
      if (below.def.width < def.width) {
        add('아래가 더 좁음', 6);
      }
    }

    // 4) 재질 조합
    if (below.def.fragile) {
      if (def.weight >= 3) add('유리가 짓눌림', 12);
      else if (def.fragile) add('유리 위 유리', 8);
    }

    // 5) 탑 전체 무게중심
    const com = tower.comX({ def, x });
    const comRatio = Math.min(1.3, Math.abs(com - (tower.blocks[0]?.x ?? 0)) / tower.baseHalfWidth());
    if (comRatio > 0.16) {
      add('탑 기울기', Math.round(comRatio * R.comMax));
    }

    // 6) 높이
    const floor = tower.blocks.length; // 지금 놓으면 floor+1층
    if (floor >= R.heightFreeFloors + 1) {
      add('아찔한 높이', Math.round((floor - R.heightFreeFloors) * R.heightPerFloor));
    }

    // 7) 기초석 안정화
    if (tower.hasStabilizerNearTop(3)) {
      add('기초석의 가호', R.foundationBonus);
    }
  }

  total = Math.max(R.clampMin, Math.min(R.clampMax, Math.round(total)));

  // UI에는 영향이 큰 요인 순으로 보여준다
  factors.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return { total, factors, perfect };
}
