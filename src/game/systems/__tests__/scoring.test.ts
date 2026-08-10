import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { BLOCKS } from '../../config/blocks';
import {
  checkpointFraction,
  computeGain,
  placementEV,
  riskOdds,
} from '../scoring';

describe('기대값 기반 점수', () => {
  it('위험이 높을수록 성공 보상이 커진다', () => {
    const at = (riskPct: number) =>
      computeGain({
        def: BLOCKS.gold,
        riskPct,
        perfect: false,
        combo: 0,
        stake: 200,
      });
    expect(at(10)).toBeLessThan(at(30));
    expect(at(30)).toBeLessThan(at(60));
    expect(at(60)).toBeLessThan(at(85));
  });

  it('배당률은 공정 배당 p/(1−p)이며 상한이 있다', () => {
    expect(riskOdds(0.5)).toBeCloseTo(1, 5);
    expect(riskOdds(0.7)).toBeCloseTo(0.7 / 0.3, 5);
    expect(riskOdds(0.99)).toBe(BALANCE.score.oddsCap);
  });

  it('스테이크 배당의 기대 손실은 (1−엣지)×p×stake 다', () => {
    const p = 0.4;
    const stake = 500;
    const base = computeGain({
      def: BLOCKS.wood,
      riskPct: p * 100,
      perfect: false,
      combo: 0,
      stake: 0,
    });
    const withStake = computeGain({
      def: BLOCKS.wood,
      riskPct: p * 100,
      perfect: false,
      combo: 0,
      stake,
    });
    const evDrop =
      placementEV(withStake, p * 100, stake) - placementEV(base, p * 100, 0);
    const expected = -(1 - BALANCE.score.payoutEdge) * p * stake;
    expect(evDrop).toBeCloseTo(expected, 0);
  });

  it('걸린 점수가 커질수록 같은 배치의 기대값이 나빠진다', () => {
    const ev = (stake: number) => {
      const gain = computeGain({
        def: BLOCKS.gold,
        riskPct: 40,
        perfect: false,
        combo: 0,
        stake,
      });
      return placementEV(gain, 40, stake);
    };
    expect(ev(0)).toBeGreaterThan(0);
    expect(ev(100)).toBeGreaterThan(ev(600));
    expect(ev(600)).toBeGreaterThan(ev(3000));
    // 어느 지점부터는 탈출이 수학적 정답이 된다
    expect(ev(3000)).toBeLessThan(0);
  });

  it('운명의 표식 연속 적중은 PERFECT 콤보를 누적한다', () => {
    const gain = (combo: number) =>
      computeGain({
        def: BLOCKS.wood,
        riskPct: 10,
        perfect: true,
        combo,
        stake: 0,
      });
    expect(gain(3) - gain(1)).toBe(BALANCE.score.comboStep * 2);
  });

  it('체크포인트 저장 비율은 5층마다 계단식으로 오른다', () => {
    expect(checkpointFraction(4)).toBe(0);
    expect(checkpointFraction(5)).toBe(BALANCE.checkpoints.fractions[0]);
    expect(checkpointFraction(10)).toBe(BALANCE.checkpoints.fractions[1]);
    expect(checkpointFraction(15)).toBe(BALANCE.checkpoints.fractions[2]);
    expect(checkpointFraction(25)).toBe(BALANCE.checkpoints.fractions[2]);
  });
});
