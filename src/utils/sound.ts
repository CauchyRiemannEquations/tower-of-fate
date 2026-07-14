/**
 * Web Audio API 기반 생성형 효과음.
 * 외부 음원 없이 오실레이터 + 노이즈로 모든 SFX를 만든다.
 * 모바일 정책에 따라 최초 사용자 입력 후 unlock()을 호출해야 한다.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function ensureCtx(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 최초 사용자 제스처에서 호출 — 오디오 컨텍스트 활성화 */
export function unlockAudio() {
  ensureCtx();
}

function tone(
  freq: number,
  dur: number,
  opts: {
    type?: OscillatorType;
    vol?: number;
    slideTo?: number;
    delay?: number;
  } = {},
) {
  const c = ensureCtx();
  if (!c || !master) return;
  const { type = 'sine', vol = 0.3, slideTo, delay = 0 } = opts;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  }
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;

function noise(dur: number, opts: { vol?: number; filter?: number; delay?: number; slideTo?: number } = {}) {
  const c = ensureCtx();
  if (!c || !master) return;
  const { vol = 0.3, filter = 1200, delay = 0, slideTo } = opts;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filter, t0);
  if (slideTo !== undefined) {
    f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
  },

  select() {
    tone(620, 0.08, { type: 'triangle', vol: 0.2 });
    tone(880, 0.1, { type: 'triangle', vol: 0.18, delay: 0.05 });
  },

  whoosh() {
    noise(0.25, { vol: 0.15, filter: 2600, slideTo: 300 });
  },

  landWood() {
    tone(150, 0.12, { type: 'triangle', vol: 0.3, slideTo: 90 });
    noise(0.1, { vol: 0.2, filter: 900 });
  },

  landStone() {
    tone(75, 0.2, { type: 'triangle', vol: 0.45, slideTo: 45 });
    noise(0.16, { vol: 0.32, filter: 500 });
  },

  landGlass() {
    tone(1560, 0.12, { type: 'sine', vol: 0.2, slideTo: 1200 });
    tone(2090, 0.09, { type: 'sine', vol: 0.13, delay: 0.03 });
    noise(0.07, { vol: 0.1, filter: 5200 });
  },

  landGold() {
    tone(880, 0.1, { type: 'square', vol: 0.12 });
    tone(1320, 0.14, { type: 'sine', vol: 0.18, delay: 0.04 });
    tone(60, 0.22, { type: 'triangle', vol: 0.4, slideTo: 40 });
    noise(0.14, { vol: 0.25, filter: 700 });
  },

  landFoundation() {
    tone(60, 0.3, { type: 'triangle', vol: 0.45, slideTo: 38 });
    tone(240, 0.25, { type: 'sine', vol: 0.14, delay: 0.08, slideTo: 180 });
    noise(0.2, { vol: 0.28, filter: 420 });
  },

  perfect() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => tone(n, 0.16, { type: 'triangle', vol: 0.22, delay: i * 0.07 }));
    tone(1568, 0.3, { type: 'sine', vol: 0.14, delay: 0.3 });
  },

  lucky() {
    tone(440, 0.3, { type: 'sawtooth', vol: 0.12, slideTo: 880 });
    [1046, 1318, 1568].forEach((n, i) =>
      tone(n, 0.14, { type: 'sine', vol: 0.16, delay: 0.15 + i * 0.08 }),
    );
  },

  nearMiss() {
    noise(0.12, { vol: 0.25, filter: 4200, slideTo: 800 });
    tone(220, 0.18, { type: 'sawtooth', vol: 0.12, slideTo: 140 });
  },

  crack() {
    noise(0.08, { vol: 0.3, filter: 6400, slideTo: 2000 });
  },

  checkpoint() {
    [660, 880].forEach((n, i) => tone(n, 0.14, { type: 'triangle', vol: 0.2, delay: i * 0.1 }));
  },

  bank() {
    [1318, 1046, 880, 1046, 1318, 1568].forEach((n, i) =>
      tone(n, 0.12, { type: 'sine', vol: 0.17, delay: i * 0.07 }),
    );
    tone(523, 0.5, { type: 'triangle', vol: 0.12, delay: 0.2 });
  },

  collapse() {
    noise(1.1, { vol: 0.4, filter: 1800, slideTo: 120 });
    tone(180, 0.9, { type: 'sawtooth', vol: 0.2, slideTo: 40 });
    tone(90, 1.1, { type: 'triangle', vol: 0.3, slideTo: 30 });
  },

  shatter() {
    for (let i = 0; i < 4; i++) {
      tone(1800 + Math.random() * 1400, 0.1, { type: 'sine', vol: 0.1, delay: i * 0.04 });
    }
    noise(0.18, { vol: 0.2, filter: 6800, slideTo: 2400 });
  },
};
