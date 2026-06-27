// 產生 PWA PNG 圖示(零相依:只用 Node 內建 zlib 自寫 PNG 編碼器 + 程式繪圖)。
// 重新產生:node scripts/gen-icons.mjs  →  public/icon-192.png / icon-512.png / apple-touch-icon-180.png
// 風格對齊 public/icon.svg(深藍漸層底 + 金色風機 + 海浪),全出血以相容 maskable。
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// ── CRC32 / PNG 編碼 ──
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(W, H, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; rgba.subarray(y * W * 4, (y + 1) * W * 4).forEach((v, i) => { raw[y * (W * 4 + 1) + 1 + i] = v; }); }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ── 繪圖(在 2x 超取樣畫布上畫,再降採樣做抗鋸齒)──
const lerp = (a, b, t) => a + (b - a) * t;
function render(size) {
  const S = size * 2, buf = new Float32Array(S * S * 3); // RGB(已預乘背景,圖示全出血不需 alpha)
  const px = (x, y, r, g, b, a = 1) => { if (x < 0 || y < 0 || x >= S || y >= S) return; const i = (y * S + x) * 3; buf[i] = lerp(buf[i], r, a); buf[i + 1] = lerp(buf[i + 1], g, a); buf[i + 2] = lerp(buf[i + 2], b, a); };
  // 背景深藍漸層
  for (let y = 0; y < S; y++) { const t = y / S; const r = lerp(20, 7, t), g = lerp(52, 13, t), b = lerp(63, 17, t); for (let x = 0; x < S; x++) { const i = (y * S + x) * 3; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; } }
  // 海浪(兩層)
  for (let x = 0; x < S; x++) {
    const y1 = S * 0.76 + Math.sin(x / S * Math.PI * 6) * S * 0.018;
    const y2 = S * 0.82 + Math.sin(x / S * Math.PI * 6 + 1) * S * 0.016;
    for (let y = Math.floor(y1); y < S; y++) px(x, y, 15, 49, 64, 0.9);
    for (let y = Math.floor(y2); y < S; y++) px(x, y, 21, 80, 106, 0.85);
  }
  const cx = S * 0.5, cy = S * 0.40;
  // 塔架
  const tw = S * 0.018; for (let y = Math.floor(cy); y < S * 0.80; y++) for (let x = Math.floor(cx - tw); x <= cx + tw; x++) px(x, y, 217, 164, 65);
  // 三葉片(120°)— 細長三角形,頂點朝外
  const L = S * 0.30, bw = S * 0.026;
  const tri = (ax, ay, bx, by, cxx, cyy, r, g, b) => {
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cxx))), maxx = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cxx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cyy))), maxy = Math.min(S - 1, Math.ceil(Math.max(ay, by, cyy)));
    const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const d1 = sign(x, y, ax, ay, bx, by), d2 = sign(x, y, bx, by, cxx, cyy), d3 = sign(x, y, cxx, cyy, ax, ay);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0, hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(hasNeg && hasPos)) px(x, y, r, g, b);
    }
  };
  for (const deg of [0, 120, 240]) {
    const a = (deg - 90) * Math.PI / 180; // 0°朝上
    const rot = (dx, dy) => [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
    const [tx, ty] = rot(L, 0);          // 葉尖
    const [b1x, b1y] = rot(0, -bw);      // 葉根兩側
    const [b2x, b2y] = rot(0, bw);
    tri(tx, ty, b1x, b1y, b2x, b2y, 240, 212, 136);
  }
  // 輪轂 + 機艙
  const circle = (ccx, ccy, rad, r, g, b) => { for (let y = Math.floor(ccy - rad); y <= ccy + rad; y++) for (let x = Math.floor(ccx - rad); x <= ccx + rad; x++) if ((x - ccx) ** 2 + (y - ccy) ** 2 <= rad * rad) px(x, y, r, g, b); };
  for (let y = Math.floor(cy - S * 0.012); y < cy + S * 0.05; y++) for (let x = Math.floor(cx - S * 0.04); x <= cx + S * 0.04; x++) px(x, y, 255, 236, 196);
  circle(cx, cy, S * 0.028, 255, 236, 196);

  // 降採樣 2x → size,輸出 RGBA(alpha 全 255)
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = ((y * 2 + dy) * S + (x * 2 + dx)) * 3; r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; }
    const o = (y * size + x) * 4; out[o] = r / 4; out[o + 1] = g / 4; out[o + 2] = b / 4; out[o + 3] = 255;
  }
  return out;
}

for (const [name, size] of [["icon-512.png", 512], ["icon-192.png", 192], ["apple-touch-icon-180.png", 180]]) {
  writeFileSync(`public/${name}`, encodePNG(size, size, render(size)));
  console.log(`wrote public/${name} (${size}x${size})`);
}
