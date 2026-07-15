import type {
  BlockTypeId,
  CheckpointOption,
  ContractId,
  JudgeResult,
  PathId,
  RelicId,
  RiskBreakdown,
} from '../../types';
import { BLOCKS } from '../config/blocks';
import { BALANCE, LS_KEYS } from '../config/balance';
import { tower } from '../systems/tower';
import { judgeCollapse, type FairnessState } from '../systems/rng';
import { checkpointFraction, computeGain } from '../systems/scoring';
import { placementSide } from '../systems/risk';
import {
  buildInitialDeck,
  drawHand,
  discardCards,
  addCards,
  deckView,
  type DeckState,
} from '../systems/deck';
import {
  buildRiskMods,
  buildScoreMods,
  initialEffects,
  type RunEffects,
  type RiskMods,
} from '../systems/modifiers';
import {
  advanceContract,
  contractView,
  offerContracts,
  startContract,
  type ActiveContract,
} from '../systems/contracts';
import {
  MAX_RELICS,
  offerCheckpointOptions,
  PATH_SPECS,
  RELIC_SPECS,
} from '../systems/checkpoints';
import { recordRun } from '../systems/analytics';
import { gameEvents, store, initialState } from './store';
import { sfx } from '../../utils/sound';

// ── 한 판 동안 유지되는 런타임 상태 (스토어에는 뷰만 투영) ──

let deck: DeckState = { drawPile: [], discardPile: [] };
let effects: RunEffects = initialEffects();
let activeContract: ActiveContract | null = null;
let rerolls = 0;
let insuranceUsed = false;
let fairness: FairnessState = { shieldUsed: false };
let toastId = 0;
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

/** 예언자의 길/렌즈 보유 시 다음 카드 1장을 미리 보여준다 */
function peekCount(): number {
  return effects.paths.includes('prophet') || effects.relics.includes('lens')
    ? 1
    : 0;
}

/** 런타임 상태를 스토어 뷰로 동기화 */
function syncSystems() {
  store.setState({
    deck: deckView(deck, peekCount()),
    rerolls,
    contract:
      activeContract && activeContract.status === 'active'
        ? contractView(activeContract)
        : null,
    paths: [...effects.paths],
    relics: [...effects.relics],
  });
}

/** TowerScene이 조준 위험 계산에 쓰는 현재 수정자 */
export function getRiskMods(): RiskMods {
  return buildRiskMods(effects);
}

/** 계약 실행 가능성 판단용: 덱·버림·선택지에 존재하는 블록 종류 수 */
function availableTypeCount(): number {
  const types = new Set<BlockTypeId>([
    ...deck.drawPile,
    ...deck.discardPile,
    ...store.getState().offers,
  ]);
  return types.size;
}

/** 이번 층에서 계약을 제안해야 하는가 (체크포인트 층은 건너뜀) */
function shouldOfferContract(floor: number): boolean {
  const c = BALANCE.contracts;
  if (activeContract && activeContract.status === 'active') return false;
  if (floor < c.firstFloor) return false;
  if (floor % BALANCE.checkpoints.every === 0) return false;
  return (floor - c.firstFloor) % c.everyFloors === 0;
}

function applyContractReward(id: ContractId) {
  const E = BALANCE.effects;
  const dur = BALANCE.contracts.buffDuration;
  switch (id) {
    case 'balance':
      effects.buffTiltTurns = dur;
      showToast('계약 성공! 기울기 위험 절반 (5회)');
      break;
    case 'greed':
      effects.buffGreedTurns = dur;
      showToast('계약 성공! 고위험 배율 +0.3 (5회)');
      break;
    case 'materials':
      rerolls += 1;
      showToast('계약 성공! 리롤 +1');
      break;
    case 'engineer':
      effects.buffHighValueCut = true;
      showToast('계약 성공! 다음 유리/금괴 위험 -10%');
      break;
    case 'symmetry': {
      const s = store.getState();
      store.setState({ tower: s.tower + E.symmetryInstantScore });
      effects.buffTiltTurns = dur;
      showToast(`계약 성공! +${E.symmetryInstantScore}점, 기울기 위험 절반`);
      break;
    }
  }
  sfx.checkpoint();
}

