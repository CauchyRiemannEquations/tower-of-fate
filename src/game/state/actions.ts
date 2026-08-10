import type {
  BlockTypeId,
  JudgeResult,
  RiskBreakdown,
  RunMode,
} from '../../types';
import { BLOCKS } from '../config/blocks';
import { BALANCE, LS_KEYS } from '../config/balance';
import { tower } from '../systems/tower';
import {
  FateBag,
  hashSeed,
  judgeCollapse,
  mulberry32,
  todayKey,
  todayLabel,
  type FairnessState,
  type Rng,
} from '../systems/rng';
import { checkpointFraction, computeGain } from '../systems/scoring';
import { drawOffers } from '../systems/offers';
import { recordRun } from '../systems/analytics';
import { gameEvents, store, initialState } from './store';
import { sfx } from '../../utils/sound';

// ── 한 판 동안 유지되는 런타임 상태 (스토어에는 뷰만 투영) ──

/**
 * 판의 흐름 난수 — 선택지와 운명의 표식에 쓰인다.
 * 오늘의 운명 모드에서는 날짜 시드로 고정되어 모두가 같은
 * 블록 순서를 받는다. 붕괴 판정 난수(fateBag)는 언제나 별도의
 * 비시드 난수라 결과까지 정해지는 일은 없다.
 */
let flowRng: Rng = Math.random;
let fateBag = new FateBag();
let fairness: FairnessState = { shieldUsed: false };
let toastId = 0;
/** 운명의 표식은 좌우를 번갈아 가며 제안한다. */
let nextFateSide: -1 | 1 = 1;
/** 메뉴의 "플레이 방법"으로 시작된 판인지 — 튜토리얼 종료 시 메인 복귀 */
let tutorialFromMenu = false;

function showToast(text: string) {
  store.setState({ toast: { id: ++toastId, text } });
}

function saveBest(score: number): boolean {
  const { best } = store.getState();
  if (score > best) {
    store.setState({ best: score });
    try {
      localStorage.setItem(LS_KEYS.best, String(score));
    } catch {
      /* 저장 실패는 무시 */
    }
    return true;
  }
  return false;
}

/**
 * 현재 탑을 기준으로 다음 운명의 표식 위치를 만든다.
 * 좌우 교차를 기본으로 하되 현재 받침에서 지나치게 멀어지지 않게 제한한다.
 */
function createFateTarget(combo: number): number {
  const F = BALANCE.fate;
  const below = tower.top();
  const baseX = tower.blocks[0]?.x ?? 0;
  const supportX = below?.x ?? 0;
  const supportWidth = below?.def.width ?? BALANCE.design.groundWidth;
  const comboExtra = Math.min(F.comboOffsetMax, combo * F.comboOffsetStep);
  const distance = Math.min(
    F.maxOffset,
    Math.max(F.minOffset, supportWidth * F.supportRatio + comboExtra),
  );

  let side = nextFateSide;
  let desired = baseX + side * distance;
  const maxShift = Math.max(F.minOffset, supportWidth * F.maxShiftRatio);
  desired = Math.max(supportX - maxShift, Math.min(supportX + maxShift, desired));

  if (Math.abs(desired) > BALANCE.aim.maxOffset) {
    side = side === 1 ? -1 : 1;
    desired = baseX + side * distance;
    desired = Math.max(supportX - maxShift, Math.min(supportX + maxShift, desired));
  }

  const x = Math.round(
    Math.max(-BALANCE.aim.maxOffset, Math.min(BALANCE.aim.maxOffset, desired)),
  );
  nextFateSide = side === 1 ? -1 : 1;
  return x;
}

