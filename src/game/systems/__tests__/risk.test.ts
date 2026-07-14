import { beforeEach, describe, expect, it } from 'vitest';
import { computeRisk } from '../risk';
import { judgeCollapse } from '../rng';
import { tower } from '../tower';
import { BLOCKS } from '../../config/blocks';
import { BALANCE } from '../../config/balance';
import { buildRiskMods, initialEffects, neutralRiskMods } from '../modifiers';

describe('붕괴 위험 계산', () => {
  beforeEach(() => tower.reset());

  it('표시된 위험과 붕괴 판정이 같은 값을 사용한다', () => {
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.wood, 0);
    const b = computeRisk(BLOCKS.gold, 40);
    // roll이 표시 확률 바로 아래면 붕괴, 바로 위면 생존
    const below = judgeCollapse(
      b.total,
      5,
      { shieldUsed: true },
      () => b.total / 100 - 0.001,
    );
    const above = judgeCollapse(
      b.total,
      5,
      { shieldUsed: true },
      () => b.total / 100 + 0.001,
    );
    expect(below.collapsed).toBe(true);
    expect(above.collapsed).toBe(false);
  });

  it('위험은 최소·최대 범위를 벗어나지 않는다', () => {
    tower.add(BLOCKS.wood, 0);
    const extreme = computeRisk(BLOCKS.gold, 100);
    expect(extreme.total).toBeLessThanOrEqual(BALANCE.risk.clampMax);
    const safe = computeRisk(BLOCKS.foundation, 0);
    expect(safe.total).toBeGreaterThanOrEqual(BALANCE.risk.clampMin);
  });

  it('초반의 가호가 표시 요인으로 노출된다', () => {
    const b = computeRisk(BLOCKS.gold, 60); // 1층 배치
    expect(b.factors.some((f) => f.label === '초반의 가호' && f.delta < 0)).toBe(
      true,
    );
  });

  it('장인의 쐐기: 지지면 부족 위험이 배율만큼 줄어든다', () => {
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.stone, 0); // 4층 이후 = 가호 없음
    const x = 70; // 일부만 걸치는 위치
    const plain = computeRisk(BLOCKS.stone, x, neutralRiskMods());
    const fx = initialEffects();
    fx.relics.push('wedge');
    const withWedge = computeRisk(BLOCKS.stone, x, buildRiskMods(fx));
    const f = (b: typeof plain) =>
      b.factors.find((v) => v.label === '지지면 부족')?.delta ?? 0;
    expect(f(withWedge)).toBeLessThan(f(plain));
  });

  it('탐욕의 길: 평탄 위험이 더해진다', () => {
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.wood, 0);
    const fx = initialEffects();
    fx.paths.push('greed');
    const b = computeRisk(BLOCKS.wood, 0, buildRiskMods(fx));
    expect(
      b.factors.find((f) => f.label === '탐욕의 대가')?.delta,
    ).toBe(BALANCE.effects.greedFlatRisk);
  });

  it('균형 설계자: PERFECT 판정 범위가 넓어진다', () => {
    tower.add(BLOCKS.wood, 0);
    const offset = BALANCE.risk.perfectPx + 2;
    const plain = computeRisk(BLOCKS.wood, offset, neutralRiskMods());
    expect(plain.perfect).toBe(false);
    const fx = initialEffects();
    fx.paths.push('balance');
    const wide = computeRisk(BLOCKS.wood, offset, buildRiskMods(fx));
    expect(wide.perfect).toBe(true);
  });

  it('저위험 보호는 한 판에 한 번만 발동한다', () => {
    const fairness = { shieldUsed: false };
    const first = judgeCollapse(20, 5, fairness, () => 0.01);
    expect(first.collapsed).toBe(false);
    expect(first.nearMiss).toBe(true);
    const second = judgeCollapse(20, 6, fairness, () => 0.01);
    expect(second.collapsed).toBe(true);
  });
});
