import { useState } from 'react';
import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';
import { unlockAudio } from '../utils/sound';
import { RankModal } from './RankModal';
import { IcBook, IcPlay, IcSoundOff, IcSoundOn, IcTrophy } from './icons';

export function MenuScreen() {
  const s = useGameStore();
  const [showRank, setShowRank] = useState(false);

  return (
    <div className="overlay menu-screen">
      <div className="menu-tower" aria-hidden>
        <div className="mt-block mt-glass" />
        <div className="mt-block mt-gold" />
        <div className="mt-block mt-stone" />
        <div className="mt-block mt-wood" />
        <div className="mt-block mt-foundation" />
      </div>
      <h1 className="title">
        운명의 탑
        <span className="title-sub">TOWER OF FATE</span>
      </h1>
      <p className="tagline">한 층만 더? 아니면 지금 탈출?</p>
      {s.best > 0 && (
        <div className="menu-best">
          <IcTrophy />
          최고 기록 {s.best.toLocaleString()}점
        </div>
      )}
      <button
        className="btn btn-primary btn-lg"
        onClick={() => {
          unlockAudio();
          actions.startGame();
        }}
      >
        <span className="btn-main">
          <IcPlay size={18} />
          게임 시작
        </span>
      </button>
      <div className="menu-sub-actions">
        <button className="btn btn-rank" onClick={() => setShowRank(true)}>
          <span className="btn-main">
            <IcTrophy />
            랭킹
          </span>
        </button>
        <button className="btn btn-ghost" onClick={actions.replayTutorial}>
          <span className="btn-main">
            <IcBook />
            플레이 방법
          </span>
        </button>
        <button className="btn btn-ghost" onClick={actions.toggleSound}>
          <span className="btn-main">
            {s.soundOn ? <IcSoundOn /> : <IcSoundOff />}
            {s.soundOn ? '사운드 켜짐' : '사운드 꺼짐'}
          </span>
        </button>
      </div>
      {showRank && <RankModal onClose={() => setShowRank(false)} />}
    </div>
  );
}
