import type { BlockDef, BlockTypeId } from '../../types';

/**
 * 블록 5종 정의. 크기/무게/위험/점수는 모두 여기서 조정한다.
 */
export const BLOCKS: Record<BlockTypeId, BlockDef> = {
  wood: {
    id: 'wood',
    name: '나무판',
    width: 150,
    height: 30,
    weight: 1,
    baseRisk: 4,
    score: 10,
    desc: '넓고 가벼워 기반에 좋아요',
  },
  stone: {
    id: 'stone',
    name: '돌 블록',
    width: 104,
    height: 46,
    weight: 3,
    baseRisk: 8,
    score: 25,
    desc: '묵직해요. 좁은 곳 위험!',
  },
  glass: {
    id: 'glass',
    name: '유리 왕관',
    width: 86,
    height: 44,
    weight: 1,
    baseRisk: 12,
    score: 60,
    desc: '높은 점수, 깨지기 쉬움',
    fragile: true,
  },
  gold: {
    id: 'gold',
    name: '거대 금괴',
    width: 96,
    height: 40,
    weight: 5,
    baseRisk: 16,
    score: 100,
    desc: '최고 점수, 최고 위험',
  },
  foundation: {
    id: 'foundation',
    name: '기초석',
    width: 188,
    height: 36,
    weight: 4,
    baseRisk: 2,
    score: 5,
    desc: '탑 전체를 안정시켜요',
    stabilizer: true,
  },
};

export const BLOCK_ORDER: BlockTypeId[] = [
  'wood',
  'stone',
  'glass',
  'gold',
  'foundation',
];
