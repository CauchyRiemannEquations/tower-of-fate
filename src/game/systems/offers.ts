import type { BlockTypeId } from '../../types';
import { BALANCE } from '../config/balance';
import type { Rng } from './rng';

/**
 * 매 턴의 블록 선택지 — 가중 확률 추첨.
 * 덱/버림 더미 없이, 정해진 출현 가중치로 매번 독립적으로 뽑는다.
 * (같은 시드 난수를 주입하면 같은 선택지 순서가 재현된다 — 오늘의 운명)
 */

const SAFE_BLOCKS: readonly BlockTypeId[] = ['wood', 'foundation'];

/** 가중치에 따라 블록 한 종을 뽑는다 */
export function weightedPick(rng: Rng = Math.random): BlockTypeId {
  const weights = BALANCE.offers.weights;
  const ids = Object.keys(weights) as BlockTypeId[];
  let sum = 0;
  for (const id of ids) sum += weights[id];
  let r = rng() * sum;
  for (const id of ids) {
    r -= weights[id];
    if (r < 0) return id;
  }
  return ids[ids.length - 1];
}

/**
 * 선택지 3개를 뽑는다.
 * - 세 개가 전부 같은 종류면 마지막 한 개를 다시 뽑아 선택을 보장한다.
 * - guaranteeSafe면 안전 블록(나무/기초석)이 최소 하나 포함되게 한다.
 */
export function drawOffers(
  rng: Rng = Math.random,
  opts: { guaranteeSafe?: boolean } = {},
): BlockTypeId[] {
  const offers: BlockTypeId[] = [weightedPick(rng), weightedPick(rng), weightedPick(rng)];

  let guard = 0;
  while (offers.every((c) => c === offers[0]) && guard++ < 20) {
    offers[2] = weightedPick(rng);
  }

  if (opts.guaranteeSafe && !offers.some((c) => SAFE_BLOCKS.includes(c))) {
    offers[0] = SAFE_BLOCKS[Math.floor(rng() * SAFE_BLOCKS.length)];
  }
  return offers;
}
