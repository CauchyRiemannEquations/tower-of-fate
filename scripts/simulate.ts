/**
 * 몬테카를로 밸런스 시뮬레이터.
 *
 *   npm run sim            # 기본 3000판 × 전략별
 *   npm run sim -- 10000   # 판 수 지정
 *
 * 게임과 완전히 같은 순수 시스템(computeRisk/computeGain/judgeCollapse)을
 * 그대로 사용해 여러 전략 봇을 돌리고, 평균 점수·붕괴율·탈출 층수를
 * 비교한다. balance.ts의 수치를 바꾸면 여기서 근거를 확인할 수 있다.
 */
import { BALANCE } from '../src/game/config/balance';
import { BLOCKS } from '../src/game/config/blocks';
import type { BlockTypeId } from '../src/types';
import { computeRisk } from '../src/game/systems/risk';
import {
  checkpointFraction,
  computeGain,
  placementEV,
} from '../src/game/systems/scoring';
import { drawOffers } from '../src/game/systems/offers';
import {
  FateBag,
  judgeCollapse,
  mulberry32,
  type FairnessState,
  type Rng,
} from '../src/game/systems/rng';
import { tower } from '../src/game/systems/tower';

// ── 운명의 표식 (actions.ts의 createFateTarget과 같은 규칙) ──

function createFateTarget(
  combo: number,
  nextFateSide: { v: -1 | 1 },
): number {
  const F = BALANCE.fate;
  const below = tower.top();
  const baseX = tower.blocks[0]?.x ?? 0;
  const supportX = below?.x ?? 0;
  const supportWidth = below?.def.width ?? BALANCE.design.groundWidth;
  const comboExtra = Math.min(F.comboOffsetMax, combo * F.comboOffsetStep);
  const distance = Math.min(
    F.maxOffset,
    Math.max(F.minOffset, supportWidth * F.supportRatio + comboExtra),
  );

  let side = nextFateSide.v;
  let desired = baseX + side * distance;
  const maxShift = Math.max(F.minOffset, supportWidth * F.maxShiftRatio);
  desired = Math.max(supportX - maxShift, Math.min(supportX + maxShift, desired));
  if (Math.abs(desired) > BALANCE.aim.maxOffset) {
    side = side === 1 ? -1 : 1;
    desired = baseX + side * distance;
    desired = Math.max(supportX - maxShift, Math.min(supportX + maxShift, desired));
  }
  const x = Math.round(
    Math.max(-BALANCE.aim.maxOffset, Math.min(BALANCE.aim.maxOffset, desired)),
  );
  nextFateSide.v = side === 1 ? -1 : 1;
  return x;
}

// ── 전략 봇 ─────────────────────────────────────────────

interface Choice {
  id: BlockTypeId;
  x: number;
}

interface Policy {
  name: string;
  /** 이번 턴의 선택. null이면 탈출. */
  decide(ctx: {
    offers: BlockTypeId[];
    stake: number;
    combo: number;
    floor: number;
    fateX: number;
  }): Choice | null;
}

/**
 * 선택지 각각을 주어진 x 후보에서 평가해 조정 기대값 최고의 수를 찾는다.
 * lambda는 분산 회피 계수: 수의 가치를 EV − λ·p·stake 로 평가한다
 * (λ=0 이면 순수 기대값 탐욕, λ>0 이면 파산 위험을 기피하는 신중한 플레이).
 */
function bestMove(
  offers: BlockTypeId[],
  stake: number,
  combo: number,
  xCandidates: () => number[],
  fateX: number,
  lambda: number,
): { choice: Choice; adjusted: number } {
  let best: { choice: Choice; adjusted: number } | null = null;
  for (const id of offers) {
    const def = BLOCKS[id];
    for (const x of xCandidates()) {
      const b = computeRisk(def, x, fateX);
      const gain = computeGain({
        def,
        riskPct: b.total,
        perfect: b.perfect,
        combo: b.perfect ? combo + 1 : 0,
        stake,
      });
      const p = b.total / 100;
      const adjusted = placementEV(gain, b.total, stake) - lambda * p * stake;
      if (!best || adjusted > best.adjusted) best = { choice: { id, x }, adjusted };
    }
  }
  return best!;
}

const supportX = () => tower.top()?.x ?? 0;

function evPolicy(name: string, useFate: boolean, lambda: number): Policy {
  return {
    name,
    decide({ offers, stake, combo, fateX }) {
      const m = bestMove(
        offers,
        stake,
        combo,
        () => (useFate ? [supportX(), fateX] : [supportX()]),
        fateX,
        lambda,
      );
      return m.adjusted >= 0 ? m.choice : null;
    },
  };
}

