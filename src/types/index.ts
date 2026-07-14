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
  delta: number;
}

export interface RiskBreakdown {
  total: number;
  factors: RiskFactor[];
  perfect: boolean;
}

export type Phase =
  | 'menu'
  | 'choosing'
  | 'aiming'
  | 'dropping'
  | 'collapsing'
  | 'contract'
  | 'checkpoint'
  | 'gameover';

// ── 운명 덱 ─────────────────────────────────────────

export interface DeckView {
  drawCount: number;
  discardCount: number;
  /** 드로우 더미 기준 종류별 남은 수량 */
  remainingByType: Record<BlockTypeId, number>;
  /** 예언자의 길/렌즈 보유 시 미리 보이는 다음 카드들 */
  upcoming: BlockTypeId[];
}

// ── 예약 슬롯 ───────────────────────────────────────

export interface ReserveView {
  block: BlockTypeId | null;
  /** 남은 예약 사용권 (체크포인트마다 회복) */
  uses: number;
}

// ── 예언 계약 ───────────────────────────────────────

export type ContractId =
  | 'balance'
  | 'greed'
  | 'materials'
  | 'engineer'
  | 'symmetry';

export interface ContractOfferView {
  id: ContractId;
  name: string;
  desc: string;
  reward: string;
}

export interface ContractView {
  id: ContractId;
  name: string;
  desc: string;
  progressText: string;
  /** 계약 만료까지 남은 배치 수 */
  remaining: number;
}

// ── 체크포인트 선택 ─────────────────────────────────

export type PathId = 'stable' | 'greed' | 'glass' | 'balance' | 'prophet';

export type RelicId =
  | 'insurance'
  | 'scales'
  | 'dice'
  | 'geometer'
  | 'lens'
  | 'hourglass'
  | 'wedge'
  | 'goldenSeal';

export interface CheckpointOption {
  kind: 'path' | 'relic';
  id: PathId | RelicId;
  name: string;
  desc: string;
  tradeoff?: string;
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
  /** 마지막 결정 시점에 걸려 있던 탑 위 점수 (분석서 기대값용) */
  towerAtStake: number;
}

export interface DebugInfo {
  lastRoll: number;
  lastEffective: number;
  comOffset: number;
}

export interface GameState {
  phase: Phase;
  floor: number;
  vault: number;
  tower: number;
  best: number;
  offers: BlockTypeId[];
  selected: BlockTypeId | null;
  aimRisk: RiskBreakdown | null;
  combo: number;
  stats: RunStats;
  soundOn: boolean;
  /** -1: 꺼짐, 0~2: 진행 중 */
  tutorialStep: number;
  toast: { id: number; text: string } | null;
  gameOver: GameOverInfo | null;
  lastJudge: JudgeResult | null;
  debug: DebugInfo;
  // ── 확장 시스템 ──
  deck: DeckView;
  reserve: ReserveView;
  /** 남은 리롤 횟수 (모래시계/예언자의 길) */
  rerolls: number;
  contract: ContractView | null;
  contractOffers: ContractOfferView[] | null;
  checkpointOffers: CheckpointOption[] | null;
  paths: PathId[];
  relics: RelicId[];
  runLog: RiskAttempt[];
}
