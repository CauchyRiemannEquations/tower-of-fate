import { beforeEach, describe, expect, it } from 'vitest';
import { computeRisk } from '../risk';
import { judgeCollapse } from '../rng';
import { tower } from '../tower';
import { BLOCKS } from '../../config/blocks';
import { BALANCE } from '../../config/balance';

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

  it('요인이 아무리 쌓여도 확률 결합이라 100%를 넘지 않는다', () => {
    // 유리 위에 극단적으로 걸친 금괴 + 높은 탑: 덧셈이라면 100%를 훌쩍 넘는 상황
    tower.add(BLOCKS.wood, 0);
    for (let i = 0; i < 10; i++) tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.glass, 0);
    const b = computeRisk(BLOCKS.gold, 80);
    expect(b.total).toBeLessThanOrEqual(BALANCE.risk.clampMax);
    expect(b.total).toBeGreaterThan(50);
  });

  it('초반의 가호가 표시 요인으로 노출된다', () => {
    const b = computeRisk(BLOCKS.gold, 60); // 1층 배치
    expect(b.factors.some((f) => f.label === '초반의 가호' && f.delta < 0)).toBe(
      true,
    );
  });

  it('받침 중심에 맞추면 완화되고, 벗어날수록 위험이 커진다', () => {
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.stone, 0); // 4층부터 = 초반의 가호 없음
    const centered = computeRisk(BLOCKS.stone, 0);
    const slight = computeRisk(BLOCKS.stone, 24);
    const heavy = computeRisk(BLOCKS.stone, 48);
    expect(centered.factors.some((f) => f.label === '안정된 중심')).toBe(true);
    expect(centered.total).toBeLessThan(slight.total);
    expect(slight.total).toBeLessThan(heavy.total);
  });

  it('층별 정역학: 같은 방향으로 밀린 탑 위의 추가 오버행이 위험을 키운다', () => {
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.stone, 20);
    tower.add(BLOCKS.stone, 40);
    tower.add(BLOCKS.stone, 55);
    // 받침(x=55) 기준 같은 오프셋이라도, 쏠린 방향으로 더 내밀면
    // 부분탑 무게중심이 받침 가장자리에 가까워져 위험이 커야 한다
    const inward = computeRisk(BLOCKS.stone, 55 - 30);
    const outward = computeRisk(BLOCKS.stone, 55 + 30);
    expect(outward.total).toBeGreaterThan(inward.total);
    expect(
      outward.factors.some((f) => f.label === '탑의 기울어짐' && f.delta > 0),
    ).toBe(true);
  });

  it('worstOverhang: 정렬된 탑은 0, 무게중심이 받침 가장자리를 넘으면 1 이상', () => {
    tower.add(BLOCKS.wood, 0);
    expect(tower.worstOverhang()).toBeCloseTo(0, 5);
    // 나무판(반폭 75) 위에 완전히 가장자리 밖으로 무게중심이 나가는 돌
    tower.add(BLOCKS.stone, 90);
    expect(tower.worstOverhang()).toBeGreaterThanOrEqual(1);
  });

  it('표시 요인 기여분의 합이 최종 위험과 일치한다 (반올림 오차 이내)', () => {
    tower.add(BLOCKS.wood, 0);
    tower.add(BLOCKS.stone, 0);
    tower.add(BLOCKS.stone, 10);
    tower.add(BLOCKS.glass, 18);
    const b = computeRisk(BLOCKS.gold, 52);
    const sum = b.factors.reduce((s, f) => s + f.delta, 0);
    expect(Math.abs(sum - b.total)).toBeLessThanOrEqual(b.factors.length);
  });

  it('안전한 중심과 운명의 표식 PERFECT는 서로 다른 판정이다', () => {
    tower.add(BLOCKS.wood, 0);
    const target = 30;
    const center = computeRisk(BLOCKS.wood, 0, target);
    const hit = computeRisk(BLOCKS.wood, target, target);
    expect(center.perfect).toBe(false);
    expect(hit.perfect).toBe(true);
    expect(center.total).toBeLessThanOrEqual(hit.total);
  });
});
