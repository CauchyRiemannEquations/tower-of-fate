/**
 * 게임 밸런스 전반의 수치를 모아둔 설정 파일.
 * 게임 감각을 조정할 때는 이 파일만 수정하면 된다.
 */
export const BALANCE = {
  /**
   * 디자인 해상도. 높이는 854로 고정하고, 폭은 기기 화면 비율에 맞춰
   * 게임 시작 시 configureDesign()이 계산한다 (배경이 항상 꽉 찬다).
   */
  design: {
    width: 480,
    height: 854,
    baseX: 240,
    groundTop: 566,
    /** 첫 블록을 받치는 바닥 폭 — 화면 전체 폭으로 설정된다 */
    groundWidth: 480,
  },

  /** 운명 덱 — 한 판을 구성하는 블록 카드 수량 */
  deck: {
    composition: {
      wood: 10,
      stone: 8,
      glass: 6,
      gold: 4,
      foundation: 5,
    } as Record<string, number>,
    /** 첫 손패에 안전 블록(나무/기초석)을 최소 1장 보장 */
    safeFirstHand: true,
    /** 덱+버림이 모두 부족할 때 채워 넣는 비상 카드 */
    fallbackCard: 'wood',
  },

  /** 예언 계약 — 체크포인트에서 효과 선택 후 이어서 제안된다 */
  contracts: {
    /** 계약이 적용되는 배치 수 */
    duration: 3,
    /** 보상 버프가 적용되는 배치 수 */
    buffDuration: 5,
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
    /**
     * 초반의 가호: 이 층수까지는 위험을 크게 낮춘다.
     * 표시 확률과 판정 확률이 항상 같도록, 감소분은
     * computeRisk의 요인("초반의 가호")으로 노출된다.
     */
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

  /** 길·유물·계약 보상의 효과 수치 — 밸런스 조정은 여기서 */
  effects: {
    /** 안정의 길: 기본 점수 배율 */
    stableScoreScale: 0.9,
    /** 탐욕의 길: 매 배치 평탄 위험 증가 */
    greedFlatRisk: 3,
    /** 탐욕의 길: 30%+ 생존 배율 보너스 */
    greedMultBonus: 0.2,
    /** 유리 장인: 유리 연속 배치 점수 체인 (연속 1회당) */
    glassChainStep: 0.5,
    glassChainMax: 3,
    /** 유리 장인: 유리 위 유리 추가 위험 */
    glassOnGlassExtra: 4,
    /** 균형 설계자: PERFECT 판정 범위 확대(px) */
    balancePerfectPx: 3,
    /** 균형 설계자: 좌우 교차 배치 점수 보너스 */
    alternateScoreBonus: 0.1,
    /** 균형의 저울: 반대편 배치 시 위험 감소 */
    scalesOppositeBonus: -4,
    /** 도박사의 주사위: 50%+ 생존 배율 보너스 */
    diceMultBonus: 0.5,
    /** 장인의 쐐기: 지지면 부족 위험 배율 */
    wedgeSupportScale: 0.7,
    /** 계약 보상: 기울기 위험 배율 */
    buffTiltScale: 0.5,
    /** 계약 보상: 30%+ 생존 배율 보너스 */
    buffGreedMult: 0.3,
    /** 계약 보상: 다음 유리/금괴 위험 감소 */
    buffHighValueCut: 10,
    /** 운명의 보험증서: 붕괴 시 보존 비율 */
    insuranceKeep: 0.5,
    /** 황금 계약서: 점수 확정 보너스 비율 */
    goldenSealBonus: 0.15,
    /** 대칭의 계약: 즉시 점수 */
    symmetryInstantScore: 40,
  },

  aim: {
    /** 드래그 이동 한계 (baseX 기준 ±) */
    maxOffset: 165,
    /** 좌우 영역 터치 시 이동량 */
    nudge: 14,
  },
};

/**
 * 기기 화면 비율에 맞춰 디자인 폭을 계산한다.
 * 높이 854 기준으로 폭을 늘리거나 줄여 배경이 항상 화면을 꽉 채우고,
 * 바닥(groundWidth)도 화면 전체 폭이 된다.
 * 반드시 Phaser 게임 생성(텍스처 생성) 전에 호출해야 한다.
 */
export function configureDesign(viewW: number, viewH: number) {
  const d = BALANCE.design;
  const aspect = viewW / Math.max(1, viewH);
  d.width = Math.round(Math.min(1100, Math.max(400, d.height * aspect)));
  d.baseX = Math.round(d.width / 2);
  d.groundWidth = d.width;
}

export const LS_KEYS = {
  best: 'towerOfFate.best',
  tutorial: 'towerOfFate.tutorialDone',
  sound: 'towerOfFate.sound',
  analytics: 'towerOfFate.analytics',
  nickname: 'towerOfFate.nickname',
} as const;
