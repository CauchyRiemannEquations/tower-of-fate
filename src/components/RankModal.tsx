import { useEffect, useState } from 'react';
import {
  fetchTopScores,
  LEADERBOARD_LIMIT,
  NICKNAME_MAX,
  submitScore,
  type ScoreEntry,
} from '../firebase/leaderboard';
import { isFirebaseConfigured } from '../firebase/config';
import { LS_KEYS } from '../game/config/balance';
import { IcTrophy } from './icons';

interface SubmitInfo {
  score: number;
  floor: number;
  maxRisk: number;
}

interface RankModalProps {
  onClose: () => void;
  /** 게임 종료 화면에서 열 때: 이번 판 점수 등록 UI를 함께 보여준다 */
  submit?: SubmitInfo;
}

function loadNickname(): string {
  try {
    return localStorage.getItem(LS_KEYS.nickname) ?? '';
  } catch {
    return '';
  }
}

type LoadState = 'loading' | 'ready' | 'error' | 'unconfigured';

export function RankModal({ onClose, submit }: RankModalProps) {
  const [state, setState] = useState<LoadState>('loading');
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [name, setName] = useState(loadNickname);
  const [submitState, setSubmitState] = useState<'idle' | 'busy' | 'done' | 'fail'>(
    'idle',
  );

  const refresh = (forceRefresh = false) => {
    setState('loading');
    fetchTopScores(LEADERBOARD_LIMIT, forceRefresh)
      .then((list) => {
        setEntries(list);
        setState('ready');
      })
      .catch(() => setState('error'));
  };

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setState('unconfigured');
      return;
    }
    if (submit) {
      setState('ready');
    } else {
      refresh();
    }
  }, [submit]);

  const doSubmit = async () => {
    if (!submit || submitState === 'busy' || submitState === 'done') return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitState('busy');
    try {
      localStorage.setItem(LS_KEYS.nickname, trimmed);
    } catch {
      /* noop */
    }
    try {
      await submitScore(trimmed, submit.score, submit.floor, submit.maxRisk);
      setSubmitState('done');
      refresh(true);
    } catch {
      setSubmitState('fail');
    }
  };

  const showRanking = !submit || submitState === 'done';

  return (
    <div className="overlay modal-overlay" role="dialog" aria-label="랭킹">
      <div className="modal-panel rank-panel">
        <h2 className="modal-title">
          <IcTrophy size={20} />
          {showRanking ? '운명의 랭킹' : '랭킹 등록하기'}
        </h2>

        {state === 'unconfigured' && (
          <p className="rank-note">
            아직 온라인 랭킹이 연결되지 않았어요.
            <br />
            <code>src/firebase/config.ts</code>에 Firebase 설정을 넣으면
            <br />
            바로 활성화됩니다.
          </p>
        )}

        {showRanking && state === 'loading' && (
          <p className="rank-note">랭킹을 불러오는 중…</p>
        )}

        {showRanking && state === 'error' && (
          <p className="rank-note">
            랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {submitState === 'done' && (
          <p className="rank-note rank-ok" role="status">
            랭킹에 등록되었습니다!
          </p>
        )}

        {showRanking && state === 'ready' && (
          <div className="rank-list">
            {entries.length === 0 && (
              <p className="rank-note">아직 등록된 기록이 없어요. 1등을 노려보세요!</p>
            )}
            {entries.map((e, i) => (
              <div key={e.id} className={`rank-row ${i < 3 ? `rank-top rank-${i + 1}` : ''}`}>
                <span className="rank-pos">{i + 1}</span>
                <span className="rank-name">{e.name}</span>
                <span className="rank-meta">
                  {e.floor}층 · 위험 {e.maxRisk}%
                </span>
                <span className="rank-score">{e.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {submit && state !== 'unconfigured' && submitState !== 'done' && (
          <div className="rank-submit">
            <p className="rank-register-score">
              이번 기록 <strong>{submit.score.toLocaleString()}점</strong>
            </p>
            <form
              className="rank-submit-row"
              onSubmit={(event) => {
                event.preventDefault();
                void doSubmit();
              }}
            >
              <input
                className="rank-input"
                value={name}
                maxLength={NICKNAME_MAX}
                placeholder="닉네임"
                onChange={(e) => setName(e.target.value)}
                aria-label="닉네임"
                autoFocus
              />
              <button
                type="submit"
                className="btn btn-bank btn-sm"
                disabled={submitState === 'busy' || !name.trim()}
              >
                {submitState === 'busy' ? '등록 중…' : '랭킹 등록'}
              </button>
            </form>
            <p className="rank-nickname-help">
              닉네임은 최대 {NICKNAME_MAX}자까지 입력할 수 있어요.
            </p>
            {submitState === 'fail' && (
              <p className="rank-note">등록에 실패했어요. 다시 시도해 주세요.</p>
            )}
          </div>
        )}

        <button className="btn btn-ghost btn-skip" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
