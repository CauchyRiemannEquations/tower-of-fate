import type { BlockTypeId, JudgeResult, RiskBreakdown } from '../../types';
import { BLOCKS } from '../config/blocks';
import { BALANCE, LS_KEYS } from '../config/balance';
import { tower } from '../systems/tower';
import { judgeCollapse, type FairnessState } from '../systems/rng';
import { checkpointFraction, computeGain } from '../systems/scoring';
import { generateOffers } from '../systems/offers';
import { gameEvents, store, initialState } from './store';
import { sfx } from '../../utils/sound';

let fairness: FairnessState = { shieldUsed: false };
let toastId = 0;

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

export const actions = {
  startGame() {
    tower.reset();
    fairness = { shieldUsed: false };
    const prev = store.getState();
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
      offers: generateOffers(0),
      tutorialStep,
    });
    gameEvents.emit('reset');
  },

  toMenu() {
    tower.reset();
    store.setState({ ...initialState(), best: store.getState().best, soundOn: store.getState().soundOn });
    gameEvents.emit('reset');
  },

  replayTutorial() {
    try {
      localStorage.removeItem(LS_KEYS.tutorial);
    } catch {
      /* noop */
    }
    actions.startGame();
  },

  selectBlock(id: BlockTypeId) {
    const s = store.getState();
    if (s.phase !== 'choosing' && s.phase !== 'aiming') return;
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
   * Phaser가 블록 착지 직후 호출. 판정과 점수 계산을 수행하고
   * 결과에 따라 'survived' 또는 'collapse' 이벤트를 발행한다.
   */
  resolvePlacement(breakdown: RiskBreakdown, x: number) {
    const s = store.getState();
    const id = s.selected;
    if (!id) return;
    const def = BLOCKS[id];

    tower.add(def, x);
    const floor = tower.blocks.length;

    const outcome = judgeCollapse(breakdown.total, floor, fairness);
    store.setState({
      debug: {
        lastRoll: outcome.roll,
        lastEffective: outcome.effective,
        comOffset: tower.comX() - (tower.blocks[0]?.x ?? 0),
      },
    });

    if (outcome.collapsed) {
      const stats = { ...s.stats, maxFloor: Math.max(s.stats.maxFloor, floor) };
      store.setState({ phase: 'collapsing', floor, stats, aimRisk: null });
      sfx.collapse();
      gameEvents.emit('collapse');
      return;
    }

    // ── 생존 ──
    const perfect = breakdown.perfect;
    const combo = perfect ? s.combo + 1 : 0;
    const lucky = breakdown.total >= 50;
    const gained = computeGain({ def, riskPct: breakdown.total, perfect, combo });

    let towerScore = s.tower + gained;
    let vault = s.vault;

    // 체크포인트 자동 저장
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
      offers: generateOffers(floor),
    });

    gameEvents.emit('survived', judge);
  },

  /** Phaser 붕괴 애니메이션 종료 후 호출 */
  finishCollapse() {
    const s = store.getState();
    const finalScore = s.vault;
    const newBest = saveBest(finalScore);
    store.setState({
      phase: 'gameover',
      tower: 0,
      gameOver: { escaped: false, finalScore, newBest },
    });
  },

  /** 점수 확정 후 탈출 */
  bankAndEscape() {
    const s = store.getState();
    if (s.phase !== 'choosing' && s.phase !== 'aiming') return;
    if (s.tower <= 0 && s.vault <= 0) return;
    const finalScore = s.vault + s.tower;
    const newBest = saveBest(finalScore);
    sfx.bank();
    store.setState({
      phase: 'gameover',
      vault: finalScore,
      tower: 0,
      selected: null,
      aimRisk: null,
      gameOver: { escaped: true, finalScore, newBest },
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

export { BALANCE };
