import Phaser from 'phaser';
import { BALANCE } from './config/balance';
import { TowerScene } from './scenes/TowerScene';

let game: Phaser.Game | null = null;

export function initGame(parent: HTMLElement): Phaser.Game {
  if (game) return game;
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
