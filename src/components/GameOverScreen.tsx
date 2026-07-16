import { useState } from 'react';
import { actions } from '../game/state/actions';
import { useGameStore } from '../hooks/useGameStore';
import { BLOCKS } from '../game/config/blocks';
import type { BlockTypeId } from '../types';
import { IcHome, IcRestart, IcTrophy } from './icons';
import { FateReport } from './FateReport';
import { RankModal } from './RankModal';

function favoriteBlock(counts: Record<BlockTypeId, number>): string {
  const ids = Object.keys(counts) as BlockTypeId[];
  const best = ids.reduce((a, b) => (counts[b] > counts[a] ? b : a), ids[0]);
  return counts[best] > 0 ? `${BLOCKS[best].name} ×${counts[best]}` : '—';
}

export function GameOverScreen() {
  const s = useGameStore();
  const [showRank, setShowRank] = useState(false);
  const info = s.gameOver;
  if (!info) return null;

  return (
    <div className="overlay gameover-screen">
      <div className="panel">
        <h2 className={info.escaped ? 'go-title escaped' : 'go-title collapsed'}>
          {info.escaped ? '탈출 성공!' : '탑이 무너졌다…'}
        </h2>
        <div className="final-score">
          {info.finalScore.toLocaleString()}
          <span className="final-score-unit">점</span>
        </div>
        {info.newBest && <div className="new-best">최고 기록 갱신!</div>}

        <div className="stats-grid">
          <div className="stat">
            <span className="stat-label">최고 층수</span>
            <span className="stat-value">{s.stats.maxFloor}층</span>
          </div>
          <div className="stat">
            <span className="stat-label">최고 위험 생존</span>
            <span className="stat-value">{s.stats.maxRiskSurvived}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">PERFECT</span>
            <span className="stat-value">{s.stats.perfects}회</span>
          </div>
          <div className="stat">
            <span className="stat-label">LUCKY</span>
            <span className="stat-value">{s.stats.luckies}회</span>
          </div>
          <div className="stat stat-wide">
            <span className="stat-label">가장 많이 쌓은 블록</span>
            <span className="stat-value">{favoriteBlock(s.stats.blockCounts)}</span>
          </div>
        </div>

        <FateReport />

        <div className="go-buttons">
          <button className="btn btn-primary" onClick={actions.startGame}>
            <span className="btn-main">
              <IcRestart />
              다시 시작
            </span>
          </button>
          <button className="btn btn-rank" onClick={() => setShowRank(true)}>
            <span className="btn-main">
              <IcTrophy />
              랭킹 등록하기
            </span>
          </button>
          <button className="btn btn-ghost" onClick={actions.toMenu}>
            <span className="btn-main">
              <IcHome />
              메인 화면
            </span>
          </button>
        </div>
      </div>
      {showRank && (
        <RankModal
          onClose={() => setShowRank(false)}
          submit={{
            score: info.finalScore,
            floor: s.stats.maxFloor,
            maxRisk: s.stats.maxRiskSurvived,
          }}
        />
      )}
    </div>
  );
}
