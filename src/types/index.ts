export type BlockTypeId = 'wood' | 'stone' | 'glass' | 'gold' | 'foundation';

export interface BlockDef {
  id: BlockTypeId;
  name: string;
  width: number;
  height: number;
  /** 1(가벼움) ~ 5(매우 무거움) */
  weight: number;
  /** 블록 고유 기본 붕괴 위험(%) */
  baseRisk: number;
  score: number;
  desc: string;
  fragile?: boolean;
  stabilizer?: boolean;
}

export interface TowerBlock {
  def: BlockDef;
  /** 탑 기준 중심으로부터의 x 오프셋 */
  x: number;
}

export interface RiskFactor {
  label: string;
  /** 표시 위험(%)에 대한 이 요인의 기여분 (완화 요인은 음수) */
  delta: number;
}

export interface RiskBreakdown {
  total: number;
  factors: RiskFactor[];
  /** 운명의 표식 적중 여부. 안전한 중심 배치와는 별개다. */
  perfect: boolean;
}

export type Phase =
  | 'menu'
  | 'choosing'
  | 'aiming'
  | 'dropping'
  | 'collapsing'
  | 'gameover';

/** 일반 판 / 모두가 같은 블록 순서를 받는 오늘의 운명 */
export type RunMode = 'free' | 'daily';

/** 운명의 시험 HUD 칩 표시용 */
export interface TrialView {
  name: string;
  desc: string;
  progressText: string;
  /** 만료까지 남은 배치 수 */
  remaining: number;
}

// ── 운명 분석서 ─────────────────────────────────────

export interface RiskAttempt {
  floor: number;
  /** 판정에 실제 사용된 붕괴 확률(%) — 표시 확률과 동일 */
  risk: number;
  survived: boolean;
  /** 생존 시 획득 점수 */
  gained: number;
}

export interface BucketStats {
  attempts: number;
  survived: number;
  /** 이론 생존율 평균 계산용 위험 합 */
  riskSum: number;
}

export type BucketKey = 'b0' | 'b20' | 'b40' | 'b60';

export type CumulativeStats = Record<BucketKey, BucketStats>;

export interface RunStats {
  perfects: number;
  luckies: number;
  nearMisses: number;
  maxRiskSurvived: number;
  maxFloor: number;
  blockCounts: Record<BlockTypeId, number>;
}

export type JudgeKind = 'perfect' | 'lucky' | 'safe' | 'nearmiss';

export interface JudgeResult {
  kind: JudgeKind;
  perfect: boolean;
  lucky: boolean;
  nearMiss: boolean;
  gained: number;
  risk: number;
}

export interface GameOverInfo {
  escaped: boolean;
  finalScore: number;
  newBest: boolean;
  /** 마지막 결정 시점에 걸려 있던 탑 위 점수 (분석서 기댓값용) */
  towerAtStake: number;
}

export interface DebugInfo {
  lastRoll: number;
  lastEffective: number;
  comOffset: number;
  /** 층별 정역학 최악 오버행 비율 (1.0 = 받침 가장자리) */
  worstOverhang: number;
}

export interface GameState {
  phase: Phase;
  mode: RunMode;
  /** 오늘의 운명 표시용 날짜 라벨 (예: "8월 10일") */
  dailyLabel: string;
  floor: number;
  vault: number;
  tower: number;
  best: number;
  offers: BlockTypeId[];
  selected: BlockTypeId | null;
  aimRisk: RiskBreakdown | null;
  /** 탑 기준 x 좌표로 표시되는 이번 턴의 운명의 표식 */
  fateTargetX: number;
  combo: number;
  stats: RunStats;
  soundOn: boolean;
  /** -1: 꺼짐, 0~2: 진행 중 (튜토리얼은 메뉴에서만 시작하는 연습 판) */
  tutorialStep: number;
  /** 튜토리얼을 한 번이라도 마쳤는지 — 메뉴의 첫 방문 유도 배지용 */
  tutorialDone: boolean;
  toast: { id: number; text: string } | null;
  gameOver: GameOverInfo | null;
  lastJudge: JudgeResult | null;
  debug: DebugInfo;
  trial: TrialView | null;
  runLog: RiskAttempt[];
}
