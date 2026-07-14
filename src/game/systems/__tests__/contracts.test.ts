import { describe, expect, it } from 'vitest';
import {
  advanceContract,
  isFeasible,
  offerContracts,
  startContract,
  type PlacementInfo,
} from '../contracts';

function p(over: Partial<PlacementInfo>): PlacementInfo {
  return {
    blockId: 'wood',
    side: 0,
    offset: 0,
    risk: 10,
    perfect: false,
    ...over,
  };
}

describe('예언 계약', () => {
  it('균형의 예언: 좌우 교차 3회면 성공', () => {
    let c = startContract('balance');
    c = advanceContract(c, p({ side: -1, offset: -30 }));
    c = advanceContract(c, p({ side: 1, offset: 30 }));
    expect(c.status).toBe('active');
    c = advanceContract(c, p({ side: -1, offset: -30 }));
    expect(c.status).toBe('success');
  });

  it('균형의 예언: 같은 방향이 이어지면 실패', () => {
    let c = startContract('balance');
    c = advanceContract(c, p({ side: -1, offset: -30 }));
    c = advanceContract(c, p({ side: -1, offset: -20 }));
    expect(c.status).toBe('failed');
  });

  it('균형의 예언: 중앙 배치는 실패', () => {
    let c = startContract('balance');
    c = advanceContract(c, p({ side: 0 }));
    expect(c.status).toBe('failed');
  });

  it('탐욕의 예언: 위험 40% 이상 생존이면 즉시 성공', () => {
    let c = startContract('greed');
    c = advanceContract(c, p({ risk: 45 }));
    expect(c.status).toBe('success');
  });

  it('탐욕의 예언: 3회 동안 미달이면 만료 실패', () => {
    let c = startContract('greed');
    c = advanceContract(c, p({ risk: 10 }));
    c = advanceContract(c, p({ risk: 20 }));
    c = advanceContract(c, p({ risk: 39 }));
    expect(c.status).toBe('failed');
  });

  it('세 재료: 서로 다른 3종이면 성공, 중복이면 실패', () => {
    let ok = startContract('materials');
    ok = advanceContract(ok, p({ blockId: 'wood' }));
    ok = advanceContract(ok, p({ blockId: 'stone' }));
    ok = advanceContract(ok, p({ blockId: 'glass' }));
    expect(ok.status).toBe('success');

    let bad = startContract('materials');
    bad = advanceContract(bad, p({ blockId: 'wood' }));
    bad = advanceContract(bad, p({ blockId: 'wood' }));
    expect(bad.status).toBe('failed');
  });

  it('정밀공학자: PERFECT 2회면 성공', () => {
    let c = startContract('engineer');
    c = advanceContract(c, p({ perfect: true }));
    c = advanceContract(c, p({ perfect: false }));
    expect(c.status).toBe('active');
    c = advanceContract(c, p({ perfect: true }));
    expect(c.status).toBe('success');
  });

  it('대칭의 계약: 반대편 비슷한 거리 쌍이면 성공', () => {
    let c = startContract('symmetry');
    c = advanceContract(c, p({ side: 1, offset: 30 }));
    c = advanceContract(c, p({ side: -1, offset: -35 }));
    expect(c.status).toBe('success');
  });

  it('대칭의 계약: 거리 차가 크면 만료 실패', () => {
    let c = startContract('symmetry');
    c = advanceContract(c, p({ side: 1, offset: 30 }));
    c = advanceContract(c, p({ side: -1, offset: -80 }));
    c = advanceContract(c, p({ side: 1, offset: 60 }));
    expect(c.status).toBe('failed');
  });

  it('종료된 계약은 더 진행되지 않는다 (보상 1회 보장)', () => {
    let c = startContract('greed');
    c = advanceContract(c, p({ risk: 50 }));
    expect(c.status).toBe('success');
    const after = advanceContract(c, p({ risk: 60 }));
    expect(after).toBe(c);
  });

  it('재료가 3종 미만이면 세 재료 계약을 제시하지 않는다', () => {
    expect(isFeasible('materials', 2)).toBe(false);
    const offers = offerContracts(2, () => 0.4);
    expect(offers.some((o) => o.id === 'materials')).toBe(false);
    expect(offers).toHaveLength(3);
  });
});
