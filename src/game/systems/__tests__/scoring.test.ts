import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { BLOCKS } from '../../config/blocks';
import {
  checkpointFraction,
  computeGain,
  placementEV,
  riskOdds,
} from '../scoring';

describe('기댓값 기반 점수', () => {
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

  it('문턱 이하의 안전 배치에는 스테이크 배당이 없다', () => {
    const floor = BALANCE.score.stakeRiskFloor;
    expect(riskOdds(floor)).toBe(0);
    expect(riskOdds(floor - 0.03)).toBe(0);
    expect(riskOdds(floor + 0.1)).toBeGreaterThan(0);
    expect(riskOdds(0.99)).toBe(BALANCE.score.oddsCap);
    // 안전 배치의 획득 점수는 걸린 점수와 무관하다
    const gain = (stake: number) =>
      computeGain({
        def: BLOCKS.wood,
        riskPct: floor * 100 - 2,
        perfect: false,
        combo: 0,
        stake,
      });
    expect(gain(1000)).toBe(gain(0));
  });

  it('안전 반복 쌓기는 걸린 점수가 커지면 기댓값 마이너스가 된다', () => {
    const riskPct = 6; // 전형적인 중앙 배치 위험
    const ev = (stake: number) => {
      const gain = computeGain({
        def: BLOCKS.wood,
        riskPct,
        perfect: false,
        combo: 0,
        stake,
      });
      return placementEV(gain, riskPct, stake);
    };
    expect(ev(0)).toBeGreaterThan(0);
    expect(ev(500)).toBeLessThan(0);
  });

  it('걸린 점수가 커질수록 같은 배치의 기댓값이 나빠진다', () => {
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
