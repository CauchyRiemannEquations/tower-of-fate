import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';

/** 터치 지점을 나타내는 링 애니메이션 (이모지 대신) */
function TapDot({ variant }: { variant: 'bounce' | 'slide' }) {
  return (
    <span className={`tap-dot tap-${variant}`} aria-hidden>
      <i />
    </span>
  );
}

export function TutorialOverlay() {
  const s = useGameStore();
  if (s.tutorialStep < 0 || s.phase === 'menu' || s.phase === 'gameover') {
    return null;
  }

  if (s.tutorialStep === 0) {
    return (
      <div className="tutorial tutorial-cards">
        <div className="tut-bubble">
          <span className="tut-step">1 / 3</span>
          세 블록 중 하나를 선택하세요
        </div>
        <TapDot variant="bounce" />
      </div>
    );
  }

  if (s.tutorialStep === 1 && s.phase === 'aiming') {
    return (
      <div className="tutorial tutorial-drag">
        <div className="tut-bubble">
          <span className="tut-step">2 / 3</span>
          가운데는 안전하지만 황금 표식을 맞히면
          <br />
          PERFECT와 콤보! 드래그한 뒤 떨어뜨리세요
        </div>
        <TapDot variant="slide" />
      </div>
    );
  }

  if (s.tutorialStep === 2 && s.phase === 'choosing') {
    return (
      <div className="tutorial tutorial-bank">
        <div className="tut-bubble tut-bubble-action">
          <span className="tut-step">3 / 3</span>
          탑이 무너지면 <b>탑 위 점수</b>를 잃어요.
          <br />
          언제든 <b>점수 확정</b>으로 안전하게 탈출!
          <button className="btn btn-primary btn-sm" onClick={actions.dismissTutorialStep}>
            {s.tutorialReplay ? '메인으로 돌아가기' : '알겠어요!'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
