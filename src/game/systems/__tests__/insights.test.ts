import { describe, expect, it } from 'vitest';
import type { GameOverInfo, RiskAttempt, RunStats } from '../../../types';
import { readRun } from '../insights';

function stats(over: Partial<RunStats> = {}): RunStats {
  return {
    perfects: 0,
    luckies: 0,
    nearMisses: 0,
    maxRiskSurvived: 0,
    maxFloor: 0,
    blockCounts: { wood: 0, stone: 0, glass: 0, gold: 0, foundation: 0 },
    ...over,
  };
}

function info(over: Partial<GameOverInfo> = {}): GameOverInfo {
  return { escaped: true, finalScore: 100, newBest: false, towerAtStake: 0, ...over };
}

function attempt(over: Partial<RiskAttempt> = {}): RiskAttempt {
  return { floor: 1, risk: 10, survived: true, gained: 20, ...over };
}

describe('운명의 회고', () => {
  it('로그가 없으면 회고도 없다', () => {
    expect(readRun([], stats(), info())).toBeNull();
  });

  it('저위험 붕괴는 불운을, 고위험 붕괴는 도전을 이야기한다', () => {
    const lowRisk = readRun(
      [attempt(), attempt({ risk: 8, survived: false })],
      stats(),
      info({ escaped: false }),
    );
    expect(lowRisk!.line).toContain('불운');

    const highRisk = readRun(
      [attempt(), attempt({ risk: 55, survived: false })],
      stats(),
      info({ escaped: false }),
    );
    expect(highRisk!.line).toContain('55%');
  });

  it('기대값이 음수인 시점의 탈출에는 수학자의 탈출 칭호가 붙는다', () => {
    // 마지막 시도: 위험 40%, 획득 30 → 계속 기대값 (500+30)×0.6=318 < 멈춤 500
    const log = [
      attempt(),
      attempt({ risk: 40, gained: 30, survived: true }),
    ];
    const r = readRun(log, stats(), info({ towerAtStake: 500 }));
    expect(r!.titles.some((t) => t.id === 'mathematician')).toBe(true);
    expect(r!.line).toContain('수학');
  });

  it('아직 기대값이 남은 이른 탈출은 다르게 회고한다', () => {
    // 위험 10%, 획득 100 → 계속 기대값 (50+100)×0.9=135 > 멈춤 50
    const log = [attempt({ risk: 10, gained: 100 })];
    const r = readRun(log, stats(), info({ towerAtStake: 50 }));
    expect(r!.titles.some((t) => t.id === 'mathematician')).toBe(false);
    expect(r!.line).toContain('기대값');
  });

  it('희박한 확률을 뚫으면 기적의 생존자, 고위험 생존은 강철 심장', () => {
    // (1-0.55)^4 ≈ 4.1% < 5%
    const log = Array.from({ length: 4 }, () =>
      attempt({ risk: 55, survived: true }),
    );
    const r = readRun(
      log,
      stats({ maxRiskSurvived: 55 }),
      info({ towerAtStake: 0 }),
    );
    const ids = r!.titles.map((t) => t.id);
    expect(ids).toContain('miracle');
  });

  it('칭호는 최대 3개까지만 붙는다', () => {
    const log = Array.from({ length: 12 }, (_, i) =>
      attempt({ floor: i + 1, risk: 65, survived: true }),
    );
    const r = readRun(
      log,
      stats({ maxRiskSurvived: 65, perfects: 5, maxFloor: 12 }),
      info({ towerAtStake: 0 }),
    );
    expect(r!.titles.length).toBeLessThanOrEqual(3);
  });
});
