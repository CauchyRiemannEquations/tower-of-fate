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
  | 'gameover';

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
}