export const actions = {
  /**
   * 새 판 시작. mode를 생략하면 직전 판과 같은 모드로 시작한다.
   * 오늘의 운명: 날짜 시드로 선택지 순서가 고정된 하루 한 판의 도전.
   */
  startGame(mode?: RunMode) {
    const prev = store.getState();
    const runMode: RunMode = mode ?? prev.mode;

    tower.reset();
    fairness = { shieldUsed: false };
    fateBag = new FateBag();
    if (runMode === 'daily') {
      flowRng = mulberry32(hashSeed(`tower-of-fate:${todayKey()}`));
    } else {
      flowRng = Math.random;
    }
    nextFateSide = flowRng() < 0.5 ? -1 : 1;
    const fateTarget = createFateTarget(0);

    let tutorialStep = -1;
    try {
      if (!localStorage.getItem(LS_KEYS.tutorial)) tutorialStep = 0;
    } catch {
      /* noop */
    }
    store.setState({
      ...initialState(),
      best: prev.best,
      soundOn: prev.soundOn,
      phase: 'choosing',
      mode: runMode,
      dailyLabel: runMode === 'daily' ? todayLabel() : '',
      offers: drawOffers(flowRng, {
        guaranteeSafe: BALANCE.offers.safeFirstHand,
      }),
      fateTargetX: fateTarget,
      tutorialStep,
      tutorialReplay: tutorialFromMenu,
    });
    gameEvents.emit('reset');
  },

  toMenu() {
    tower.reset();
    tutorialFromMenu = false;
    store.setState({
      ...initialState(),
      best: store.getState().best,
      soundOn: store.getState().soundOn,
    });
    gameEvents.emit('reset');
  },

  /** 메뉴의 "플레이 방법" — 튜토리얼을 다시 보여주고 끝나면 메인으로 */
  replayTutorial() {
    try {
      localStorage.removeItem(LS_KEYS.tutorial);
    } catch {
      /* noop */
    }
    tutorialFromMenu = true;
    actions.startGame('free');
  },

  selectBlock(id: BlockTypeId) {
    const s = store.getState();
    if (s.phase !== 'choosing' && s.phase !== 'aiming') return;
    if (!s.offers.includes(id)) return;
    sfx.select();
    store.setState({
      phase: 'aiming',
      selected: id,
      tutorialStep: s.tutorialStep === 0 ? 1 : s.tutorialStep,
    });
    gameEvents.emit('spawn', id);
  },

  /** Phaser가 조준 중 실시간으로 호출 */
  setAimRisk(breakdown: RiskBreakdown) {
    store.setState({ aimRisk: breakdown });
  },

  requestDrop() {
    const s = store.getState();
    if (s.phase !== 'aiming') return;
    store.setState({
      phase: 'dropping',
      tutorialStep: s.tutorialStep === 1 ? 2 : s.tutorialStep,
    });
    sfx.whoosh();
    gameEvents.emit('drop');
  },

  /**
   * Phaser가 블록 착지 직후 호출. 판정·점수 처리를 수행하고
   * 결과에 따라 'survived' 또는 'collapse' 이벤트를 발행한다.
   */
  resolvePlacement(breakdown: RiskBreakdown, x: number) {
    const s = store.getState();
    const id = s.selected;
    if (!id) return;
    const def = BLOCKS[id];

    tower.add(def, x);
    const floor = tower.blocks.length;

    // ── 붕괴 판정 (표시 확률 그대로, 층화 난수로 극단 연속 방지) ──
    const outcome = judgeCollapse(breakdown.total, floor, fairness, () =>
      fateBag.next(),
    );
    store.setState({
      debug: {
        lastRoll: outcome.roll,
        lastEffective: outcome.effective,
        comOffset: tower.comX() - (tower.blocks[0]?.x ?? 0),
        worstOverhang: tower.worstOverhang(),
      },
    });

    // 점수는 생존/붕괴 무관하게 산출해 분석서(기대값)에 기록.
    // 가운데 정렬과 별개로 운명의 표식을 맞힌 경우에만 콤보가 이어진다.
    const perfect = breakdown.perfect;
    const combo = perfect ? s.combo + 1 : 0;
    const gained = computeGain({
      def,
      riskPct: breakdown.total,
      perfect,
      combo,
      stake: s.tower,
    });

    const runLog = [
      ...s.runLog,
      {
        floor,
        risk: breakdown.total,
        survived: !outcome.collapsed,
        gained,
      },
    ];

    if (outcome.collapsed) {
      const stats = { ...s.stats, maxFloor: Math.max(s.stats.maxFloor, floor) };
      store.setState({
        phase: 'collapsing',
        floor,
        stats,
        aimRisk: null,
        runLog,
      });
      sfx.collapse();
      gameEvents.emit('collapse');
      return;
    }

    // ── 생존 ──
    const lucky = breakdown.total >= 50;
    let towerScore = s.tower + gained;
    let vault = s.vault;

    // ── 체크포인트 자동 저장 ──
    const frac = checkpointFraction(floor);
    if (frac > 0) {
      const banked = Math.round(towerScore * frac);
      towerScore -= banked;
      vault += banked;
      showToast(`${floor}층 체크포인트! ${banked}점 자동 저장`);
      sfx.checkpoint();
    }

    const stats = {
      ...s.stats,
      perfects: s.stats.perfects + (perfect ? 1 : 0),
      luckies: s.stats.luckies + (lucky ? 1 : 0),
      nearMisses: s.stats.nearMisses + (outcome.nearMiss ? 1 : 0),
      maxRiskSurvived: Math.max(s.stats.maxRiskSurvived, breakdown.total),
      maxFloor: Math.max(s.stats.maxFloor, floor),
      blockCounts: {
        ...s.stats.blockCounts,
        [id]: s.stats.blockCounts[id] + 1,
      },
    };

    const judge: JudgeResult = {
      kind: perfect ? 'perfect' : lucky ? 'lucky' : outcome.nearMiss ? 'nearmiss' : 'safe',
      perfect,
      lucky,
      nearMiss: outcome.nearMiss,
      gained,
      risk: breakdown.total,
    };

    store.setState({
      phase: 'choosing',
      floor,
      tower: towerScore,
      vault,
      combo,
      stats,
      lastJudge: judge,
      selected: null,
      aimRisk: null,
      fateTargetX: createFateTarget(combo),
      offers: drawOffers(flowRng),
      runLog,
    });

    gameEvents.emit('survived', judge);
  },

  /** Phaser 붕괴 애니메이션 종료 후 호출 */
  finishCollapse() {
    const s = store.getState();
    const finalScore = s.vault;
    const newBest = saveBest(finalScore);
    recordRun(s.runLog);
    store.setState({
      phase: 'gameover',
      tower: 0,
      gameOver: {
        escaped: false,
        finalScore,
        newBest,
        towerAtStake: s.tower,
      },
    });
  },

  /** 점수 확정 후 탈출 */
  bankAndEscape() {
    const s = store.getState();
    if (s.phase !== 'choosing' && s.phase !== 'aiming') return;
    if (s.tower <= 0 && s.vault <= 0) return;
    const finalScore = s.vault + s.tower;
    const newBest = saveBest(finalScore);
    recordRun(s.runLog);
    sfx.bank();
    store.setState({
      phase: 'gameover',
      vault: finalScore,
      tower: 0,
      selected: null,
      aimRisk: null,
      gameOver: {
        escaped: true,
        finalScore,
        newBest,
        towerAtStake: s.tower,
      },
    });
    gameEvents.emit('banked');
  },

  dismissTutorialStep() {
    const s = store.getState();
    if (s.tutorialStep === 2) {
      try {
        localStorage.setItem(LS_KEYS.tutorial, 'done');
      } catch {
        /* noop */
      }
      // 메뉴의 "플레이 방법"으로 본 경우에만 메인으로 복귀,
      // 첫 게임 중의 튜토리얼이면 판을 계속 진행한다
      if (s.tutorialReplay) {
        actions.toMenu();
        return;
      }
      store.setState({ tutorialStep: -1 });
    }
  },

  toggleSound() {
    const next = !store.getState().soundOn;
    store.setState({ soundOn: next });
    try {
      localStorage.setItem(LS_KEYS.sound, next ? 'on' : 'off');
    } catch {
      /* noop */
    }
    sfx.setEnabled(next);
    if (next) sfx.select();
  },
};

// ?debug 모드에서 콘솔 디버깅용으로 노출
if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
  (window as unknown as { __actions: typeof actions }).__actions = actions;
}

export { BALANCE };
