/**
 * 게임 밸런스 전반의 수치를 모아둔 설정 파일.
 * 게임 감각을 조정할 때는 이 파일만 수정하면 된다.
 * (요인별 근거 수치는 scripts/simulate.ts 시뮬레이터로 검증한다)
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

  /** 매 턴 3개의 선택지를 만드는 블록 출현 가중치 */
  offers: {
    weights: {
      wood: 10,
      stone: 8,
      glass: 6,
      gold: 4,
      foundation: 5,
    } as Record<string, number>,
    /** 첫 손패에 안전 블록(나무/기초석)을 최소 1장 보장 */
    safeFirstHand: true,
  },

  /**
   * 붕괴 위험 모델.
   *
   * 위험 요인은 각각 "독립적인 붕괴 원인"의 확률(0~1)로 계산하고,
   * 1 − ∏(1 − pᵢ) 로 결합한다 — 확률의 덧셈이 아니라 결합이므로
   * 요인이 아무리 쌓여도 100%를 넘는 일이 없고, 큰 요인이 있을수록
   * 작은 요인의 추가 영향이 자연히 줄어든다.
   * 완화 요인(중심 배치·기초석·초반의 가호)은 결합된 위험에
   * (1 − r) 배율로 곱해지고, 전 과정이 표시 요인으로 노출된다.
   */
  risk: {
    /** 이 픽셀 이내로 받침 중심을 맞추면 "안정된 중심" 완화 */
    stableCenterPx: 8,
    /** 치우침 비율이 1(받침 반폭만큼 치우침)일 때의 요인 확률 */
    offsetMax: 0.26,
    offsetPower: 1.4,
    /** 지지면이 전혀 없을 때의 요인 확률 */
    supportMax: 0.5,
    supportPower: 1.2,
    /**
     * 층별 정역학(오버행) 요인 — 모든 층에 대해 "그 층 위 부분탑의
     * 무게중심"이 받침 폭 대비 얼마나 밀려났는지 검사하고,
     * 최악의 층을 위험으로 환산한다. 비율 1.0 = 무게중심이 받침
     * 가장자리 바로 위 (실제 물리라면 전복 직전).
     */
    statics: {
      /** 받침 반폭 대비 이 비율까지의 치우침은 무시 */
      safeRatio: 0.35,
      /** 비율 1.0(가장자리)일 때의 요인 확률 */
      max: 0.6,
      /** 요인 확률 상한 */
      cap: 0.88,
    },
    /** 무게 요인: weight 3 이상부터 (weight − 2) × factor */
    weightFactor: 0.02,
    /** 유리 위에 무거운 블록 */
    crushFragile: 0.12,
    /** 유리 위 유리 */
    glassOnGlass: 0.07,
    /** 층당 높이 요인 확률 */
    heightPerFloor: 0.01,
    /** 높이 요인이 붙기 시작하기 전 무료 층수 */
    heightFreeFloors: 2,

    // ── 완화 요인 (결합 위험에 곱해지는 감소율) ──
    stableCenterRelief: 0.25,
    wideSupportRelief: 0.12,
    foundationRelief: 0.18,
    /** 운명의 표식 적중 시 완화 — 표식은 운명이 지정한 지점이라
     * 치우친 배치의 위험 일부를 상쇄한다 (중앙보다는 여전히 위험) */
    fateRelief: 0.5,
    /**
     * 초반의 가호: 이 층수까지는 위험을 크게 낮춘다.
     * 표시 확률과 판정 확률이 항상 같도록 표시 요인으로 노출된다.
     */
    earlyFloors: 3,
    earlyRelief: 0.45,

    clampMin: 2,
    clampMax: 95,
    /** 이 위험 미만에서의 첫 붕괴는 1회 보호 (아슬아슬 연출) */
    shieldBelow: 25,
    /**
     * 판정 난수의 층화 구간 수 — 난수를 N개 구간의 셔플 순서로 뽑아
     * (각 난수는 여전히 정확한 균등분포) N번의 판정 안에서
     * 극단적인 행운/불운의 연속을 막는다.
     */
    strata: 8,
  },

  /**
   * 점수 모델 — "한 층 더"가 기대값 문제가 되도록 설계한다.
   *
   * 획득 점수 = 블록 점수 × (1 + riskBoost × p)
   *          + 걸린 점수(stake) × min(oddsCap, p/(1−p)) × payoutEdge
   *
   * p/(1−p)는 공정 배당률이고 payoutEdge(< 1)가 하우스 엣지다.
   * 따라서 위험 배치의 기대 손실은 (1 − payoutEdge) × p × stake 로,
   * 걸린 점수가 커질수록 기대값이 서서히 나빠진다 — 판이 깊어질수록
   * "언제 멈출까"가 진짜 수학적 결정이 된다.
   */
  score: {
    riskBoost: 1.5,
    payoutEdge: 0.9,
    oddsCap: 8,
    /** PERFECT는 블록 점수에 배율 (스테이크 배당에는 곱하지 않는다 —
     * 곱하면 기대값이 항상 양수가 되어 영원히 도박하는 게 정답이 된다) */
    perfectMult: 1.25,
    perfectFlat: 15,
    comboStep: 5,
    /** PERFECT 콤보 1개당 하우스 엣지 완화 — 표식을 맞히는 실력이
     * 스테이크 배당의 기대 손실을 직접 줄인다 */
    comboEdgeStep: 0.015,
    /** 엣지 상한 — 1 미만이어야 탈출 시점이 존재한다 */
    edgeCap: 0.97,
  },

  /** 매 턴 좌우에 나타나는 고득점 목표인 운명의 표식 */
  fate: {
    /** 표식 중심으로부터 이 픽셀 이내면 PERFECT */
    targetPx: 8,
    /** 받침 폭에 비례해 계산한 표식 거리의 최소·최대값 */
    minOffset: 22,
    maxOffset: 42,
    supportRatio: 0.24,
    /** 콤보가 높을수록 표식이 조금씩 더 멀어진다 */
    comboOffsetStep: 2,
    comboOffsetMax: 12,
    /** 직전 블록 중심에서 표식까지 허용하는 최대 이동 비율 */
    maxShiftRatio: 0.42,
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
