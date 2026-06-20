// 免素材音效：用 Web Audio 合成（#11）。皆於使用者點擊時觸發，符合自動播放政策。
let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem("wfg-muted") === "1";
} catch {
  // 忽略
}

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// 排程一個帶包絡的音
function tone(freq: number, t0: number, dur: number, type: OscillatorType = "triangle", peak = 0.18) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const now = c.currentTime + t0;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(peak, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.start(now);
  o.stop(now + dur + 0.03);
}

export const Sfx = {
  isMuted: () => muted,
  toggle(): boolean {
    muted = !muted;
    try {
      localStorage.setItem("wfg-muted", muted ? "1" : "0");
    } catch {
      // 忽略
    }
    if (!muted) tone(880, 0, 0.08); // 解除靜音時回饋一聲
    return muted;
  },
  click() {
    if (muted) return;
    tone(620, 0, 0.07, "triangle", 0.14);
  },
  success() {
    if (muted) return;
    [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.085, 0.2, "triangle", 0.16)); // C–E–G 上行
  },
  error() {
    if (muted) return;
    tone(220, 0, 0.18, "square", 0.16);
    tone(160, 0.07, 0.22, "square", 0.13);
  },
  cash() {
    if (muted) return;
    tone(988, 0, 0.09, "square", 0.12); // 投幣感雙高音
    tone(1319, 0.07, 0.13, "square", 0.12);
  },
};
