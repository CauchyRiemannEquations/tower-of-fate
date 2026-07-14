import type {
  BlockTypeId,
  CheckpointOption,
  PathId,
  RelicId,
} from '../../types';
import type { Rng } from './deck';

/**
 * 체크포인트 선택 — 한 판의 빌드 방향을 결정하는 길 5종과
 * 최대 2개까지 장착하는 유물 8종.
 * 효과 해석은 modifiers.ts / actions.ts가 담당하고,
 * 여기서는 정의와 선택지 생성만 다룬다.
 */

export interface PathSpec {
  id: PathId;
  name: string;
  desc: string;
  tradeoff?: string;
  /** 선택 시 덱에 추가되는 카드 */
  deckAdds: BlockTypeId[];
  /** 선택 시 즉시 얻는 리롤 횟수 */
  rerollGain: number;
  /** 덱 미리보기 장수 증가 */
  peekGain: number;
}

export const PATH_SPECS: Record<PathId, PathSpec> = {
  stable: {
    id: 'stable',
    name: '안정의 길',
    desc: '나무판 2장과 기초석 1장을 덱에 추가',
    tradeoff: '기본 점수 10% 감소',
    deckAdds: ['wood', 'wood', 'foundation'],
    rerollGain: 0,
    peekGain: 0,
  },
  greed: {
    id: 'greed',
    name: '탐욕의 길',
    desc: '금괴 2장 추가, 위험 30%+ 생존 배율 +0.2',
    tradeoff: '매 배치 위험 +3%',
    deckAdds: ['gold', 'gold'],
    rerollGain: 0,
    peekGain: 0,
  },
  glass: {
    id: 'glass',
    name: '유리 장인의 길',
    desc: '유리 왕관 3장 추가, 유리 연속 배치마다 점수 체인 증가',
    tradeoff: '유리 위 유리 위험 +4%',
    deckAdds: ['glass', 'glass', 'glass'],
    rerollGain: 0,
    peekGain: 0,
  },
  balance: {
    id: 'balance',
    name: '균형 설계자의 길',
    desc: 'PERFECT 판정 범위 확대, 좌우 교차 배치 점수 +10%',
    deckAdds: [],
    rerollGain: 0,
    peekGain: 0,
  },
  prophet: {
    id: 'prophet',
    name: '예언자의 길',
    desc: '덱의 다음 3장 미리보기, 리롤 1회 획득',
    deckAdds: [],
    rerollGain: 1,
    peekGain: 3,
  },
};

export interface RelicSpec {
  id: RelicId;
  name: string;
  desc: string;
  /** 획득 시 즉시 얻는 리롤 횟수 */
  rerollGain: number;
}

export const RELIC_SPECS: Record<RelicId, RelicSpec> = {
  insurance: {
    id: 'insurance',
    name: '운명의 보험증서',
    desc: '한 판에 한 번, 붕괴해도 탑 위 점수의 절반을 금고에 보존',
    rerollGain: 0,
  },
  scales: {
    id: 'scales',
    name: '균형의 저울',
    desc: '직전 배치의 반대편에 놓으면 위험 4% 감소',
    rerollGain: 0,
  },
  dice: {
    id: 'dice',
    name: '도박사의 주사위',
    desc: '위험 50% 이상에서 생존하면 배율 +0.5',
    rerollGain: 0,
  },
  geometer: {
    id: 'geometer',
    name: '기하학자의 눈',
    desc: '조준 전에도 탑의 무게중심을 항상 표시',
    rerollGain: 0,
  },
  lens: {
    id: 'lens',
    name: '예언자의 렌즈',
    desc: '덱의 다음 카드 1장을 항상 미리 표시',
    rerollGain: 0,
  },
  hourglass: {
    id: 'hourglass',
    name: '깨진 모래시계',
    desc: '선택지를 다시 뽑는 리롤 1회 획득',
    rerollGain: 1,
  },
  wedge: {
    id: 'wedge',
    name: '장인의 쐐기',
    desc: '지지면 부족으로 인한 위험 30% 감소',
    rerollGain: 0,
  },
  goldenSeal: {
    id: 'goldenSeal',
    name: '황금 계약서',
    desc: '점수를 확정할 때 15% 추가 보너스',
    rerollGain: 0,
  },
};

export const MAX_RELICS = 2;

function sample<T>(pool: T[], n: number, rng: Rng): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * 체크포인트 선택지 3개: 아직 걷지 않은 길 2개 + 미보유 유물 1개.
 * 부족하면 남은 쪽에서 채운다.
 */
export function offerCheckpointOptions(
  takenPaths: PathId[],
  ownedRelics: RelicId[],
  rng: Rng = Math.random,
): CheckpointOption[] {
  const pathPool = (Object.keys(PATH_SPECS) as PathId[]).filter(
    (p) => !takenPaths.includes(p),
  );
  const relicPool =
    ownedRelics.length >= MAX_RELICS
      ? []
      : (Object.keys(RELIC_SPECS) as RelicId[]).filter(
          (r) => !ownedRelics.includes(r),
        );

  const paths = sample(pathPool, 2, rng);
  const relics = sample(relicPool, 1, rng);

  const options: CheckpointOption[] = [
    ...paths.map((p): CheckpointOption => {
      const s = PATH_SPECS[p];
      return { kind: 'path', id: p, name: s.name, desc: s.desc, tradeoff: s.tradeoff };
    }),
    ...relics.map((r): CheckpointOption => {
      const s = RELIC_SPECS[r];
      return { kind: 'relic', id: r, name: s.name, desc: s.desc };
    }),
  ];

  // 3개가 안 되면 남은 풀에서 보충
  if (options.length < 3) {
    const extraPaths = sample(
      pathPool.filter((p) => !paths.includes(p)),
      3 - options.length,
      rng,
    );
    for (const p of extraPaths) {
      const s = PATH_SPECS[p];
      options.push({ kind: 'path', id: p, name: s.name, desc: s.desc, tradeoff: s.tradeoff });
    }
  }
  if (options.length < 3) {
    const extraRelics = sample(
      relicPool.filter((r) => !relics.includes(r)),
      3 - options.length,
      rng,
    );
    for (const r of extraRelics) {
      const s = RELIC_SPECS[r];
      options.push({ kind: 'relic', id: r, name: s.name, desc: s.desc });
    }
  }

  return sample(options, Math.min(3, options.length), rng);
}
