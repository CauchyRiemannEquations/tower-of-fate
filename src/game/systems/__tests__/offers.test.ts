import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { BLOCKS } from '../../config/blocks';
import { mulberry32 } from '../rng';
import { drawOffers, weightedPick } from '../offers';

describe('블록 선택지 추첨', () => {
  it('항상 유효한 블록 3개를 준다', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) {
      const offers = drawOffers(rng);
      expect(offers).toHaveLength(3);
      for (const id of offers) expect(BLOCKS[id]).toBeDefined();
    }
  });

  it('세 개가 전부 같은 종류로 나오는 것을 피한다', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 500; i++) {
      const offers = drawOffers(rng);
      expect(offers.every((c) => c === offers[0])).toBe(false);
    }
  });

  it('첫 손패 보장: 안전 블록이 없으면 채워 넣는다', () => {
    // 0.6은 언제나 유리 왕관을 뽑는 값 — 보장이 없으면 [glass, glass, glass]
    const alwaysGlass = () => 0.6;
    const offers = drawOffers(alwaysGlass, { guaranteeSafe: true });
    expect(offers.some((c) => c === 'wood' || c === 'foundation')).toBe(true);
  });

  it('출현 비율이 설정된 가중치를 따른다', () => {
    const rng = mulberry32(2);
    const weights = BALANCE.offers.weights;
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    const n = 33000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const id = weightedPick(rng);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    for (const [id, w] of Object.entries(weights)) {
      const expected = (w / total) * n;
      expect(Math.abs((counts[id] ?? 0) - expected)).toBeLessThan(expected * 0.08);
    }
  });
});
