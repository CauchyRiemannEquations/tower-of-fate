import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../config/balance';
import { mulberry32 } from '../rng';
import {
  advanceTrial,
  pickTrial,
  startTrial,
  trialReward,
  type TrialPlacement,
} from '../trials';

function place(p: Partial<TrialPlacement>): TrialPlacement {
  return { blockId: 'wood', side: 0, risk: 5, perfect: false, ...p };
}

describe('운명의 시험', () => {
  it('표식의 시험: 3번 안에 표식 2회 적중이면 성공', () => {
    let t = startTrial('marks');
    t = advanceTrial(t, place({ perfect: true }));
    expect(t.status).toBe('active');
    t = advanceTrial(t, place({ perfect: false }));
    t = advanceTrial(t, place({ perfect: true }));
    expect(t.status).toBe('success');
  });

  it('표식의 시험: 기한 안에 못 채우면 조용히 실패', () => {
    let t = startTrial('marks');
    t = advanceTrial(t, place({}));
    t = advanceTrial(t, place({ perfect: true }));
    t = advanceTrial(t, place({}));
    expect(t.status).toBe('failed');
  });

  it('재료의 시험: 같은 종류가 반복되면 실패, 3연속 다르면 성공', () => {
    let a = startTrial('variety');
    a = advanceTrial(a, place({ blockId: 'wood' }));
    a = advanceTrial(a, place({ blockId: 'wood' }));
    expect(a.status).toBe('failed');

    let b = startTrial('variety');
    b = advanceTrial(b, place({ blockId: 'wood' }));
    b = advanceTrial(b, place({ blockId: 'stone' }));
    b = advanceTrial(b, place({ blockId: 'glass' }));
    expect(b.status).toBe('success');
  });

  it('담력의 시험: 기준 위험 이상에서 생존하면 즉시 성공', () => {
    let t = startTrial('nerve');
    t = advanceTrial(t, place({ risk: BALANCE.trials.nerveRisk - 1 }));
    expect(t.status).toBe('active');
    t = advanceTrial(t, place({ risk: BALANCE.trials.nerveRisk }));
    expect(t.status).toBe('success');
  });

  it('균형의 시험: 좌우 교차 3연속이면 성공, 중앙이나 같은 쪽이면 실패', () => {
    let a = startTrial('weave');
    a = advanceTrial(a, place({ side: 1 }));
    a = advanceTrial(a, place({ side: -1 }));
    a = advanceTrial(a, place({ side: 1 }));
    expect(a.status).toBe('success');

    let b = startTrial('weave');
    b = advanceTrial(b, place({ side: 1 }));
    b = advanceTrial(b, place({ side: 1 }));
    expect(b.status).toBe('failed');

    let c = startTrial('weave');
    c = advanceTrial(c, place({ side: 0 }));
    expect(c.status).toBe('failed');
  });

  it('보상은 고정 점수 + 탑 위 점수 비례다', () => {
    const T = BALANCE.trials;
    expect(trialReward(0)).toBe(T.rewardFlat);
    expect(trialReward(200)).toBe(T.rewardFlat + Math.round(200 * T.rewardTowerFrac));
  });

  it('다음 시험은 직전 시험과 겹치지 않는다', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 40; i++) {
      expect(pickTrial(rng, 'marks')).not.toBe('marks');
      expect(pickTrial(rng, 'weave')).not.toBe('weave');
    }
  });
});
