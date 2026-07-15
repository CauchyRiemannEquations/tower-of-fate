import type {
  BlockTypeId,
  ContractId,
  ContractOfferView,
  ContractView,
} from '../../types';
import { BALANCE } from '../config/balance';
import type { Rng } from './deck';

/**
 * 예언 계약 — 3번의 배치 동안 적용되는 짧은 도전 과제.
 * 진행 판정은 전부 순수 함수이며, 보상 적용은 actions가 담당한다.
 * 실패해도 처벌은 없다(계약이 조용히 만료될 뿐).
 */

export interface PlacementInfo {
  blockId: BlockTypeId;
  /** 탑 중심 기준 방향 */
  side: -1 | 0 | 1;
  /** 탑 중심 기준 부호 있는 오프셋(px) */
  offset: number;
  /** 판정에 사용된 위험(%) */
  risk: number;
  perfect: boolean;
}

export interface ActiveContract {
  id: ContractId;
  /** 만료까지 남은 배치 수 */
  remaining: number;
  /** 계약별 진행 카운터 */
  progress: number;
  status: 'active' | 'success' | 'failed';
  /** 계약별 내부 기록 */
  sides: (-1 | 0 | 1)[];
  offsets: number[];
  types: BlockTypeId[];
}

interface ContractSpec {
  id: ContractId;
  name: string;
  desc: string;
  reward: string;
  target: number;
}

export const CONTRACT_SPECS: Record<ContractId, ContractSpec> = {
  balance: {
    id: 'balance',
    name: '균형의 예언',
    desc: '다음 3개의 블록을 탑 중심 기준 좌우 번갈아 배치하세요.',
    reward: '이후 5회 배치 동안 기울기 위험 절반',
    target: 3,
  },
  greed: {
    id: 'greed',
    name: '탐욕의 예언',
    desc: '3회 배치 안에 위험 40% 이상에 도전해 생존하세요.',
    reward: '이후 5회 배치 동안 고위험 생존 배율 +0.3',
    target: 1,
  },
  materials: {
    id: 'materials',
    name: '세 재료의 계약',
    desc: '연속 3층을 서로 다른 종류의 블록으로 쌓으세요.',
    reward: '리롤 1회 획득',
    target: 3,
  },
  engineer: {
    id: 'engineer',
    name: '정밀공학자의 계약',
    desc: '3회 배치 안에 PERFECT를 2번 달성하세요.',
    reward: '다음 유리/금괴 블록 위험 -10%',
    target: 2,
  },
  symmetry: {
    id: 'symmetry',
    name: '대칭의 계약',
    desc: '두 블록을 탑 중심에서 비슷한 거리의 반대편에 배치하세요.',
    reward: `즉시 +${BALANCE.effects.symmetryInstantScore}점, 이후 5회 기울기 위험 절반`,
    target: 1,
  },
};

/** 대칭 판정 허용 오차(px) */
const SYMMETRY_TOLERANCE = 12;

/**
 * 현재 상황에서 달성 가능한 계약만 제시한다.
 * availableTypeCount: 덱(드로우+버림)과 예약에 존재하는 블록 종류 수
 */
export function isFeasible(id: ContractId, availableTypeCount: number): boolean {
  if (id === 'materials') return availableTypeCount >= 3;
  return true;
}

/** 계약 선택지 3개를 무작위로 뽑는다 */
export function offerContracts(
  availableTypeCount: number,
  rng: Rng = Math.random,
): ContractOfferView[] {
  const pool = (Object.keys(CONTRACT_SPECS) as ContractId[]).filter((id) =>
    isFeasible(id, availableTypeCount),
  );
  // 부분 셔플 후 앞 3개
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map((id) => {
    const s = CONTRACT_SPECS[id];
    return { id: s.id, name: s.name, desc: s.desc, reward: s.reward };
  });
}

export function startContract(id: ContractId): ActiveContract {
  return {
    id,
    remaining: BALANCE.contracts.duration,
    progress: 0,
    status: 'active',
    sides: [],
    offsets: [],
    types: [],
  };
}

/**
 * 배치 1회에 대한 계약 진행. 새 객체를 반환하는 순수 함수.
 * 붕괴 시에는 호출되지 않는다(게임이 끝나므로 계약도 소멸).
 */
export function advanceContract(
  c: ActiveContract,
  p: PlacementInfo,
): ActiveContract {
  if (c.status !== 'active') return c;

  const next: ActiveContract = {
    ...c,
    remaining: c.remaining - 1,
    sides: [...c.sides, p.side],
    offsets: [...c.offsets, p.offset],
    types: [...c.types, p.blockId],
  };

  switch (c.id) {
    case 'balance': {
      // 매 배치가 0이 아니고 직전과 반대여야 한다
      const prev = c.sides.length > 0 ? c.sides[c.sides.length - 1] : 0;
      const valid = p.side !== 0 && (c.sides.length === 0 || p.side === -prev);
      if (!valid) {
        next.status = 'failed';
      } else {
        next.progress = c.progress + 1;
        if (next.progress >= CONTRACT_SPECS.balance.target) {
          next.status = 'success';
        }
      }
      break;
    }
    case 'greed': {
      if (p.risk >= 40) {
        next.progress = 1;
        next.status = 'success';
      }
      break;
    }
    case 'materials': {
      if (c.types.includes(p.blockId)) {
        next.status = 'failed';
      } else {
        next.progress = c.progress + 1;
        if (next.progress >= CONTRACT_SPECS.materials.target) {
          next.status = 'success';
        }
      }
      break;
    }
    case 'engineer': {
      if (p.perfect) next.progress = c.progress + 1;
      if (next.progress >= CONTRACT_SPECS.engineer.target) {
        next.status = 'success';
      }
      break;
    }
    case 'symmetry': {
      // 지금까지의 배치 중 반대편 + 거리 차 허용 오차 이내 쌍 존재?
      const all = next.offsets;
      outer: for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          if (
            Math.sign(a) !== 0 &&
            Math.sign(b) !== 0 &&
            Math.sign(a) !== Math.sign(b) &&
            Math.abs(Math.abs(a) - Math.abs(b)) <= SYMMETRY_TOLERANCE
          ) {
            next.progress = 1;
            next.status = 'success';
            break outer;
          }
        }
      }
      break;
    }
  }

  // 만료 판정
  if (next.status === 'active' && next.remaining <= 0) {
    next.status = 'failed';
  }
  return next;
}

/** HUD 표시용 뷰 */
export function contractView(c: ActiveContract): ContractView {
  const spec = CONTRACT_SPECS[c.id];
  let progressText: string;
  switch (c.id) {
    case 'balance':
      progressText = `교차 ${c.progress}/3`;
      break;
    case 'greed':
      progressText = c.progress > 0 ? '달성!' : '위험 40%+ 생존 0/1';
      break;
    case 'materials':
      progressText = `재료 ${c.progress}/3`;
      break;
    case 'engineer':
      progressText = `PERFECT ${c.progress}/2`;
      break;
    case 'symmetry':
      progressText = c.progress > 0 ? '달성!' : '대칭 쌍 0/1';
      break;
  }
  return {
    id: c.id,
    name: spec.name,
    desc: spec.desc,
    progressText,
    remaining: c.remaining,
  };
}
