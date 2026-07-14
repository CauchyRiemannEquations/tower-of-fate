import type { BlockTypeId, DeckView } from '../../types';
import { BALANCE } from '../config/balance';

/**
 * 운명 덱 — 한 판을 구성하는 블록 카드 더미.
 *
 * 규칙:
 * - 매 턴 3장을 뽑아 선택지로 제공한다.
 * - 배치한 카드는 탑이 되어 게임에서 제거된다.
 * - 선택하지 않은 카드는 버림 더미로 간다.
 * - 드로우 더미가 비면 버림 더미를 섞어 새 덱으로 쓴다.
 * - 둘 다 비면 비상 카드(나무판)로 채운다.
 *
 * 모든 함수는 주입 가능한 RNG를 받아 테스트 가능하다.
 */

export interface DeckState {
  /** 뒤(끝)가 덱 맨 위 — pop으로 드로우 */
  drawPile: BlockTypeId[];
  discardPile: BlockTypeId[];
}

export type Rng = () => number;

const SAFE_BLOCKS: readonly BlockTypeId[] = ['wood', 'foundation'];

/** Fisher–Yates 셔플 (제자리) */
export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildInitialDeck(rng: Rng = Math.random): DeckState {
  const cards: BlockTypeId[] = [];
  for (const [id, count] of Object.entries(BALANCE.deck.composition)) {
    for (let i = 0; i < count; i++) cards.push(id as BlockTypeId);
  }
  shuffle(cards, rng);
  return { drawPile: cards, discardPile: [] };
}

/** 손패에 안전 블록이 없으면 드로우 더미의 안전 블록과 한 장 교환 */
function ensureSafeHand(hand: BlockTypeId[], deck: DeckState) {
  if (hand.some((c) => SAFE_BLOCKS.includes(c))) return;
  const idx = deck.drawPile.findIndex((c) => SAFE_BLOCKS.includes(c));
  if (idx < 0) return;
  const [safe] = deck.drawPile.splice(idx, 1);
  deck.drawPile.unshift(hand[0]); // 교환된 카드는 덱 맨 아래로
  hand[0] = safe;
}

/**
 * 3장 드로우. 부족하면 버림 더미 리셔플, 그래도 부족하면 비상 카드 보충.
 */
export function drawHand(
  deck: DeckState,
  rng: Rng = Math.random,
  opts: { guaranteeSafe?: boolean } = {},
): BlockTypeId[] {
  const hand: BlockTypeId[] = [];
  while (hand.length < 3) {
    if (deck.drawPile.length === 0) {
      if (deck.discardPile.length > 0) {
        deck.drawPile = shuffle(deck.discardPile.splice(0, Infinity), rng);
      } else {
        hand.push(BALANCE.deck.fallbackCard as BlockTypeId);
        continue;
      }
    }
    hand.push(deck.drawPile.pop()!);
  }
  if (opts.guaranteeSafe) ensureSafeHand(hand, deck);
  return hand;
}

/** 선택되지 않은 카드를 버림 더미로 보낸다 */
export function discardCards(deck: DeckState, cards: BlockTypeId[]) {
  deck.discardPile.push(...cards);
}

/** 체크포인트 보상 등으로 덱에 카드를 추가하고 섞는다 */
export function addCards(
  deck: DeckState,
  cards: BlockTypeId[],
  rng: Rng = Math.random,
) {
  deck.drawPile.push(...cards);
  shuffle(deck.drawPile, rng);
}

/** UI 표시용 스냅샷. peek 장수만큼 다음 카드를 미리 보여준다. */
export function deckView(deck: DeckState, peek = 0): DeckView {
  const remainingByType: Record<BlockTypeId, number> = {
    wood: 0,
    stone: 0,
    glass: 0,
    gold: 0,
    foundation: 0,
  };
  for (const c of deck.drawPile) remainingByType[c]++;
  return {
    drawCount: deck.drawPile.length,
    discardCount: deck.discardPile.length,
    remainingByType,
    upcoming: peek > 0 ? deck.drawPile.slice(-peek).reverse() : [],
  };
}
