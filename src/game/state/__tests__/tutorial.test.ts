import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actions } from '../actions';
import { store } from '../store';

describe('play instructions', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    actions.toMenu();
  });

  it('starts the three-step guide and returns to the main menu when completed', () => {
    actions.replayTutorial();

    expect(store.getState()).toMatchObject({
      phase: 'choosing',
      tutorialStep: 0,
    });

    store.setState({ tutorialStep: 2 });
    actions.dismissTutorialStep();

    expect(store.getState()).toMatchObject({
      phase: 'menu',
      tutorialStep: -1,
    });
    expect(values.get('towerOfFate.tutorialDone')).toBe('done');
  });
});
