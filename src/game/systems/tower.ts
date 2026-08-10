import type { BlockDef, TowerBlock } from '../../types';
import { BALANCE } from '../config/balance';

/**
 * 탑의 논리적 상태. Phaser와 무관한 순수 데이터 모델로,
 * 위험 계산과 렌더링이 모두 이 모델을 참조한다.
 */
class TowerModel {
  blocks: TowerBlock[] = [];

  reset() {
    this.blocks = [];
  }

  add(def: BlockDef, x: number) {
    this.blocks.push({ def, x });
  }

  top(): TowerBlock | null {
    return this.blocks.length > 0 ? this.blocks[this.blocks.length - 1] : null;
  }

  /** i번째 블록 아래까지의 누적 높이 */
  heightBelow(i: number): number {
    let h = 0;
    for (let k = 0; k < i; k++) h += this.blocks[k].def.height;
    return h;
  }

  totalHeight(): number {
    return this.heightBelow(this.blocks.length);
  }

  /** 무게중심 x (탑 기준 좌표) — 추가 예정 블록을 포함해 계산할 수 있다 */
  comX(extra?: { def: BlockDef; x: number }): number {
    let sumW = 0;
    let sumWX = 0;
    for (const b of this.blocks) {
      sumW += b.def.weight;
      sumWX += b.def.weight * b.x;
    }
    if (extra) {
      sumW += extra.def.weight;
      sumWX += extra.def.weight * extra.x;
    }
    return sumW > 0 ? sumWX / sumW : 0;
  }

  /** 탑을 받치는 바닥 지지 반경 */
  baseHalfWidth(): number {
    const first = this.blocks[0];
    const w = first ? Math.min(first.def.width, BALANCE.design.groundWidth) : BALANCE.design.groundWidth;
    return w / 2;
  }

  /**
   * 층별 정역학 검사 — 모든 받침(바닥 포함)에 대해 "그 받침 위
   * 부분탑의 무게중심"이 받침 반폭 대비 얼마나 밀려났는지 재고,
   * 그중 최악의 비율을 돌려준다.
   *
   * 비율 1.0 = 부분탑의 무게중심이 받침 가장자리 바로 위
   * (실제 정역학이라면 전복 경계). 조금씩 같은 방향으로 내밀면
   * 조화급수처럼 상당한 오버행도 가능하지만, 한 층이라도 크게
   * 내밀면 그 층이 최악 지점이 되어 위험이 치솟는다.
   */
  worstOverhang(extra?: { def: BlockDef; x: number }): number {
    const all: TowerBlock[] = extra
      ? [...this.blocks, { def: extra.def, x: extra.x }]
      : [...this.blocks];
    if (all.length === 0) return 0;

    let worst = 0;
    // j = -1: 바닥이 받침, j >= 0: j번째 블록이 받침
    for (let j = -1; j < all.length - 1; j++) {
      const supX = j < 0 ? 0 : all[j].x;
      const supHalf =
        j < 0 ? BALANCE.design.groundWidth / 2 : all[j].def.width / 2;
      let w = 0;
      let wx = 0;
      for (let k = j + 1; k < all.length; k++) {
        w += all[k].def.weight;
        wx += all[k].def.weight * all[k].x;
      }
      if (w <= 0 || supHalf <= 0) continue;
      const ratio = Math.abs(wx / w - supX) / supHalf;
      if (ratio > worst) worst = ratio;
    }
    return worst;
  }

  /** 위에서부터 n개 안에 기초석이 있는지 */
  hasStabilizerNearTop(n: number): boolean {
    const start = Math.max(0, this.blocks.length - n);
    for (let i = start; i < this.blocks.length; i++) {
      if (this.blocks[i].def.stabilizer) return true;
    }
    return false;
  }
}

export const tower = new TowerModel();
