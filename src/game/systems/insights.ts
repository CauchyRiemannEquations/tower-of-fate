import type { GameOverInfo, RiskAttempt, RunStats } from '../../types';
import { lastDecisionEV, survivedStreakProb } from './analytics';

/**
 * 운명의 회고 — 판이 끝난 순간, 방금의 판을 확률의 언어로 한 줄
 * 되돌아본다. 가르치려 들지 않고 서사로 스며들게 하는 것이 목적이라,
 * 문장은 항상 "이번 판에 실제로 일어난 일"만 말한다.
 */

export interface RunTitle {
  id: string;
  name: string;
  desc: string;
}

export interface RunReading {
  /** 이번 판을 요약하는 한 줄 */
  line: string;
  /** 조건을 채운 칭호 (최대 3개) */
  titles: RunTitle[];
}

function pct(v: number): string {
  if (v > 0 && v < 0.001) return '0.1% 미만';
  return `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;
}

function buildLine(
  log: RiskAttempt[],
  info: GameOverInfo,
): string {
  const streak = survivedStreakProb(log);
  const last = log[log.length - 1];

  if (!info.escaped && last) {
    if (last.risk < 15) {
      return `${last.risk}%의 불운이 탑을 데려갔어요. ${100 - last.risk}%의 세계에서는 아무 일도 없었을 텐데 — 확률은 가끔 그래요.`;
    }
    return `위험 ${last.risk}%의 도전이 운명을 갈랐어요. 여기까지 살아서 온 확률 ${pct(streak)}는 이미 충분한 행운이었죠.`;
  }

  // 탈출 — 마지막 결정의 단순 기대값으로 타이밍을 회고한다
  const ev = lastDecisionEV(log, info.towerAtStake);
  if (ev && info.towerAtStake > 0) {
    const delta = Math.round(ev.evContinue - ev.evStop);
    if (delta <= 0) {
      return `탈출 시점의 '한 층 더' 기대값은 ${delta}점 — 수학이 고개를 끄덕이는 탈출이었어요.`;
    }
    return `'한 층 더'의 기대값이 아직 +${delta}점 남아 있었어요. 물론, 기대값이 전부는 아니지만요.`;
  }
  return `이번 판의 모든 판정을 통과할 확률은 ${pct(streak)}였어요.`;
}

function buildTitles(
  log: RiskAttempt[],
  stats: RunStats,
  info: GameOverInfo,
): RunTitle[] {
  const titles: RunTitle[] = [];
  const streak = survivedStreakProb(log);
  const ev = lastDecisionEV(log, info.towerAtStake);

  if (
    info.escaped &&
    ev &&
    info.towerAtStake > 0 &&
    ev.evContinue <= ev.evStop
  ) {
    titles.push({
      id: 'mathematician',
      name: '수학자의 탈출',
      desc: '기대값이 음수로 돌아선 뒤에 탈출했어요',
    });
  }
  if (info.escaped && log.length >= 5 && log.every((a) => a.risk < 20)) {
    titles.push({
      id: 'architect',
      name: '신중한 설계자',
      desc: '모든 배치를 위험 20% 미만으로 유지했어요',
    });
  }
  if (streak > 0 && streak < 0.05 && log.some((a) => a.survived)) {
    titles.push({
      id: 'miracle',
      name: '기적의 생존자',
      desc: `이번 판정을 전부 통과할 확률은 ${pct(streak)}였어요`,
    });
  }
  if (stats.maxRiskSurvived >= 60) {
    titles.push({
      id: 'nerve',
      name: '강철 심장',
      desc: `위험 ${stats.maxRiskSurvived}%를 정면으로 뚫었어요`,
    });
  }
  if (stats.perfects >= 4) {
    titles.push({
      id: 'marksman',
      name: '표식 사냥꾼',
      desc: `운명의 표식을 ${stats.perfects}번 맞혔어요`,
    });
  }
  if (stats.maxFloor >= 12) {
    titles.push({
      id: 'highrise',
      name: '고공 건축가',
      desc: `${stats.maxFloor}층까지 쌓아 올렸어요`,
    });
  }
  return titles.slice(0, 3);
}

export function readRun(
  log: RiskAttempt[],
  stats: RunStats,
  info: GameOverInfo,
): RunReading | null {
  if (log.length === 0) return null;
  return {
    line: buildLine(log, info),
    titles: buildTitles(log, stats, info),
  };
}
