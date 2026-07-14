import { useSyncExternalStore } from 'react';
import { store } from '../game/state/store';
import type { GameState } from '../types';

export function useGameStore(): GameState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
