import { audioCtx } from "./sfx";

// 場景背景音樂（#19）：免素材，用 Web Audio 合成「依場景變化的環境 pad + 稀疏琶音」。
// 各場景一組和弦氛圍；CC0 真實音樂日後可替換此引擎。
const CHORDS: Record<string, number[]> = {
  hub: [130.81, 164.81, 196.0], // C 大調 — 母港溫暖
  market: [146.83, 185.0, 220.0], // 明亮 — 交易所市集
  sail: [146.83, 196.0, 246.94], // 開放和聲 — 出海
  repair: [110.0, 130.81, 164.81], // A 小調 — 維修緊張
};
const VOL = 0.05;

let started = false;
let master: GainNode | null = null;
const osc: OscillatorNode[] = [];
let current = "";
let muted = false;
try {
  muted = localStorage.getItem("wfg-bgm-muted") === "1";
} catch {
  // 忽略
}

function ensure() {
  if (started) return;
  const c = audioCtx();
  master = c.createGain();
  master.gain.value = muted ? 0 : VOL;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 820;
  lp.connect(master);
  master.connect(c.destination);
  for (let i = 0; i < 3; i++) {
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = CHORDS.hub[i];
    const g = c.createGain();
    g.gain.value = 0.5;
    o.connect(g);
    g.connect(lp);
    o.start();
    osc.push(o);
  }
  started = true;
  window.setInterval(arpHit, 2800); // 稀疏琶音點綴
}

function arpHit() {
  if (muted || !current || !master) return;
  const c = audioCtx();
  const ch = CHORDS[current] || CHORDS.hub;
  const f = ch[Math.floor(Math.random() * ch.length)] * 2;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = f;
  o.connect(g);
  g.connect(master);
  const now = c.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.5, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  o.start(now);
  o.stop(now + 1.7);
}

export const Bgm = {
  isMuted: () => muted,
  play(scene: string) {
    ensure();
    if (scene === current) return;
    current = scene;
    const c = audioCtx();
    const ch = CHORDS[scene] || CHORDS.hub;
    osc.forEach((o, i) => o.frequency.linearRampToValueAtTime(ch[i], c.currentTime + 0.8)); // 平滑換和弦
  },
  setMuted(b: boolean) {
    muted = b;
    try {
      localStorage.setItem("wfg-bgm-muted", b ? "1" : "0");
    } catch {
      // 忽略
    }
    if (master) {
      const c = audioCtx();
      master.gain.linearRampToValueAtTime(b ? 0 : VOL, c.currentTime + 0.25);
    }
  },
};
