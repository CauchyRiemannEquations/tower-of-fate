import Phaser from 'phaser';
import { BALANCE, configureDesign } from './config/balance';
import { TowerScene } from './scenes/TowerScene';

let game: Phaser.Game | null = null;

export function initGame(parent: HTMLElement): Phaser.Game {
  if (game) return game;
  // 기기 비율에 맞춰 디자인 폭을 결정 (텍스처 생성 전에 필수)
  configureDesign(
    parent.clientWidth || window.innerWidth,
    parent.clientHeight || window.innerHeight,
  );
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0c0a24',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BALANCE.design.width,
      height: BALANCE.design.height,
    },
    scene: [TowerScene],
    // 물리는 붕괴 연출 전용 — 판정은 언제나 확률이 결정한다
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1.4 },
        debug: false,
      },
    },
    input: { activePointers: 2 },
    render: { antialias: true, roundPixels: false },
  });
  if (window.location.search.includes('debug')) {
    (window as any).__game = game;
  }
  return game;
}

export function destroyGame() {
  game?.destroy(true);
  game = null;
}
