import type { BlockTypeId } from '../../types';

/** 층수에 따른 블록 등장 가중치 */
function weightsFor(floor: number): Record<BlockTypeId, number> {
  if (floor < 3) {
    return { wood: 3.2, foundation: 2.0, stone: 2.0, glass: 0.9, gold: 0.4 };
  }
  if (floor < 7) {
    return { wood: 2.2, foundation: 1.2, stone: 2.2, glass: 1.8, gold: 1.0 };
  }
  return { wood: 1.6, foundation: 1.0, stone: 2.0, glass: 2.2, gold: 1.8 };
}

function pickWeighted(weights: Record<BlockTypeId, number>): BlockTypeId {
  const entries = Object.entries(weights) as [BlockTypeId, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

/** 세 장의 블록 카드를 생성. 세 장이 전부 같지는 않게 한다. */
export function generateOffers(floor: number): BlockTypeId[] {
  const w = weightsFor(floor);
  const offers: BlockTypeId[] = [];
  let guard = 0;
  while (offers.length < 3 && guard++ < 60) {
    const pick = pickWeighted(w);
    const sameCount = offers.filter((o) => o === pick).length;
    if (sameCount >= 2) continue;
    offers.push(pick);
  }
  while (offers.length < 3) offers.push('wood');
  return offers;
}
