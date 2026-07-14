import Phaser from 'phaser';

/**
 * 재사용 파티클 이미터 모음. 씬 생성 시 한 번 만들고 explode로 터뜨린다.
 */
export class EffectPool {
  private scene: Phaser.Scene;
  dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  spark!: Phaser.GameObjects.Particles.ParticleEmitter;
  shard!: Phaser.GameObjects.Particles.ParticleEmitter;
  coin!: Phaser.GameObjects.Particles.ParticleEmitter;
  star!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.dust = scene.add.particles(0, 0, 'p-dot', {
      speed: { min: 40, max: 150 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 300, max: 650 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xb9a6d9,
      gravityY: 120,
      emitting: false,
    });

    this.spark = scene.add.particles(0, 0, 'p-star', {
      speed: { min: 60, max: 260 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 350, max: 750 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });

    this.shard = scene.add.particles(0, 0, 'p-shard', {
      speed: { min: 90, max: 300 },
      angle: { min: 180, max: 360 },
      lifespan: { min: 450, max: 900 },
      scale: { start: 1, end: 0.15 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 720 },
      gravityY: 700,
      emitting: false,
    });

    this.coin = scene.add.particles(0, 0, 'p-coin', {
      speed: { min: 120, max: 320 },
      angle: { min: 210, max: 330 },
      lifespan: { min: 550, max: 1000 },
      scale: { start: 1, end: 0.4 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 720 },
      gravityY: 620,
      emitting: false,
    });

    this.star = scene.add.particles(0, 0, 'p-dot', {
      speed: { min: 25, max: 110 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 1100 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0xfff3b0, 0xaef0ea, 0xffffff],
      emitting: false,
    });

    [this.dust, this.spark, this.shard, this.coin, this.star].forEach((e) =>
      e.setDepth(40),
    );
  }

  /** 착지 먼지 */
  landingDust(x: number, y: number, count = 12, tint = 0xb9a6d9) {
    this.dust.setParticleTint(tint);
    this.dust.explode(count, x, y);
  }

  /** 반짝임 폭발 (PERFECT 등) */
  sparkBurst(x: number, y: number, count = 16, tint = 0xffe98a) {
    this.spark.setParticleTint(tint);
    this.spark.explode(count, x, y);
  }

  /** 유리 파편 */
  shardBurst(x: number, y: number, count = 18) {
    this.shard.explode(count, x, y);
  }

  /** 코인 분수 */
  coinBurst(x: number, y: number, count = 14) {
    this.coin.explode(count, x, y);
  }

  starBurst(x: number, y: number, count = 20) {
    this.star.explode(count, x, y);
  }

  /** 확장되는 링 펄스 */
  ringPulse(x: number, y: number, tint = 0xffffff, scaleTo = 3.2) {
    const ring = this.scene.add.image(x, y, 'p-ring').setDepth(41).setTint(tint);
    ring.setScale(0.3).setAlpha(0.9);
    this.scene.tweens.add({
      targets: ring,
      scale: scaleTo,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  destroy() {
    [this.dust, this.spark, this.shard, this.coin, this.star].forEach((e) =>
      e.destroy(),
    );
  }
}
