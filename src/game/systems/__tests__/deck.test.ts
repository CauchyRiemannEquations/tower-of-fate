import { describe, expect, it } from 'vitest';
import {
  addCards,
  buildInitialDeck,
  deckView,
  discardCards,
  drawHand,
  type DeckState,
} from '../deck';
import { BALANCE } from '../../config/balance';
import type { BlockTypeId } from '../../../types';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const totalComposition = Object.values(BALANCE.deck.composition).reduce(
  (a, b) => a + b,
  0,
);

function countAll(deck: DeckState): number {
  return deck.drawPile.length + deck.discardPile.length;
}

describe('운명 덱', () => {
  it('초기 덱 카드 수가 구성표와 일치한다', () => {
    const deck = buildInitialDeck(seq([0.5]));
    expect(deck.drawPile.length).toBe(totalComposition);
    expect(deck.discardPile.length).toBe(0);
    const view = deckView(deck);
    for (const [id, count] of Object.entries(BALANCE.deck.composition)) {
      expect(view.remainingByType[id as BlockTypeId]).toBe(count);
    }
  });

  it('3장 드로우 시 드로우 더미가 정확히 줄어든다', () => {
    const deck = buildInitialDeck(seq([0.5]));
    const hand = drawHand(deck, seq([0.5]));
    expect(hand).toHaveLength(3);
    expect(deck.drawPile.length).toBe(totalComposition - 3);
  });

  it('선택되지 않은 카드는 버림 더미로 이동한다', () => {
    const deck = buildInitialDeck(seq([0.5]));
    const hand = drawHand(deck, seq([0.5]));
    discardCards(deck, [hand[1], hand[2]]);
    expect(deck.discardPile).toEqual([hand[1], hand[2]]);
    // 배치된 카드(hand[0])는 어디에도 없다 — 총량 = 전체 - 1
    expect(countAll(deck)).toBe(totalComposition - 1);
  });

  it('덱 소진 시 버림 더미를 다시 섞어 사용한다', () => {
    const deck: DeckState = {
      drawPile: ['wood'],
      discardPile: ['gold', 'stone', 'glass'],
    };
    const hand = drawHand(deck, seq([0.1, 0.6, 0.3]));
    expect(hand).toHaveLength(3);
    expect(deck.discardPile).toHaveLength(0);
    // 총 4장 중 3장 드로우 → 1장 남음
    expect(deck.drawPile).toHaveLength(1);
  });

  it('덱과 버림이 모두 비면 비상 카드로 채운다', () => {
    const deck: DeckState = { drawPile: [], discardPile: [] };
    const hand = drawHand(deck, seq([0.5]));
    expect(hand).toEqual(['wood', 'wood', 'wood']);
  });

  it('안전 보장 드로우는 카드 총량을 바꾸지 않는다', () => {
    // 손패가 전부 위험 블록이 되도록 구성
    const deck: DeckState = {
      drawPile: ['wood', 'gold', 'glass', 'gold'],
      discardPile: [],
    };
    const before = countAll(deck) ;
    const hand = drawHand(deck, seq([0.5]), { guaranteeSafe: true });
    expect(hand).toHaveLength(3);
    expect(hand.some((c) => c === 'wood' || c === 'foundation')).toBe(true);
    expect(countAll(deck) + hand.length).toBe(before);
  });

  it('덱 표시가 실제 상태와 일치한다', () => {
    const deck: DeckState = {
      drawPile: ['wood', 'wood', 'gold'],
      discardPile: ['stone'],
    };
    const view = deckView(deck, 2);
    expect(view.drawCount).toBe(3);
    expect(view.discardCount).toBe(1);
    expect(view.remainingByType.wood).toBe(2);
    expect(view.remainingByType.gold).toBe(1);
    // 미리보기는 덱 맨 위(배열 끝)부터
    expect(view.upcoming).toEqual(['gold', 'wood']);
  });

  it('카드 추가 후에도 수량이 정확하다', () => {
    const deck: DeckState = { drawPile: ['wood'], discardPile: [] };
    addCards(deck, ['gold', 'gold'], seq([0.5]));
    const view = deckView(deck);
    expect(view.drawCount).toBe(3);
    expect(view.remainingByType.gold).toBe(2);
  });
});
