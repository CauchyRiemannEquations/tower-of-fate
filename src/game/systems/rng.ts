import { BALANCE } from '../config/balance';

/**
 * 게임의 모든 난수 도구 — 시드 난수, 층화 판정 난수, 붕괴 판정.
 * 전부 순수하고 주입 가능해서 테스트/시뮬레이터에서 재현할 수 있다.
 */

export type Rng = () => number;

/** mulberry32 — 가볍고 재현 가능한 시드 난수 생성기 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 문자열 해시 — 날짜 문자열을 시드로 바꿀 때 사용 */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 오늘 날짜 (기기 로컬 기준) — 오늘의 운명 시드/라벨용 */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayLabel(now: Date = new Date()): string {
  return `${now.getMonth() + 1}월 ${now.getDate()}일`;
}

/**
 * 층화 판정 난수 — [0,1)을 N개 구간으로 나누고, 구간 순서를 섞어
 * 한 바퀴에 각 구간을 정확히 한 번씩 사용한다.
 *
 * 성질:
 * - 난수 하나하나는 여전히 정확한 균등분포다 (섞인 순서에서 어느
 *   위치든 각 구간이 올 확률이 같으므로). 표시 확률 == 판정 확률이
 *   그대로 유지된다.
 * - 대신 연속 N번의 판정 안에서 극단적으로 낮거나 높은 난수가
 *   몰리는 일이 없어, 억울한 연속 붕괴도 기적의 연속 생존도
 *   수학적으로 완화된다.
 */
export class FateBag {
  private order: number[] = [];

  constructor(
    private readonly strata: number = BALANCE.risk.strata,
    private readonly rng: Rng = Math.random,
  ) {}

  next(): number {
    if (this.order.length === 0) this.refill();
    const s = this.order.pop()!;
    return (s + this.rng()) / this.strata;
  }

  private refill() {
    const order = Array.from({ length: this.strata }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    this.order = order;
  }
}

export interface JudgeOutcome {
  collapsed: boolean;
  /** 붕괴할 뻔했으나 보호/간발 차이로 살아남음 */
  nearMiss: boolean;
  roll: number;
  effective: number;
}

export interface FairnessState {
  shieldUsed: boolean;
}

/**
 * 붕괴 판정. riskPct는 computeRisk가 표시한 값 그대로이며
 * 여기서 추가 보정 없이 동일한 확률로 판정한다.
 *
 * 유일한 예외는 저위험 억울사 1회 보호로, 발동 시 붕괴가
 * "아슬아슬 생존"으로 전환되며 니어미스 연출로 명확히 드러난다.
 */
export function judgeCollapse(
  riskPct: number,
  floor: number,
  fairness: FairnessState,
  rng: Rng = Math.random,
): JudgeOutcome {
  const effective = riskPct / 100;
  const roll = rng();

  if (roll < effective) {
    if (
      !fairness.shieldUsed &&
      riskPct < BALANCE.risk.shieldBelow &&
      floor > BALANCE.risk.earlyFloors
    ) {
      fairness.shieldUsed = true;
      return { collapsed: false, nearMiss: true, roll, effective };
    }
    return { collapsed: true, nearMiss: false, roll, effective };
  }

  const nearMiss = riskPct >= 30 && roll < effective + 0.05;
  return { collapsed: false, nearMiss, roll, effective };
}