const policies: Policy[] = [
  // 순수 기대값 탐욕 — EV≥0 이면 계속. 거의 항상 파산하는 반면교사
  evPolicy('탐욕·중앙', false, 0),
  evPolicy('탐욕·표식', true, 0),
  // 분산 회피 신중 플레이 (λ=0.3)
  evPolicy('신중·중앙', false, 0.3),
  evPolicy('신중·표식', true, 0.3),
  ...[5, 10, 15, 20].map(
    (target): Policy => ({
      // 무조건 target층까지 중앙에 최저위험 블록, 도달하면 탈출
      name: `${target}층 탈출`,
      decide({ offers, floor, fateX }) {
        if (floor >= target) return null;
        let best: { id: BlockTypeId; risk: number } | null = null;
        for (const id of offers) {
          const b = computeRisk(BLOCKS[id], supportX(), fateX);
          if (!best || b.total < best.risk) best = { id, risk: b.total };
        }
        return { id: best!.id, x: supportX() };
      },
    }),
  ),
];

// ── 시뮬레이션 ──────────────────────────────────────────

interface RunResult {
  score: number;
  floor: number;
  collapsed: boolean;
}

function playRun(policy: Policy, rng: Rng): RunResult {
  tower.reset();
  const bag = new FateBag(BALANCE.risk.strata, rng);
  const fairness: FairnessState = { shieldUsed: false };
  const fateSide = { v: rng() < 0.5 ? -1 : (1 as -1 | 1) } as { v: -1 | 1 };

  let vault = 0;
  let stake = 0;
  let combo = 0;
  let fateX = createFateTarget(0, fateSide);

  for (let turn = 0; turn < 300; turn++) {
    const floor = tower.blocks.length;
    const offers = drawOffers(rng, {
      guaranteeSafe: floor === 0 && BALANCE.offers.safeFirstHand,
    });
    const choice = policy.decide({ offers, stake, combo, floor, fateX });
    if (!choice) {
      return { score: vault + stake, floor, collapsed: false };
    }

    const def = BLOCKS[choice.id];
    const b = computeRisk(def, choice.x, fateX);
    const gain = computeGain({
      def,
      riskPct: b.total,
      perfect: b.perfect,
      combo: b.perfect ? combo + 1 : 0,
      stake,
    });

    tower.add(def, choice.x);
    const outcome = judgeCollapse(b.total, tower.blocks.length, fairness, () =>
      bag.next(),
    );
    if (outcome.collapsed) {
      return { score: vault, floor: tower.blocks.length, collapsed: true };
    }

    combo = b.perfect ? combo + 1 : 0;
    stake += gain;
    const frac = checkpointFraction(tower.blocks.length);
    if (frac > 0) {
      const banked = Math.round(stake * frac);
      stake -= banked;
      vault += banked;
    }
    fateX = createFateTarget(combo, fateSide);
  }
  return { score: vault + stake, floor: tower.blocks.length, collapsed: false };
}

function quantile(sorted: number[], q: number): number {
  const i = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[i];
}

const RUNS = Number(process.argv[2]) || 3000;

console.log(`운명의 탑 밸런스 시뮬레이터 — 전략별 ${RUNS}판\n`);
console.log(
  '전략'.padEnd(10) +
    '평균점수'.padStart(9) +
    '중앙값'.padStart(8) +
    '상위10%'.padStart(9) +
    '평균층'.padStart(8) +
    '붕괴율'.padStart(8),
);

for (const policy of policies) {
  const rng = mulberry32(20260810);
  const results: RunResult[] = [];
  for (let i = 0; i < RUNS; i++) results.push(playRun(policy, rng));

  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const floors = results.reduce((a, r) => a + r.floor, 0) / results.length;
  const collapseRate =
    results.filter((r) => r.collapsed).length / results.length;

  console.log(
    policy.name.padEnd(10) +
      Math.round(mean).toLocaleString().padStart(9) +
      quantile(scores, 0.5).toLocaleString().padStart(8) +
      quantile(scores, 0.9).toLocaleString().padStart(9) +
      floors.toFixed(1).padStart(8) +
      `${(collapseRate * 100).toFixed(0)}%`.padStart(8),
  );
}

console.log(
  '\n표시 확률 == 판정 확률이므로 이 결과가 곧 실제 게임의 기대 분포다.',
);
