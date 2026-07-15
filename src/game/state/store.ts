import type { GameState } from '../../types';
import { LS_KEYS } from '../config/balance';

type Listener = () => void;

function loadBest(): number {
  try {
    return Number(localStorage.getItem(LS_KEYS.best) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function loadSound(): boolean {
  try {
    return localStorage.getItem(LS_KEYS.sound) !== 'off';
  } catch {
    return true;
  }
}

export function initialState(): GameState {
  return {
    phase: 'menu',
    floor: 0,
    vault: 0,
    tower: 0,
    best: loadBest(),
    offers: [],
    selected: null,
    aimRisk: null,
    combo: 0,
    stats: {
      perfects: 0,
      luckies: 0,
      nearMisses: 0,
      maxRiskSurvived: 0,
      maxFloor: 0,
      blockCounts: { wood: 0, stone: 0, glass: 0, gold: 0, foundation: 0 },
    },
    soundOn: loadSound(),
    tutorialStep: -1,
    tutorialReplay: false,
    toast: null,
    gameOver: null,
    lastJudge: null,
    debug: { lastRoll: -1, lastEffective: 0, comOffset: 0 },
    deck: {
      drawCount: 0,
      discardCount: 0,
      remainingByType: { wood: 0, stone: 0, glass: 0, gold: 0, foundation: 0 },
      upcoming: [],
    },
    rerolls: 0,
    contract: null,
    contractOffers: null,
    checkpointOffers: null,
    paths: [],
    relics: [],
    runLog: [],
  };
}

/**
 * React와 Phaser가 함께 쓰는 단일 상태 저장소.
 * React는 useSyncExternalStore로 구독하고, Phaser는 이벤트로 명령을 받는다.
 */
class Store {
  private state: GameState = initialState();
  private listeners = new Set<Listener>();

  getState = (): GameState => this.state;

  setState = (partial: Partial<GameState>) => {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l());
  };

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
}

export const store = new Store();

// ?debug 모드에서 콘솔 디버깅용으로 노출
if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
  (window as unknown as { __store: Store }).__store = store;
}

/** 소형 이벤트 버스 — 스토어/액션 → Phaser 씬 명령 전달용 */
type Handler = (...args: any[]) => void;

class TinyEmitter {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, fn: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Handler) {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach((fn) => fn(...args));
  }
}

export const gameEvents = new TinyEmitter();
