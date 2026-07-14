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
