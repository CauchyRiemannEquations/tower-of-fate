/**
 * 게임 밸런스 전반의 수치를 모아둔 설정 파일.
 * 게임 감각을 조정할 때는 이 파일만 수정하면 된다.
 */
export const BALANCE = {
  design: {
    width: 480,
    height: 854,
    baseX: 240,
    groundTop: 566,
    groundWidth: 216,
  },

  risk: {
    /** 이 픽셀 이내로 중심을 맞추면 PERFECT */
    perfectPx: 8,
    /** 치우침이 최대일 때 더해지는 위험 */
    offsetMax: 22,
    /** 지지면이 전혀 없을 때 더해지는 위험 */
    supportMax: 38,
    /** 무게중심 쏠림 최대 위험 */
    comMax: 16,
    /** 층당 높이 위험 */
    heightPerFloor: 1.5,
    /** 높이 위험이 붙기 시작하기 전 무료 층수 */
    heightFreeFloors: 2,
    foundationBonus: -7,
    perfectBonus: -8,
    centeredBonus: -4,
    wideSupportBonus: -5,
    clampMin: 2,
    clampMax: 95,
    /** 초반 완충: 이 층수까지는 실제 판정 확률을 낮춘다 */
    earlyFloors: 3,
    earlyFactor: 0.45,
    /** 이 위험 미만에서의 첫 붕괴는 1회 보호(아슬아슬 연출) */
    shieldBelow: 25,
  },

  score: {
    mult30: 1.2,
    mult50: 1.5,
    mult70: 2.0,
    perfectFlat: 15,
    comboStep: 5,
  },

  /** 5층마다 탑 위 점수 일부를 자동 저장 */
  checkpoints: {
    every: 5,
    fractions: [0.2, 0.3, 0.4],
  },

  aim: {
    /** 드래그 이동 한계 (baseX 기준 ±) */
    maxOffset: 165,
    /** 좌우 영역 터치 시 이동량 */
    nudge: 14,
  },
} as const;

export const LS_KEYS = {
  best: 'towerOfFate.best',
  tutorial: 'towerOfFate.tutorialDone',
  sound: 'towerOfFate.sound',
} as const;