export const actions = {
  startGame() {
    tower.reset();
    fairness = { shieldUsed: false };
    deck = buildInitialDeck();
    effects = initialEffects();
    activeContract = null;
    rerolls = 0;
    insuranceUsed = false;

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
      offers: drawHand(deck, Math.random, {
        guaranteeSafe: BALANCE.deck.safeFirstHand,
      }),
      tutorialStep,
      tutorialReplay: tutorialFromMenu,
    });
    syncSystems();
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
    actions.startGame();
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

  /** 리롤 — 현재 선택지를 버리고 새로  3장 */
  reroll() {
    const s = store.getState();
    if (s.phase !== 'choosing') return;
    if (rerolls <= 0) return;
    rerolls -= 1;
    discardCards(deck, s.offers);
    const offers = drawHand(deck);
    sfx.whoosh();
    store.setState({ offers });
    syncSystems();
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
   * Phaser가 블록 착지 직후 호출. 판정·점수·계약·덱 처리를 수행하고
   * 결과에 따라 'survived' 또는 'collapse' 이벤트를 발행한다.
   */
  resolvePlacement(breakdown: RiskBreakdown, x: number) {
    const s = store.getState();
    const id = s.selected;
    if (!id) return;
    const def = BLOCKS[id];

    const side = placementSide(x);
    const offset = x - (tower.blocks[0]?.x ?? 0);

    tower.add(def, x);
    const floor = tower.blocks.length;

    // ── 덱 처리: 배치 카드는 탑이 되고, 남은 선택지는 버림 더미로 ──
    const rest = [...s.offers];
    const restIdx = rest.indexOf(id);
    if (restIdx >= 0) rest.splice(restIdx, 1);
    discardCards(deck, rest);

    // ── 붕괴 판정 (표시 확률 그대로 사용) ──
    const outcome = judgeCollapse(breakdown.total, floor, fairness);
    store.setState({
      debug: {
        lastRoll: outcome.roll,
        lastEffective: outcome.effective,
        comOffset: tower.comX() - (tower.blocks[0]?.x ?? 0),
      },
    });

    // 점수는 생존/붕괴 무관하게 산출해 분석서(기대값)에 기록
    const perfect = breakdown.perfect;
    const combo = perfect ? s.combo + 1 : 0;
    const scoreMods = buildScoreMods(effects);
    const gained = computeGain({
      def,
      riskPct: breakdown.total,
      perfect,
      combo,
      side,
      mods: scoreMods,
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
      // 운명의 보험증서: 한 번, 탑 위 점수 절반 보존
      let vault = s.vault;
      if (effects.relics.includes('insurance') && !insuranceUsed) {
        insuranceUsed = true;
        const kept = Math.round(s.tower * BALANCE.effects.insuranceKeep);
        if (kept > 0) {
          vault += kept;
          showToast(`보험증서 발동! ${kept}점 보존`);
        }
      }
      const stats = { ...s.stats, maxFloor: Math.max(s.stats.maxFloor, floor) };
      store.setState({
        phase: 'collapsing',
        floor,
        vault,
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

    // 효과 상태 갱신 (점수 산출 후)
    if (effects.buffTiltTurns > 0) effects.buffTiltTurns -= 1;
    if (effects.buffGreedTurns > 0) effects.buffGreedTurns -= 1;
    if (effects.buffHighValueCut && (def.fragile || def.id === 'gold')) {
      effects.buffHighValueCut = false;
    }
    effects.prevSide = side;
    effects.glassStreak = def.fragile ? effects.glassStreak + 1 : 0;

    // ── 계약 진행 ──
    if (activeContract && activeContract.status === 'active') {
      activeContract = advanceContract(activeContract, {
        blockId: id,
        side,
        offset,
        risk: breakdown.total,
        perfect,
      });
      if (activeContract.status === 'success') {
        applyContractReward(activeContract.id);
        gameEvents.emit('contractResult', true);
        activeContract = null;
      } else if (activeContract.status === 'failed') {
        showToast('계약이 조용히 만료되었다…');
        gameEvents.emit('contractResult', false);
        activeContract = null;
      }
    }

    // ── 체크포인트 자동 저장 ──
    const frac = checkpointFraction(floor);
    const isCheckpoint = frac > 0;
    if (isCheckpoint) {
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

    // 다음 손패는 즉시 드로우 (모달은 그 위에 뜬다)
    const offers = drawHand(deck);

    // ── 다음 단계 결정: 체크포인트 선택 → 계약 제안 → 일반 진행 ──
    let phase: 'choosing' | 'contract' | 'checkpoint' = 'choosing';
    let contractOffers = null as ReturnType<typeof offerContracts> | null;
    let checkpointOffers = null as CheckpointOption[] | null;

    if (isCheckpoint) {
      phase = 'checkpoint';
      checkpointOffers = offerCheckpointOptions(effects.paths, effects.relics);
    } else if (shouldOfferContract(floor)) {
      phase = 'contract';
      contractOffers = offerContracts(availableTypeCount());
    }

    store.setState({
      phase,
      floor,
      tower: towerScore,
      vault,
      combo,
      stats,
      lastJudge: judge,
      selected: null,
      aimRisk: null,
      offers,
      runLog,
      contractOffers,
      checkpointOffers,
    });
    syncSystems();

    gameEvents.emit('survived', judge);
  },

  /** 계약 선택 */
  chooseContract(id: ContractId) {
    const s = store.getState();
    if (s.phase !== 'contract') return;
    activeContract = startContract(id);
    sfx.select();
    store.setState({ phase: 'choosing', contractOffers: null });
    syncSystems();
  },

  skipContract() {
    if (store.getState().phase !== 'contract') return;
    store.setState({ phase: 'choosing', contractOffers: null });
  },

  /** 체크포인트 길/유물 선택 */
  chooseCheckpoint(option: CheckpointOption) {
    const s = store.getState();
    if (s.phase !== 'checkpoint') return;

    if (option.kind === 'path') {
      const spec = PATH_SPECS[option.id as PathId];
      if (!effects.paths.includes(spec.id)) {
        effects.paths.push(spec.id);
        if (spec.deckAdds.length > 0) {
          addCards(deck, [...spec.deckAdds]);
        }
        rerolls += spec.rerollGain;
        showToast(`${spec.name} 선택!`);
      }
    } else {
      const spec = RELIC_SPECS[option.id as RelicId];
      if (
        !effects.relics.includes(spec.id) &&
        effects.relics.length < MAX_RELICS
      ) {
        effects.relics.push(spec.id);
        rerolls += spec.rerollGain;
        showToast(`유물 획득: ${spec.name}`);
      }
    }
    sfx.checkpoint();
    store.setState({ phase: 'choosing', checkpointOffers: null });
    syncSystems();
  },

  skipCheckpoint() {
    if (store.getState().phase !== 'checkpoint') return;
    store.setState({ phase: 'choosing', checkpointOffers: null });
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
    let finalScore = s.vault + s.tower;
    // 황금 계약서: 확정 보너스
    if (effects.relics.includes('goldenSeal')) {
      finalScore = Math.round(finalScore * (1 + BALANCE.effects.goldenSealBonus));
    }
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

export { BALANCE };
