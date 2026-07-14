import Phaser from 'phaser';
import { BLOCKS } from '../config/blocks';
import { BALANCE } from '../config/balance';
import type { BlockDef } from '../../types';

/** 텍스처는 선명도를 위해 2배 해상도로 그린다 */
const S = 2;

type Ctx = CanvasRenderingContext2D;

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number): Ctx | null {
  if (scene.textures.exists(key)) return null;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return null;
  return tex.getContext();
}

function refresh(scene: Phaser.Scene, key: string) {
  (scene.textures.get(key) as Phaser.Textures.CanvasTexture).refresh();
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── 표정 ───────────────────────────────────────────────

function eyes(ctx: Ctx, cx: number, cy: number, gap: number, r: number, pupil: string, look = 0) {
  for (const side of [-1, 1]) {
    const ex = cx + side * gap;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(ex, cy, r, r * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(ex + look, cy + r * 0.18, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(ex + look - r * 0.15, cy - r * 0.1, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function worriedMouth(ctx: Ctx, cx: number, cy: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4 * S;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy + 2);
  ctx.quadraticCurveTo(cx, cy - w * 0.35, cx + w / 2, cy + 2);
  ctx.stroke();
}

function smileMouth(ctx: Ctx, cx: number, cy: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4 * S;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy - 2);
  ctx.quadraticCurveTo(cx, cy + w * 0.42, cx + w / 2, cy - 2);
  ctx.stroke();
}

function flatMouth(ctx: Ctx, cx: number, cy: number, w: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6 * S;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx + w / 2, cy);
  ctx.stroke();
}

function closedEyes(ctx: Ctx, cx: number, cy: number, gap: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4 * S;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + side * gap, cy - r * 0.3, r, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
}

// ── 블록별 텍스처 ─────────────────────────────────────

function drawWood(ctx: Ctx, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#c08a52');
  grad.addColorStop(0.5, '#a06a3b');
  grad.addColorStop(1, '#7d4f28');
  ctx.fillStyle = grad;
  rr(ctx, 2, 2, w - 4, h - 4, 6 * S);
  ctx.fill();
  ctx.strokeStyle = '#5e3a1c';
  ctx.lineWidth = 2.5 * S;
  rr(ctx, 2, 2, w - 4, h - 4, 6 * S);
  ctx.stroke();

  // 나뭇결
  ctx.strokeStyle = 'rgba(94,58,28,0.45)';
  ctx.lineWidth = 1.4 * S;
  for (let i = 0; i < 3; i++) {
    const y = h * (0.28 + i * 0.24);
    ctx.beginPath();
    ctx.moveTo(w * 0.06, y);
    for (let x = 0.06; x < 0.94; x += 0.08) {
      ctx.quadraticCurveTo(
        w * (x + 0.04), y + Math.sin(x * 20 + i) * 2.4 * S,
        w * (x + 0.08), y,
      );
    }
    ctx.stroke();
  }
  // 옹이
  ctx.strokeStyle = 'rgba(94,58,28,0.6)';
  ctx.beginPath();
  ctx.ellipse(w * 0.8, h * 0.5, 5 * S, 3.6 * S, 0, 0, Math.PI * 2);
  ctx.stroke();
  // 상단 하이라이트
  ctx.fillStyle = 'rgba(255,235,200,0.25)';
  rr(ctx, 5 * S, 3 * S, w - 10 * S, 4.5 * S, 3 * S);
  ctx.fill();

  // 겁먹은 표정
  eyes(ctx, w * 0.32, h * 0.48, 9 * S, 5 * S, '#3a2312', 1.5);
  worriedMouth(ctx, w * 0.32, h * 0.72, 12 * S, '#3a2312');
}

function drawStone(ctx: Ctx, w: number, h: number) {
  // 모서리가 깨진 다각형
  const c = 7 * S;
  ctx.beginPath();
  ctx.moveTo(c * 1.6, 2);
  ctx.lineTo(w - c, 2);
  ctx.lineTo(w - 2, c * 1.4);
  ctx.lineTo(w - 2, h - c);
  ctx.lineTo(w - c * 1.8, h - 2);
  ctx.lineTo(c, h - 2);
  ctx.lineTo(2, h - c * 1.5);
  ctx.lineTo(2, c);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#9aa8b8');
  grad.addColorStop(0.55, '#77869a');
  grad.addColorStop(1, '#57647a');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#3c4757';
  ctx.lineWidth = 2.5 * S;
  ctx.stroke();

  // 균열
  ctx.strokeStyle = 'rgba(45,55,70,0.75)';
  ctx.lineWidth = 1.5 * S;
  ctx.beginPath();
  ctx.moveTo(w * 0.72, h * 0.08);
  ctx.lineTo(w * 0.65, h * 0.3);
  ctx.lineTo(w * 0.73, h * 0.44);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.12, h * 0.92);
  ctx.lineTo(w * 0.2, h * 0.72);
  ctx.stroke();
  // 상단 하이라이트
  ctx.fillStyle = 'rgba(230,240,255,0.18)';
  ctx.fillRect(c * 1.6, 3 * S, w - c * 3, 4 * S);

  // 무표정하고 묵직한 얼굴
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 3 * S;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(w * 0.42 + side * 11 * S - 4.5 * S, h * 0.42);
    ctx.lineTo(w * 0.42 + side * 11 * S + 4.5 * S, h * 0.42);
    ctx.stroke();
  }
  flatMouth(ctx, w * 0.42, h * 0.66, 13 * S, '#2d3748');
}

function drawGlass(ctx: Ctx, w: number, h: number) {
  // 왕관 형태
  const baseY = h * 0.62;
  ctx.beginPath();
  ctx.moveTo(3, h - 3);
  ctx.lineTo(3, baseY);
  ctx.lineTo(w * 0.2, h * 0.18);
  ctx.lineTo(w * 0.36, baseY * 0.82);
  ctx.lineTo(w * 0.5, h * 0.06);
  ctx.lineTo(w * 0.64, baseY * 0.82);
  ctx.lineTo(w * 0.8, h * 0.18);
  ctx.lineTo(w - 3, baseY);
  ctx.lineTo(w - 3, h - 3);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, 'rgba(140,240,235,0.85)');
  grad.addColorStop(0.5, 'rgba(80,200,215,0.75)');
  grad.addColorStop(1, 'rgba(50,150,190,0.8)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,255,255,0.9)';
  ctx.lineWidth = 2 * S;
  ctx.stroke();

  // 꼭짓점 보석
  for (const tx of [0.2, 0.5, 0.8]) {
    ctx.fillStyle = tx === 0.5 ? '#ffe9a8' : '#c8fff8';
    ctx.beginPath();
    ctx.arc(w * tx, h * (tx === 0.5 ? 0.07 : 0.18), 3.4 * S, 0, Math.PI * 2);
    ctx.fill();
  }
  // 빛 굴절 스트릭
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2.2 * S;
  ctx.beginPath();
  ctx.moveTo(w * 0.16, h * 0.86);
  ctx.lineTo(w * 0.34, h * 0.4);
  ctx.stroke();
  ctx.lineWidth = 1.2 * S;
  ctx.beginPath();
  ctx.moveTo(w * 0.26, h * 0.88);
  ctx.lineTo(w * 0.42, h * 0.48);
  ctx.stroke();

  // 자신만만한 표정
  closedEyes(ctx, w * 0.5, h * 0.76, 8.5 * S, 4 * S, '#0e5c6e');
  smileMouth(ctx, w * 0.5, h * 0.84, 10 * S, '#0e5c6e');
}

function drawGold(ctx: Ctx, w: number, h: number) {
  // 금괴 사다리꼴
  const inset = w * 0.09;
  ctx.beginPath();
  ctx.moveTo(inset, 3);
  ctx.lineTo(w - inset, 3);
  ctx.lineTo(w - 3, h - 3);
  ctx.lineTo(3, h - 3);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ffe98a');
  grad.addColorStop(0.45, '#f5b93c');
  grad.addColorStop(1, '#c98a12');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#8a5c05';
  ctx.lineWidth = 2.5 * S;
  ctx.stroke();

  // 윗면
  ctx.fillStyle = 'rgba(255,246,190,0.85)';
  ctx.beginPath();
  ctx.moveTo(inset, 3);
  ctx.lineTo(w - inset, 3);
  ctx.lineTo(w - inset - 4 * S, 7 * S);
  ctx.lineTo(inset + 4 * S, 7 * S);
  ctx.closePath();
  ctx.fill();

  // 각인
  ctx.fillStyle = 'rgba(138,92,5,0.55)';
  ctx.font = `bold ${9 * S}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('999.9', w * 0.5, h * 0.34);

  // 반짝임 스트릭
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 3 * S;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.72, h * 0.2);
  ctx.lineTo(w * 0.84, h * 0.55);
  ctx.stroke();

  // 탐욕스러운 웃음
  eyes(ctx, w * 0.5, h * 0.56, 10 * S, 4.6 * S, '#7a4a02', 0);
  ctx.strokeStyle = '#7a4a02';
  ctx.lineWidth = 2.4 * S;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 11 * S, h * 0.74);
  ctx.quadraticCurveTo(w * 0.5, h * 0.92, w * 0.5 + 11 * S, h * 0.74);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 6 * S, h * 0.8);
  ctx.lineTo(w * 0.5 + 6 * S, h * 0.8);
  ctx.stroke();
}

function drawFoundation(ctx: Ctx, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#7e8fb8');
  grad.addColorStop(0.5, '#5d6b94');
  grad.addColorStop(1, '#414c70');
  ctx.fillStyle = grad;
  rr(ctx, 2, 2, w - 4, h - 4, 5 * S);
  ctx.fill();
  ctx.strokeStyle = '#2b3350';
  ctx.lineWidth = 2.5 * S;
  rr(ctx, 2, 2, w - 4, h - 4, 5 * S);
  ctx.stroke();
  // 베벨
  ctx.fillStyle = 'rgba(220,232,255,0.22)';
  rr(ctx, 4 * S, 3 * S, w - 8 * S, 4 * S, 2 * S);
  ctx.fill();

  // 빛나는 룬 문양
  ctx.strokeStyle = 'rgba(122,255,224,0.9)';
  ctx.lineWidth = 1.8 * S;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(122,255,224,0.9)';
  ctx.shadowBlur = 5 * S;
  const runeY = h * 0.52;
  const runes = [0.12, 0.24, 0.76, 0.88];
  runes.forEach((rx, i) => {
    const x = w * rx;
    ctx.beginPath();
    if (i % 2 === 0) {
      ctx.moveTo(x, runeY - 5 * S);
      ctx.lineTo(x + 4 * S, runeY);
      ctx.lineTo(x, runeY + 5 * S);
      ctx.lineTo(x - 4 * S, runeY);
      ctx.closePath();
    } else {
      ctx.moveTo(x - 3.6 * S, runeY - 5 * S);
      ctx.lineTo(x + 3.6 * S, runeY - 1.6 * S);
      ctx.lineTo(x - 3.6 * S, runeY + 1.6 * S);
      ctx.lineTo(x + 3.6 * S, runeY + 5 * S);
    }
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  // 듬직한 수호자 얼굴
  closedEyes(ctx, w * 0.5, h * 0.5, 9 * S, 4.2 * S, '#1c2440');
  smileMouth(ctx, w * 0.5, h * 0.68, 9 * S, '#1c2440');
}

// ── 배경/받침대/파티클 ──────────────────────────────────

function drawSky(ctx: Ctx, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0c0a24');
  grad.addColorStop(0.35, '#1c1447');
  grad.addColorStop(0.7, '#33246a');
  grad.addColorStop(1, '#4c3789');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // 지평선 마법 광채
  const glow = ctx.createRadialGradient(w / 2, h * 1.05, 40, w / 2, h * 1.05, h * 0.55);
  glow.addColorStop(0, 'rgba(126,90,220,0.5)');
  glow.addColorStop(0.6, 'rgba(90,70,180,0.18)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawIsland(ctx: Ctx, w: number, h: number) {
  const topH = h * 0.3;
  // 아래로 뾰족한 바위
  ctx.beginPath();
  ctx.moveTo(w * 0.06, topH);
  ctx.lineTo(w * 0.94, topH);
  ctx.lineTo(w * 0.8, h * 0.55);
  ctx.lineTo(w * 0.62, h * 0.78);
  ctx.lineTo(w * 0.5, h * 0.98);
  ctx.lineTo(w * 0.36, h * 0.7);
  ctx.lineTo(w * 0.18, h * 0.5);
  ctx.closePath();
  const rock = ctx.createLinearGradient(0, topH, 0, h);
  rock.addColorStop(0, '#4a4270');
  rock.addColorStop(1, '#241f42');
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.strokeStyle = '#191536';
  ctx.lineWidth = 2 * S;
  ctx.stroke();

  // 상판 석재
  const slab = ctx.createLinearGradient(0, 0, 0, topH);
  slab.addColorStop(0, '#8a7fc0');
  slab.addColorStop(1, '#5a5090');
  ctx.fillStyle = slab;
  rr(ctx, 0, 0, w, topH, 7 * S);
  ctx.fill();
  ctx.strokeStyle = '#332b60';
  ctx.lineWidth = 2 * S;
  rr(ctx, 1, 1, w - 2, topH - 2, 7 * S);
  ctx.stroke();
  // 벽돌 줄눈
  ctx.strokeStyle = 'rgba(40,32,80,0.5)';
  ctx.lineWidth = 1.2 * S;
  ctx.beginPath();
  ctx.moveTo(0, topH * 0.5);
  ctx.lineTo(w, topH * 0.5);
  ctx.stroke();
  for (const fx of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(w * fx, 2);
    ctx.lineTo(w * fx, topH * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * (fx - 0.125), topH * 0.5);
    ctx.lineTo(w * (fx - 0.125), topH - 2);
    ctx.stroke();
  }
  // 룬 발광 라인
  ctx.strokeStyle = 'rgba(126,255,224,0.75)';
  ctx.lineWidth = 1.6 * S;
  ctx.shadowColor = 'rgba(126,255,224,0.8)';
  ctx.shadowBlur = 6 * S;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, topH + 4 * S);
  ctx.lineTo(w * 0.9, topH + 4 * S);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // 매달린 수정
  for (const [cx, cy, r] of [
    [0.3, 0.62, 4], [0.68, 0.66, 5], [0.52, 0.86, 3.4],
  ] as const) {
    ctx.fillStyle = 'rgba(140,240,235,0.85)';
    ctx.beginPath();
    ctx.moveTo(w * cx, h * cy - r * S);
    ctx.lineTo(w * cx + r * S * 0.7, h * cy);
    ctx.lineTo(w * cx, h * cy + r * S * 1.3);
    ctx.lineTo(w * cx - r * S * 0.7, h * cy);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGlow(ctx: Ctx, size: number, color: string) {
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

function drawMoon(ctx: Ctx, size: number) {
  const r = size * 0.32;
  const cx = size / 2;
  const glow = ctx.createRadialGradient(cx, cx, r * 0.5, cx, cx, size / 2);
  glow.addColorStop(0, 'rgba(255,236,180,0.55)');
  glow.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  const body = ctx.createRadialGradient(cx - r * 0.3, cx - r * 0.3, r * 0.2, cx, cx, r);
  body.addColorStop(0, '#fff6d8');
  body.addColorStop(1, '#e8c878');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cx, r, 0, Math.PI * 2);
  ctx.fill();
  // 크레이터
  ctx.fillStyle = 'rgba(200,160,90,0.4)';
  for (const [ox, oy, cr] of [[-0.3, 0.1, 0.16], [0.25, -0.2, 0.12], [0.1, 0.35, 0.1]] as const) {
    ctx.beginPath();
    ctx.arc(cx + r * ox, cx + r * oy, r * cr, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(ctx: Ctx, w: number, h: number) {
  ctx.fillStyle = 'rgba(120,110,190,0.35)';
  for (const [fx, fy, fr] of [
    [0.25, 0.6, 0.32], [0.5, 0.45, 0.42], [0.75, 0.62, 0.3], [0.5, 0.7, 0.36],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(w * fx, h * fy, w * fr * 0.5, h * fr * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── 진입점 ─────────────────────────────────────────────

const BLOCK_PAINTERS: Record<string, (ctx: Ctx, w: number, h: number) => void> = {
  wood: drawWood,
  stone: drawStone,
  glass: drawGlass,
  gold: drawGold,
  foundation: drawFoundation,
};

export function blockTextureKey(def: BlockDef): string {
  return `block-${def.id}`;
}

export function generateAllTextures(scene: Phaser.Scene) {
  // 블록
  for (const def of Object.values(BLOCKS)) {
    const w = def.width * S;
    const h = def.height * S;
    const ctx = canvasTex(scene, blockTextureKey(def), w, h);
    if (ctx) {
      BLOCK_PAINTERS[def.id](ctx, w, h);
      refresh(scene, blockTextureKey(def));
    }
  }

  // 하늘
  {
    const { width, height } = BALANCE.design;
    const ctx = canvasTex(scene, 'sky', width, height);
    if (ctx) {
      drawSky(ctx, width, height);
      refresh(scene, 'sky');
    }
  }

  // 부유섬 받침대
  {
    const w = (BALANCE.design.groundWidth + 60) * S;
    const h = 190 * S;
    const ctx = canvasTex(scene, 'island', w, h);
    if (ctx) {
      drawIsland(ctx, w, h);
      refresh(scene, 'island');
    }
  }

  // 달 / 글로우 / 구름
  {
    const ctx = canvasTex(scene, 'moon', 220, 220);
    if (ctx) {
      drawMoon(ctx, 220);
      refresh(scene, 'moon');
    }
  }
  {
    const ctx = canvasTex(scene, 'glow', 128, 128);
    if (ctx) {
      drawGlow(ctx, 128, 'rgba(255,255,255,0.9)');
      refresh(scene, 'glow');
    }
  }
  {
    const ctx = canvasTex(scene, 'cloud', 200, 80);
    if (ctx) {
      drawCloud(ctx, 200, 80);
      refresh(scene, 'cloud');
    }
  }

  // 파티클용 도형 텍스처 (Graphics로 충분)
  if (!scene.textures.exists('p-dot')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('p-dot', 12, 12);
    g.destroy();
  }
  if (!scene.textures.exists('p-shard')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xaef0ea, 0.95);
    g.fillTriangle(7, 0, 14, 14, 0, 12);
    g.generateTexture('p-shard', 14, 14);
    g.destroy();
  }
  if (!scene.textures.exists('p-coin')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xf5b93c, 1);
    g.fillCircle(7, 7, 7);
    g.fillStyle(0xffe98a, 1);
    g.fillCircle(7, 7, 4);
    g.generateTexture('p-coin', 14, 14);
    g.destroy();
  }
  if (!scene.textures.exists('p-star')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    // 4각 별
    g.fillTriangle(8, 0, 10, 6, 6, 6);
    g.fillTriangle(16, 8, 10, 10, 10, 6);
    g.fillTriangle(8, 16, 6, 10, 10, 10);
    g.fillTriangle(0, 8, 6, 6, 6, 10);
    g.generateTexture('p-star', 16, 16);
    g.destroy();
  }
  if (!scene.textures.exists('p-ring')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(32, 32, 28);
    g.generateTexture('p-ring', 64, 64);
    g.destroy();
  }
}
