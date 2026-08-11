import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

// 실행: node scripts/make-icons.mjs (playwright-core + Chromium 필요)
const OUT = new URL('../public/icons', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/**
 * 게임 메뉴의 탑(기초석→나무→돌→금괴→유리 왕관)을 그대로 아이콘화.
 * fullBleed: 배경이 캔버스를 꽉 채움 (maskable/apple-touch 용).
 * rounded:   iOS풍 라운드 사각 배경, 모서리 투명 (일반 아이콘/파비콘 용).
 * maskable은 런처가 원형 등으로 잘라내므로 탑을 안전영역(중앙 80%)에 맞춰 줄인다.
 */
function towerSvg({ fullBleed = false, safeZone = false } = {}) {
  const rx = fullBleed ? 0 : 108;
  const scale = safeZone ? 0.74 : 0.92;
  const g = `translate(256 262) scale(${scale}) translate(-256 -262)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#332664"/>
      <stop offset="0.55" stop-color="#1a123a"/>
      <stop offset="1" stop-color="#0a071e"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c08a52"/><stop offset="1" stop-color="#7d4f28"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa8b8"/><stop offset="1" stop-color="#57647a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe98a"/><stop offset="1" stop-color="#c98a12"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8cf0eb"/><stop offset="1" stop-color="#3296be"/>
    </linearGradient>
    <linearGradient id="found" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7e8fb8"/><stop offset="1" stop-color="#414c70"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffe9b0" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffe9b0" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="512" height="512" rx="${rx}" fill="url(#sky)"/>

  <g transform="${g}">
    <!-- 달 -->
    <circle cx="404" cy="106" r="92" fill="url(#moonGlow)"/>
    <circle cx="404" cy="106" r="46" fill="#ffe9b0"/>
    <circle cx="390" cy="96" r="9" fill="#ecd28f"/>
    <circle cx="416" cy="120" r="6" fill="#ecd28f"/>

    <!-- 별 -->
    <circle cx="86" cy="96" r="5" fill="#fff" opacity="0.9"/>
    <circle cx="140" cy="170" r="3.4" fill="#fff" opacity="0.6"/>
    <circle cx="60" cy="220" r="3.4" fill="#cdbfff" opacity="0.7"/>
    <circle cx="440" cy="250" r="3.4" fill="#fff" opacity="0.55"/>
    <circle cx="106" cy="330" r="3" fill="#cdbfff" opacity="0.5"/>

    <!-- 탑 (아래→위) -->
    <g stroke="#150f30" stroke-width="7" stroke-linejoin="round">
      <rect x="106" y="376" width="300" height="58" rx="12" fill="url(#found)"/>
      <rect x="128" y="326" width="256" height="50" rx="11" fill="url(#wood)"/>
      <rect x="150" y="270" width="212" height="56" rx="11" fill="url(#stone)"/>
      <path d="M184 218 h144 l18 52 h-180 Z" fill="url(#gold)"/>
      <path d="M186 218 v-34 l24 -36 18 30 28 -44 28 44 18 -30 24 36 v34 Z" fill="url(#glass)" fill-opacity="0.95"/>
    </g>
    <!-- 금괴 광 -->
    <path d="M196 226 h54 l-6 14 h-52 Z" fill="#fff5c9" opacity="0.55"/>
    <!-- 나무 나이테 점 -->
    <circle cx="170" cy="351" r="6" fill="#5e3a1c" opacity="0.8"/>
    <circle cx="342" cy="351" r="6" fill="#5e3a1c" opacity="0.8"/>
  </g>
</svg>`;
}

// 소스 SVG 저장 (파비콘 겸용)
writeFileSync(`${OUT}/logo.svg`, towerSvg({ fullBleed: false }));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function render(svg, size, path, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const bg = transparent ? 'transparent' : '#0a071e';
  await page.setContent(
    `<style>html,body{margin:0;background:${bg}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path, omitBackground: transparent });
  await page.close();
  console.log('written', path);
}

const rounded = towerSvg({ fullBleed: false });
const bleed = towerSvg({ fullBleed: true });
const maskable = towerSvg({ fullBleed: true, safeZone: true });

await render(rounded, 512, `${OUT}/icon-512.png`, { transparent: true });
await render(rounded, 192, `${OUT}/icon-192.png`, { transparent: true });
await render(maskable, 512, `${OUT}/icon-maskable-512.png`);
await render(bleed, 180, `${OUT}/apple-touch-icon.png`);
await render(rounded, 32, `${OUT}/favicon-32.png`, { transparent: true });

await browser.close();
console.log('done');
