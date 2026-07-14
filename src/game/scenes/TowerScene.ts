import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { BLOCKS } from '../config/blocks';
import { computeRisk } from '../systems/risk';
import { tower } from '../systems/tower';
import { gameEvents, store } from '../state/store';
import { actions, getRiskMods } from '../state/actions';
import { generateAllTextures, blockTextureKey } from '../objects/textures';
import { EffectPool } from '../effects/particles';
import { sfx, unlockAudio } from '../../utils/sound';
import type { BlockDef, BlockTypeId, JudgeResult, RiskBreakdown } from '../../types';

const D = BALANCE.design;

/** 인게임 텍스트(PERFECT!, 점수 플로팅 등)에 쓰는 폰트 스택 */
const GAME_FONT = '"Jua", "Black Han Sans", "Trebuchet MS", system-ui, sans-serif';

function riskColor(pct: number): number {
  if (pct < 20) return 0x35e0c9;
  if (pct < 40) return 0xffd23c;
  if (pct < 60) return 0xff8c3a;
  return 0xff4d5e;
}

export class TowerScene extends Phaser.Scene {
  private towerC!: Phaser.GameObjects.Container;
  private guide!: Phaser.GameObjects.Graphics;
  private fx!: EffectPool;
  private moodOverlay!: Phaser.GameObjects.Rectangle;

  private aimSprite: Phaser.GameObjects.Image | null = null;
  private aimDef: BlockDef | null = null;
  private aimX = 0;
  private aimDirty = false;
  private currentBreakdown: RiskBreakdown | null = null;

  private baseTilt = 0;
  private swayAmp = 0;
  /** 착지 반동 각도 — 트윈으로 0까지 감쇠 */
  kickAngle = 0;
  private collapsing = false;

  private dragPointerX = 0;
  private dragPointerY = 0;
  private dragAimX = 0;
  private dragMoved = false;
  private dragTime = 0;

  private blockSprites: Phaser.GameObjects.Image[] = [];
  private unsubs: (() => void)[] = [];

  constructor() {
    super('tower');
  }

