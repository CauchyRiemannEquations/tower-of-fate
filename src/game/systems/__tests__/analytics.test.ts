import { beforeEach, describe, expect, it } from 'vitest';
import {
  bucketOf,
  bucketize,
  emptyStats,
  lastDecisionEV,
  loadCumulative,
  mergeStats,
  recordRun,
  survivedStreakProb,
} from '../analytics';
import type { RiskAttempt } from '../../../types';

function attempt(risk: number, survived = true, gained = 10): RiskAttempt {
  return { floor: 1, risk, survived, gained };
}

// Node 환경용 localStorage 대체
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

beforeEach(() => {
  (globalThis as { localStorage?: unknown }).localStorage =
    new MemoryStorage();
});

describe('운명 분석서', () => {
  it('위험 구간 경계가 정확하다', () => {
    expect(bucketOf(0)).toBe('b0');
    expect(bucketOf(19)).toBe('b0');
    expect(bucketOf(20)).toBe('b20');
    expect(bucketOf(39)).toBe('b20');
    expect(bucketOf(40)).toBe('b40');
    expect(bucketOf(59)).toBe('b40');
    expect(bucketOf(60)).toBe('b60');
    expect(bucketOf(95)).toBe('b60');
  });

  it('연속 생존 확률 = (1-위험)의 곱', () => {
    const log = [attempt(20), attempt(35), attempt(48)];
    expect(survivedStreakProb(log)).toBeCloseTo(0.8 * 0.65 * 0.52, 10);
  });

  it('붕괴한 시도는 연속 생존 확률에서 제외된다', () => {
    const log = [attempt(20), attempt(50, false)];
    expect(survivedStreakProb(log)).toBeCloseTo(0.8, 10);
  });

  it('구간별 통계가 정확하다', () => {
    const log = [
      attempt(10),
      attempt(15, false),
      attempt(45),
      attempt(70, false),
    ];
    const s = bucketize(log);
    expect(s.b0).toEqual({ attempts: 2, survived: 1, riskSum: 25 });
    expect(s.b40).toEqual({ attempts: 1, survived: 1, riskSum: 45 });
    expect(s.b60).toEqual({ attempts: 1, survived: 0, riskSum: 70 });
    expect(s.b20.attempts).toBe(0);
  });

  it('누적 저장과 불러오기가 정상 동작한다', () => {
    recordRun([attempt(10), attempt(45)]);
    recordRun([attempt(12, false)]);
    const cum = loadCumulative();
    expect(cum.b0.attempts).toBe(2);
    expect(cum.b0.survived).toBe(1);
    expect(cum.b40.attempts).toBe(1);
  });

  it('mergeStats는 두 통계를 더한다', () => {
    const a = emptyStats();
    a.b60 = { attempts: 2, survived: 1, riskSum: 130 };
    const b = emptyStats();
    b.b60 = { attempts: 1, survived: 1, riskSum: 65 };
    const m = mergeStats(a, b);
    expect(m.b60).toEqual({ attempts: 3, survived: 2, riskSum: 195 });
  });

  it('마지막 결정의 기대값이 정의대로 계산된다', () => {
    const log = [attempt(40, true, 50)];
    const ev = lastDecisionEV(log, 200);
    expect(ev).not.toBeNull();
    expect(ev!.successProb).toBeCloseTo(0.6, 10);
    expect(ev!.evContinue).toBeCloseTo(250 * 0.6, 10);
    expect(ev!.evStop).toBe(200);
  });
});
