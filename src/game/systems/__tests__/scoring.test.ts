import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { BLOCKS } from '../../config/blocks';
import { computeGain, riskMultiplier } from '../scoring';

describe('위험 보상 점수', () => {
  it('각 위험 구간의 생존 기대 배율이 1보다 크다', () => {
    expect(0.7 * riskMultiplier(30)).toBeGreaterThan(1);
    expect(0.5 * riskMultiplier(50)).toBeGreaterThan(1);
    expect(0.3 * riskMultiplier(70)).toBeGreaterThan(1);
  });

  it('운명의 표식 연속 적중은 PERFECT 콤보를 누적한다', () => {
    const first = computeGain({
      def: BLOCKS.wood,
      riskPct: 10,
      perfect: true,
      combo: 1,
      side: -1,
    });
    const third = computeGain({
      def: BLOCKS.wood,
      riskPct: 10,
      perfect: true,
      combo: 3,
      side: 1,
    });
    expect(first).toBe(BLOCKS.wood.score + BALANCE.score.perfectFlat);
    expect(third - first).toBe(BALANCE.score.comboStep * 2);
  });
});