  create() {
    generateAllTextures(this);
    this.buildBackground();
    this.buildIsland();

    this.towerC = this.add.container(D.baseX, D.groundTop).setDepth(10);
    this.guide = this.add.graphics().setDepth(20);
    this.fx = new EffectPool(this);

    this.moodOverlay = this.add
      .rectangle(D.width / 2, D.height / 2, D.width, D.height, 0x7ee8d8, 0)
      .setScrollFactor(0)
      .setDepth(3);

    this.unsubs.push(gameEvents.on('spawn', (id: BlockTypeId) => this.spawnAiming(id)));
    this.unsubs.push(gameEvents.on('despawn', () => this.despawnAiming()));
    this.unsubs.push(gameEvents.on('drop', () => this.doDrop()));
    this.unsubs.push(gameEvents.on('collapse', () => this.playCollapse()));
    this.unsubs.push(gameEvents.on('reset', () => this.resetScene()));
    this.unsubs.push(gameEvents.on('banked', () => this.playBanked()));
    this.unsubs.push(
      gameEvents.on('survived', (j: JudgeResult) => this.onSurvived(j)),
    );

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });

    this.setupInput();
  }

  // ── 배경 ─────────────────────────────────────────────

  private buildBackground() {
    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(0);

    // 달(거대 행성)
    this.add.image(392, 128, 'moon').setScrollFactor(0.06).setDepth(1).setScale(0.9);

    // 별 — 위쪽으로 넓게 뿌려 패럴랙스로 흘러가게 한다
    for (let i = 0; i < 46; i++) {
      const star = this.add
        .image(
          Phaser.Math.Between(10, D.width - 10),
          Phaser.Math.Between(-1600, D.height - 60),
          'p-dot',
        )
        .setScale(Phaser.Math.FloatBetween(0.12, 0.38))
        .setAlpha(Phaser.Math.FloatBetween(0.35, 0.9))
        .setScrollFactor(0.12)
        .setDepth(1);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.4),
        duration: Phaser.Math.Between(900, 2400),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // 구름
    for (let i = 0; i < 6; i++) {
      const cloud = this.add
        .image(
          Phaser.Math.Between(-40, D.width + 40),
          Phaser.Math.Between(-1100, D.height - 120),
          'cloud',
        )
        .setScrollFactor(0.3)
        .setDepth(2)
        .setAlpha(Phaser.Math.FloatBetween(0.5, 0.9))
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      this.tweens.add({
        targets: cloud,
        x: cloud.x + Phaser.Math.Between(-70, 70),
        duration: Phaser.Math.Between(8000, 16000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private buildIsland() {
    // 섬 아래의 신비로운 광채
    this.add
      .image(D.baseX, D.groundTop + 70, 'glow')
      .setTint(0x8a63e8)
      .setAlpha(0.35)
      .setScale(4.2, 2.6)
      .setDepth(4);

    const island = this.add
      .image(D.baseX, D.groundTop, 'island')
      .setOrigin(0.5, 0)
      .setDepth(5);
    island.setDisplaySize(D.groundWidth + 60, 190);

    // 은은한 부유 애니메이션 대신 수정 반짝임
    this.tweens.add({
      targets: island,
      y: D.groundTop + 3,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── 입력 ─────────────────────────────────────────────

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      unlockAudio();
      if (store.getState().phase !== 'aiming') return;
      this.dragPointerX = p.x;
      this.dragPointerY = p.y;
      this.dragAimX = this.aimX;
      this.dragMoved = false;
      this.dragTime = this.time.now;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (store.getState().phase !== 'aiming' || !p.isDown) return;
      const dx = p.x - this.dragPointerX;
      if (Math.abs(dx) > 6) this.dragMoved = true;
      this.setAimX(this.dragAimX + dx);
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (store.getState().phase !== 'aiming') return;
      const dt = this.time.now - this.dragTime;
      const dy = p.y - this.dragPointerY;
      const dxAbs = Math.abs(p.x - this.dragPointerX);

      // 아래로 스와이프 → 낙하
      if (dy > 80 && dt < 420 && dxAbs < 70) {
        actions.requestDrop();
        return;
      }
      // 짧은 탭: 좌우 영역 터치 시 미세 이동
      if (!this.dragMoved && dt < 260) {
        if (p.x < D.width * 0.35) this.setAimX(this.aimX - BALANCE.aim.nudge);
        else if (p.x > D.width * 0.65) this.setAimX(this.aimX + BALANCE.aim.nudge);
      }
    });
  }

  /** 지지면에 최소한 걸칠 수 있는 범위로 조준을 제한한다 */
  private aimBounds(): [number, number] {
    const max = BALANCE.aim.maxOffset;
    const def = this.aimDef;
    if (!def) return [-max, max];
    const below = tower.top();
    const minOverlap = 16;
    const halfSum =
      (below ? below.def.width : BALANCE.design.groundWidth) / 2 + def.width / 2;
    const cx = below?.x ?? 0;
    return [
      Math.max(-max, cx - (halfSum - minOverlap)),
      Math.min(max, cx + (halfSum - minOverlap)),
    ];
  }

  private setAimX(v: number) {
    const [lo, hi] = this.aimBounds();
    this.aimX = Phaser.Math.Clamp(v, lo, hi);
    this.aimDirty = true;
  }

  // ── 조준 ─────────────────────────────────────────────

  private spawnAiming(id: BlockTypeId) {
    this.aimSprite?.destroy();
    const def = BLOCKS[id];
    this.aimDef = def;
    this.setAimX(tower.top()?.x ?? 0);

    const cam = this.cameras.main;
    const sprite = this.add
      .image(D.baseX + this.aimX, cam.scrollY + 180, blockTextureKey(def))
      .setOrigin(0.5, 1)
      .setDepth(25);
    sprite.setDisplaySize(def.width, def.height);
    sprite.setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 180 });

    this.aimSprite = sprite;
    this.aimDirty = true;
  }

  update(time: number) {
    // 탑 흔들림 (붕괴 중에는 붕괴 트윈이 각도를 제어)
    if (!this.collapsing && this.towerC) {
      this.towerC.angle =
        this.baseTilt + Math.sin(time / 700) * this.swayAmp + this.kickAngle;
    }

    const phase = store.getState().phase;
    if (phase === 'aiming' && this.aimSprite && this.aimDef) {
      const cam = this.cameras.main;
      const targetX = D.baseX + this.aimX;
      this.aimSprite.x += (targetX - this.aimSprite.x) * 0.55;
      this.aimSprite.y = cam.scrollY + 180 + Math.sin(time / 380) * 4;

      if (this.aimDirty) {
        this.aimDirty = false;
        this.currentBreakdown = computeRisk(this.aimDef, this.aimX, getRiskMods());
        actions.setAimRisk(this.currentBreakdown);
        this.drawGuide(this.currentBreakdown);
      }
    }
  }

  private drawGuide(b: RiskBreakdown) {
    const g = this.guide;
    g.clear();
    if (!this.aimDef) return;

    const def = this.aimDef;
    const landingBottom = D.groundTop - tower.totalHeight();
    const gx = D.baseX + this.aimX;
    const color = riskColor(b.total);

    // 낙하 가이드 점선
    const topY = this.cameras.main.scrollY + 190;
    g.lineStyle(2, color, 0.5);
    for (let y = topY; y < landingBottom - def.height - 6; y += 18) {
      g.lineBetween(gx, y, gx, Math.min(y + 10, landingBottom - def.height - 6));
    }

    // 착지 예상 위치(고스트)
    g.lineStyle(2.5, color, 0.9);
    g.strokeRect(gx - def.width / 2, landingBottom - def.height, def.width, def.height);
    g.fillStyle(color, 0.1);
    g.fillRect(gx - def.width / 2, landingBottom - def.height, def.width, def.height);

    // 안전 배치 영역 (지지면 위 녹색 바)
    const below = tower.top();
    const supportCx = D.baseX + (below?.x ?? 0);
    const supportHalf = (below ? below.def.width : BALANCE.design.groundWidth) / 2;
    const zoneHalf = supportHalf * 0.3;
    g.fillStyle(0x7effc9, 0.55);
    g.fillRect(supportCx - zoneHalf, landingBottom - 3, zoneHalf * 2, 6);
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(supportCx - supportHalf, landingBottom - 1.5, supportHalf * 2, 3);

    // 무게중심 마커 (받침대 위 다이아몬드)
    const com = tower.comX({ def, x: this.aimX });
    const comRatio = Math.abs(com - (tower.blocks[0]?.x ?? this.aimX)) / tower.baseHalfWidth();
    const comColor = comRatio < 0.4 ? 0x35e0c9 : comRatio < 0.8 ? 0xff8c3a : 0xff4d5e;
    const cx = D.baseX + com;
    const cy = D.groundTop + 14;
    g.fillStyle(comColor, 0.95);
    g.fillTriangle(cx, cy - 8, cx + 7, cy, cx, cy + 8);
    g.fillTriangle(cx, cy - 8, cx - 7, cy, cx, cy + 8);
  }

  // ── 낙하와 착지 ──────────────────────────────────────

  /** 예약 등으로 조준이 해제될 때 */
  private despawnAiming() {
    this.aimSprite?.destroy();
    this.aimSprite = null;
    this.aimDef = null;
    this.currentBreakdown = null;
    this.guide.clear();
    this.drawIdleCom();
  }

  /** 기하학자의 눈: 조준 전에도 탑 무게중심을 표시 */
  private drawIdleCom() {
    if (!store.getState().relics.includes('geometer')) return;
    if (tower.blocks.length === 0) return;
    const g = this.guide;
    const com = tower.comX();
    const comRatio = Math.abs(com - (tower.blocks[0]?.x ?? 0)) / tower.baseHalfWidth();
    const comColor = comRatio < 0.4 ? 0x35e0c9 : comRatio < 0.8 ? 0xff8c3a : 0xff4d5e;
    const cx = D.baseX + com;
    const cy = D.groundTop + 14;
    g.fillStyle(comColor, 0.95);
    g.fillTriangle(cx, cy - 8, cx + 7, cy, cx, cy + 8);
    g.fillTriangle(cx, cy - 8, cx - 7, cy, cx, cy + 8);
    g.lineStyle(1.5, comColor, 0.4);
    g.lineBetween(cx, cy - 8, cx, D.groundTop - tower.totalHeight());
  }

  private doDrop() {
    if (!this.aimSprite || !this.aimDef) return;
    const breakdown =
      this.currentBreakdown ?? computeRisk(this.aimDef, this.aimX, getRiskMods());
    this.guide.clear();

    const landingBottom = D.groundTop - tower.totalHeight();
    const dist = Math.max(40, landingBottom - this.aimSprite.y);
    this.tweens.add({
      targets: this.aimSprite,
      y: landingBottom,
      x: D.baseX + this.aimX,
      duration: Math.max(130, dist / 1.55),
      ease: 'Quad.easeIn',
      onComplete: () => this.onImpact(breakdown),
    });
  }

  private onImpact(breakdown: RiskBreakdown) {
    const sprite = this.aimSprite;
    const def = this.aimDef;
    if (!sprite || !def) return;
    this.aimSprite = null;

    const heightBelow = tower.totalHeight();
    const worldX = D.baseX + this.aimX;
    const worldY = D.groundTop - heightBelow;

    // 컨테이너로 편입 (탑의 일부가 됨)
    this.towerC.add(sprite);
    sprite.x = this.aimX;
    sprite.y = -heightBelow;
    this.blockSprites.push(sprite);

    // 스쿼시 앤 스트레치
    const sx = sprite.scaleX;
    const sy = sprite.scaleY;
    this.tweens.add({
      targets: sprite,
      scaleX: sx * 1.12,
      scaleY: sy * 0.8,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // 재질별 착지 연출
    const dustTints: Record<string, number> = {
      wood: 0xc9a46a,
      stone: 0x9aa8b8,
      glass: 0xaef0ea,
      gold: 0xffd76a,
      foundation: 0x8ea2d8,
    };
    this.fx.landingDust(worldX, worldY, 8 + def.weight * 3, dustTints[def.id]);
    this.cameras.main.shake(110 + def.weight * 45, 0.0018 + def.weight * 0.0014);

    switch (def.id) {
      case 'wood': sfx.landWood(); break;
      case 'stone': sfx.landStone(); break;
      case 'glass': sfx.landGlass(); break;
      case 'gold':
        sfx.landGold();
        this.fx.coinBurst(worldX, worldY - def.height / 2, 6);
        break;
      case 'foundation':
        sfx.landFoundation();
        // 안정화 에너지가 탑 아래로 흐르는 연출
        this.fx.ringPulse(worldX, worldY, 0x7effc9, 2.4);
        this.time.delayedCall(140, () =>
          this.fx.ringPulse(D.baseX, D.groundTop, 0x7effc9, 3),
        );
        break;
    }

    // 착지 반동
    const dir = this.aimX - (tower.top()?.x ?? 0) >= 0 ? 1 : -1;
    this.kickAngle = dir * (0.4 + def.weight * 0.3);
    this.tweens.add({
      targets: this,
      kickAngle: 0,
      duration: 750,
      ease: 'Elastic.easeOut',
    });

    // 판정은 착지 연출 직후
    this.time.delayedCall(140, () => actions.resolvePlacement(breakdown, this.aimX));
  }

  // ── 생존 / 판정 연출 ─────────────────────────────────

  private onSurvived(j: JudgeResult) {
    const comOffset = tower.comX() - (tower.blocks[0]?.x ?? 0);
    const ratio = Phaser.Math.Clamp(comOffset / tower.baseHalfWidth(), -1, 1);
    this.baseTilt = ratio * 2.0;
    this.swayAmp = Math.min(1.1, tower.blocks.length * 0.06);

    // 카메라가 탑 꼭대기를 따라간다
    const topY = D.groundTop - tower.totalHeight();
    const desired = Math.min(0, topY - 350);
    this.tweens.add({
      targets: this.cameras.main,
      scrollY: desired,
      duration: 520,
      ease: 'Cubic.easeOut',
    });

    // 고도에 따른 하늘 분위기 변화
    this.tweens.add({
      targets: this.moodOverlay,
      fillAlpha: Math.min(0.13, tower.blocks.length * 0.006),
      duration: 800,
    });

    const top = tower.top();
    const worldX = D.baseX + (top?.x ?? 0);
    const worldY = topY;

    this.floatText(`+${j.gained}`, worldX, worldY - 30, '#ffe98a');

    if (j.perfect) {
      sfx.perfect();
      this.splash('PERFECT!', '#7effc9', true);
      this.fx.ringPulse(worldX, worldY, 0x7effc9);
      this.fx.starBurst(worldX, worldY, 22);
      const combo = store.getState().combo;
      if (combo >= 2) {
        this.floatText(`콤보 x${combo}`, worldX, worldY - 62, '#7effc9');
      }
    } else if (j.lucky) {
      sfx.lucky();
      this.splash('LUCKY!', '#ffd23c', true);
      this.fx.sparkBurst(worldX, worldY, 20, 0xffd23c);
      this.fx.ringPulse(worldX, worldY, 0xffd23c, 4);
      this.cameras.main.shake(200, 0.004);
    }

    if (j.nearMiss) {
      sfx.nearMiss();
      this.splash('아슬아슬!', '#ff8c3a', false);
      this.crackFlash(worldX, worldY + 10);
    }

    this.drawIdleCom();
  }

  private crackFlash(x: number, y: number) {
    const g = this.add.graphics().setDepth(35);
    g.lineStyle(2.5, 0xffffff, 0.9);
    let px = x - 26;
    let py = y;
    g.beginPath();
    g.moveTo(px, py);
    for (let i = 0; i < 6; i++) {
      px += 9 + Math.random() * 5;
      py += (Math.random() - 0.5) * 16;
      g.lineTo(px, py);
    }
    g.strokePath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 550,
      delay: 250,
      onComplete: () => g.destroy(),
    });
  }

  private splash(text: string, color: string, slowmo: boolean) {
    const t = this.add
      .text(D.width / 2, 320, text, {
        fontFamily: GAME_FONT,
        fontSize: '58px',
        fontStyle: '900',
        color,
        stroke: '#150f30',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setScale(0.2)
      .setAlpha(0);

    t.setShadow(0, 4, 'rgba(0,0,0,0.5)', 8);

    this.tweens.add({
      targets: t,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: 280,
      scale: 1.12,
      duration: 380,
      delay: 780,
      onComplete: () => t.destroy(),
    });

    if (slowmo) {
      this.tweens.timeScale = 0.42;
      this.time.delayedCall(200, () => {
        this.tweens.timeScale = 1;
      });
    }
  }

  private floatText(text: string, x: number, y: number, color: string) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: GAME_FONT,
        fontSize: '30px',
        fontStyle: '800',
        color,
        stroke: '#150f30',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(45);
    this.tweens.add({
      targets: t,
      y: y - 56,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // ── 붕괴 ─────────────────────────────────────────────

  private playCollapse() {
    this.collapsing = true;
    this.guide.clear();

    const lost = store.getState().tower;
    const comOffset = tower.comX() - (tower.blocks[0]?.x ?? 0);
    const dir = Math.sign(comOffset) || (Math.random() < 0.5 ? -1 : 1);

    // 짧은 슬로모션 후 대붕괴
    this.tweens.timeScale = 0.45;
    this.time.delayedCall(320, () => {
      this.tweens.timeScale = 1;
    });

    this.cameras.main.shake(650, 0.014);

    // 탑 전체가 한쪽으로 크게 기울어짐
    this.tweens.add({
      targets: this.towerC,
      angle: dir * 24,
      duration: 700,
      ease: 'Quad.easeIn',
    });

    const n = this.blockSprites.length;
    const mat = new Phaser.GameObjects.Components.TransformMatrix();

    this.blockSprites.forEach((sprite, i) => {
      const def = tower.blocks[i]?.def;
      const delay = (n - 1 - i) * 75;

      if (def?.fragile) {
        // 유리는 산산조각
        this.time.delayedCall(delay + 150, () => {
          this.towerC.getWorldTransformMatrix(mat);
          const p = mat.transformPoint(sprite.x, sprite.y - def.height / 2);
          this.fx.shardBurst(p.x, p.y, 20);
          sfx.shatter();
          sprite.setVisible(false);
        });
        return;
      }

      const spin = def?.id === 'gold' ? 720 : 120 + Math.random() * 240;
      this.tweens.add({
        targets: sprite,
        x: sprite.x + dir * (140 + Math.random() * 170) + (Math.random() - 0.5) * 60,
        y: sprite.y + 460 + Math.random() * 240,
        angle: dir * spin,
        alpha: 0,
        duration: 1000,
        delay,
        ease: 'Quad.easeIn',
      });

      if (def?.id === 'gold') {
        this.time.delayedCall(delay + 200, () => {
          this.towerC.getWorldTransformMatrix(mat);
          const p = mat.transformPoint(sprite.x, sprite.y);
          this.fx.coinBurst(p.x, p.y, 10);
        });
      }
    });

    // 바닥 먼지 폭발
    this.time.delayedCall(350, () => {
      this.fx.landingDust(D.baseX, D.groundTop, 26, 0x9c8ac9);
      this.fx.landingDust(D.baseX - 60, D.groundTop, 14, 0x9c8ac9);
      this.fx.landingDust(D.baseX + 60, D.groundTop, 14, 0x9c8ac9);
    });

    // 잃은 점수 연출
    if (lost > 0) {
      const t = this.add
        .text(D.width / 2, 300, `-${lost}`, {
          fontFamily: GAME_FONT,
          fontSize: '46px',
          fontStyle: '900',
          color: '#ff4d5e',
          stroke: '#150f30',
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(50)
        .setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, y: 330, duration: 400, delay: 300 });
      this.tweens.add({
        targets: t,
        alpha: 0,
        y: 420,
        duration: 600,
        delay: 1100,
        onComplete: () => t.destroy(),
      });
    }

    this.time.delayedCall(1900, () => {
      actions.finishCollapse();
    });
  }

  private playBanked() {
    const topY = D.groundTop - tower.totalHeight();
    const worldX = D.baseX + (tower.top()?.x ?? 0);
    this.fx.coinBurst(worldX, topY, 18);
    this.fx.sparkBurst(worldX, topY - 30, 16, 0xffe98a);
    this.fx.ringPulse(worldX, topY, 0xffd23c, 4.5);
    this.cameras.main.flash(400, 255, 220, 120, false);
  }

  // ── 리셋 ─────────────────────────────────────────────

  private resetScene() {
    this.collapsing = false;
    this.aimSprite?.destroy();
    this.aimSprite = null;
    this.aimDef = null;
    this.currentBreakdown = null;
    this.guide.clear();

    this.blockSprites.forEach((s) => s.destroy());
    this.blockSprites = [];
    this.towerC.removeAll(true);
    this.towerC.angle = 0;
    this.baseTilt = 0;
    this.swayAmp = 0;
    this.kickAngle = 0;

    this.tweens.timeScale = 1;
    this.cameras.main.scrollY = 0;
    this.moodOverlay.setFillStyle(0x7ee8d8, 0);
  }
}
