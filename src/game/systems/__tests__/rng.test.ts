import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { FateBag, hashSeed, judgeCollapse, mulberry32, todayKey } from '../rng';

describe('시드 난수', () => {
  it('같은 시드는 같은 수열을, 다른 시드는 다른 수열을 만든다', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    const seqC = Array.from({ length: 8 }, () => c());
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('날짜 문자열 해시는 안정적이다', () => {
    expect(hashSeed('2026-08-10')).toBe(hashSeed('2026-08-10'));
    expect(hashSeed('2026-08-10')).not.toBe(hashSeed('2026-08-11'));
    expect(todayKey(new Date(2026, 7, 10))).toBe('2026-08-10');
  });
});

describe('층화 판정 난수 (FateBag)', () => {
  it('한 바퀴 안에서 각 구간을 정확히 한 번씩 사용한다', () => {
    const strata = BALANCE.risk.strata;
    const bag = new FateBag(strata, mulberry32(7));
    const rounds = 10;
    const counts = new Array<number>(strata).fill(0);
    for (let r = 0; r < rounds; r++) {
      const cycle = new Array<number>(strata).fill(0);
      for (let i = 0; i < strata; i++) {
        const v = bag.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        cycle[Math.floor(v * strata)]++;
      }
      // 바퀴마다 모든 구간이 정확히 1회
      expect(cycle).toEqual(new Array(strata).fill(1));
      cycle.forEach((c, i) => (counts[i] += c));
    }
    expect(counts).toEqual(new Array(strata).fill(rounds));
  });

  it('평균은 0.5 근처다 (균등분포 유지)', () => {
    const bag = new FateBag(BALANCE.risk.strata, mulberry32(11));
    let sum = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) sum += bag.next();
    expect(sum / n).toBeGreaterThan(0.47);
    expect(sum / n).toBeLessThan(0.53);
  });
});

describe('붕괴 판정', () => {
  it('표시 확률 경계에서 정확히 갈린다', () => {
    const at = (roll: number) =>
      judgeCollapse(40, 5, { shieldUsed: true }, () => roll);
    expect(at(0.399).collapsed).toBe(true);
    expect(at(0.401).collapsed).toBe(false);
  });

  it('저위험 보호는 한 판에 한 번만 발동한다', () => {
    const fairness = { shieldUsed: false };
    const first = judgeCollapse(20, 5, fairness, () => 0.01);
    expect(first.collapsed).toBe(false);
    expect(first.nearMiss).toBe(true);
    const second = judgeCollapse(20, 6, fairness, () => 0.01);
    expect(second.collapsed).toBe(true);
  });

  it('초반 층에서는 보호가 발동하지 않는다 (이미 가호가 있으므로)', () => {
    const fairness = { shieldUsed: false };
    const early = judgeCollapse(20, BALANCE.risk.earlyFloors, fairness, () => 0.01);
    expect(early.collapsed).toBe(true);
  });
});
