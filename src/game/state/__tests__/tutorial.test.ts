import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actions } from '../actions';
import { store } from '../store';

describe('플레이 방법 (튜토리얼)', () => {
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

  it('메뉴에서 시작한 연습 판이 끝나면 본 게임이 아니라 메인으로 돌아간다', () => {
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
      tutorialDone: true,
    });
    expect(values.get('towerOfFate.tutorialDone')).toBe('done');
  });

  it('본 게임 시작에는 튜토리얼이 끼어들지 않는다', () => {
    // 튜토리얼을 본 적 없는 첫 방문이라도
    expect(values.has('towerOfFate.tutorialDone')).toBe(false);
    actions.startGame('free');
    expect(store.getState().tutorialStep).toBe(-1);
  });

  it('연습 판 뒤에 시작한 본 게임에는 튜토리얼 플래그가 남지 않는다', () => {
    actions.replayTutorial();
    store.setState({ tutorialStep: 2 });
    actions.dismissTutorialStep();

    actions.startGame('free');
    expect(store.getState().tutorialStep).toBe(-1);
  });
});
