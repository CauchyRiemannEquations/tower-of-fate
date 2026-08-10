import type { BlockTypeId, TrialView } from '../../types';
import { BALANCE } from '../config/balance';
import type { Rng } from './rng';

/**
 * 운명의 시험 — 자동으로 나타나는 짧은 도전 과제.
 *
 * 계약/모달 같은 선택 절차 없이, 진행 중인 판 위에 칩 하나로만 뜬다.
 * 3번의 배치 안에 조건을 채우면 금고에 보너스가 직행하고,
 * 못 채우면 조용히 흘러간다 (처벌 없음).
 *
 * 존재 이유는 하나 — "안전하게 중앙에만 쌓기"가 언제나 정답이 되지
 * 않도록, 중앙에서 벗어나는 플레이에 값을 지불하는 것.
 */

export type TrialId = 'marks' | 'variety' | 'nerve' | 'weave';

export interface TrialPlacement {
  blockId: BlockTypeId;
  /** 탑 기준(첫 블록 중심) 방향: -1 왼쪽, 0 중앙, 1 오른쪽 */
  side: -1 | 0 | 1;
  /** 판정에 사용된 위험(%) */
  risk: number;
  perfect: boolean;
}

export interface ActiveTrial {
  id: TrialId;
  /** 만료까지 남은 배치 수 */
  remaining: number;
  progress: number;
  status: 'active' | 'success' | 'failed';
  sides: (-1 | 0 | 1)[];
  types: BlockTypeId[];
}

interface TrialSpec {
  id: TrialId;
  name: string;
  desc: string;
  target: number;
}

export const TRIAL_SPECS: Record<TrialId, TrialSpec> = {
  marks: {
    id: 'marks',
    name: '표식의 시험',
    desc: '3번의 배치 안에 운명의 표식을 2번 맞히세요',
    target: 2,
  },
  variety: {
    id: 'variety',
    name: '재료의 시험',
    desc: '서로 다른 종류의 블록을 3연속으로 쌓으세요',
    target: 3,
  },
  nerve: {
    id: 'nerve',
    name: '담력의 시험',
    desc: '위험 25% 이상의 배치에서 살아남으세요',
    target: 1,
  },
  weave: {
    id: 'weave',
    name: '균형의 시험',
    desc: '탑 중심 기준 좌우를 3연속으로 번갈아 쌓으세요',
    target: 3,
  },
};

export const TRIAL_ORDER: TrialId[] = ['marks', 'variety', 'nerve', 'weave'];

/** 직전 시험과 겹치지 않게 다음 시험을 뽑는다 */
export function pickTrial(rng: Rng, lastId: TrialId | null): TrialId {
  const pool = TRIAL_ORDER.filter((id) => id !== lastId);
  return pool[Math.floor(rng() * pool.length)];
}

export function startTrial(id: TrialId): ActiveTrial {
  return {
    id,
    remaining: BALANCE.trials.duration,
    progress: 0,
    status: 'active',
    sides: [],
    types: [],
  };
}

/** 성공 보상 — 현재 탑 위 점수에 비례한 보너스가 금고로 직행한다 */
export function trialReward(towerScore: number): number {
  const T = BALANCE.trials;
  return T.rewardFlat + Math.round(Math.max(0, towerScore) * T.rewardTowerFrac);
}

/**
 * 배치 1회에 대한 시험 진행. 새 객체를 반환하는 순수 함수.
 * 붕괴 시에는 호출되지 않는다 (판이 끝나므로 시험도 소멸).
 */
export function advanceTrial(t: ActiveTrial, p: TrialPlacement): ActiveTrial {
  if (t.status !== 'active') return t;

  const next: ActiveTrial = {
    ...t,
    remaining: t.remaining - 1,
    sides: [...t.sides, p.side],
    types: [...t.types, p.blockId],
  };

  switch (t.id) {
    case 'marks': {
      if (p.perfect) next.progress = t.progress + 1;
      if (next.progress >= TRIAL_SPECS.marks.target) next.status = 'success';
      break;
    }
    case 'variety': {
      if (t.types.includes(p.blockId)) {
        next.status = 'failed';
      } else {
        next.progress = t.progress + 1;
        if (next.progress >= TRIAL_SPECS.variety.target) next.status = 'success';
      }
      break;
    }
    case 'nerve': {
      if (p.risk >= BALANCE.trials.nerveRisk) {
        next.progress = 1;
        next.status = 'success';
      }
      break;
    }
    case 'weave': {
      const prev = t.sides.length > 0 ? t.sides[t.sides.length - 1] : 0;
      const valid = p.side !== 0 && (t.sides.length === 0 || p.side === -prev);
      if (!valid) {
        next.status = 'failed';
      } else {
        next.progress = t.progress + 1;
        if (next.progress >= TRIAL_SPECS.weave.target) next.status = 'success';
      }
      break;
    }
  }

  if (next.status === 'active' && next.remaining <= 0) {
    next.status = 'failed';
  }
  return next;
}

/** HUD 칩 표시용 뷰 */
export function trialView(t: ActiveTrial): TrialView {
  const spec = TRIAL_SPECS[t.id];
  let progressText: string;
  switch (t.id) {
    case 'marks':
      progressText = `표식 ${t.progress}/${spec.target}`;
      break;
    case 'variety':
      progressText = `재료 ${t.progress}/${spec.target}`;
      break;
    case 'nerve':
      progressText = `위험 ${BALANCE.trials.nerveRisk}%+ 생존 ${t.progress}/1`;
      break;
    case 'weave':
      progressText = `교차 ${t.progress}/${spec.target}`;
      break;
  }
  return {
    name: spec.name,
    desc: spec.desc,
    progressText,
    remaining: t.remaining,
  };
}
