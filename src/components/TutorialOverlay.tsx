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

/**
 * 튜토리얼 — 메뉴의 "플레이 방법"에서만 시작하는 연습 판 위에 뜬다.
 * 마지막 단계의 버튼을 누르면 메인으로 돌아가며,
 * 본 게임은 플레이어가 직접 시작한다.
 */
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
          세 블록 중 하나를 고르세요.
          <br />
          카드의 <b>위험 %</b>는 그 블록의 기본 붕괴 확률이에요
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
          드래그로 위치를 조절하면 위의 <b>붕괴 위험</b>과{' '}
          <b>기댓값</b>이 실시간으로 바뀌어요.
          <br />
          가운데는 안전, <b>황금 표식</b>을 맞히면 PERFECT!
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
          탑 위 점수는 무너지면 사라져요. 5층마다 일부가 자동 저장되고,
          <br />
          언제든 <b>점수 확정</b>으로 안전하게 탈출!
          <br />
          2층부터 나타나는 <b>운명의 시험</b>도 노려보세요
          <button className="btn btn-primary btn-sm" onClick={actions.dismissTutorialStep}>
            튜토리얼 마치기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
