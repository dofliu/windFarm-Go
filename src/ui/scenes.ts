import type { I18n } from "../game/systems/types";

// 背景風機配置（傳入 Turbine 的可變欄位）
export interface TurbineCfg {
  left: string;
  bottom: string;
  opacity: number;
  scale: number;
  spin: number;
  base: number;
}

// 模擬模式（會動的 CSS）海域主題：每個海域有不同風機配置
export interface SceneTheme {
  id: string;
  name: I18n;
  sky: string;
  sunGlow: string;
  sea: string;
  reflection: string;
  turbines: TurbineCfg[];
  showSubstation: boolean;
  showFleet: boolean;
  pier: boolean;
}

const LAY_COAST: TurbineCfg[] = [
  { left: "32%", bottom: "41%", opacity: 0.85, scale: 1.6, spin: 10, base: 0 },
  { left: "48%", bottom: "37%", opacity: 0.95, scale: 2.2, spin: 8.5, base: 40 },
  { left: "63%", bottom: "40%", opacity: 0.8, scale: 1.7, spin: 11, base: 20 },
];
const LAY_DENSE: TurbineCfg[] = [
  { left: "22%", bottom: "43%", opacity: 0.6, scale: 1.2, spin: 13, base: 10 },
  { left: "34%", bottom: "39%", opacity: 0.82, scale: 1.7, spin: 11, base: 35 },
  { left: "46%", bottom: "35.5%", opacity: 0.95, scale: 2.3, spin: 9, base: 0 },
  { left: "59%", bottom: "38.5%", opacity: 0.84, scale: 1.85, spin: 10, base: 50 },
  { left: "71%", bottom: "42%", opacity: 0.64, scale: 1.35, spin: 8.5, base: 20 },
  { left: "82%", bottom: "45%", opacity: 0.46, scale: 1.0, spin: 12, base: 60 },
];
const LAY_SUNSET: TurbineCfg[] = [
  { left: "26%", bottom: "44%", opacity: 0.5, scale: 1.1, spin: 12, base: 15 },
  { left: "44%", bottom: "38%", opacity: 0.7, scale: 2.0, spin: 9, base: 0 },
  { left: "58%", bottom: "41%", opacity: 0.6, scale: 1.5, spin: 10.5, base: 45 },
  { left: "70%", bottom: "44%", opacity: 0.42, scale: 1.05, spin: 13, base: 70 },
];
const LAY_DEEP: TurbineCfg[] = [
  { left: "28%", bottom: "40%", opacity: 0.8, scale: 1.7, spin: 10, base: 5 },
  { left: "44%", bottom: "37%", opacity: 0.92, scale: 2.1, spin: 8, base: 50 },
  { left: "70%", bottom: "41%", opacity: 0.7, scale: 1.5, spin: 11, base: 25 },
  { left: "82%", bottom: "44%", opacity: 0.5, scale: 1.1, spin: 12.5, base: 80 },
];
const LAY_STORM: TurbineCfg[] = [
  { left: "36%", bottom: "42%", opacity: 0.7, scale: 1.8, spin: 5.5, base: 20 },
  { left: "60%", bottom: "44%", opacity: 0.55, scale: 1.3, spin: 6, base: 60 },
];

export const SCENES: SceneTheme[] = [
  { id: "changhua_dawn", name: { zh: "彰化外海 · 晨曦", en: "Changhua · Dawn" }, sky: "linear-gradient(180deg,#9dc0d6 0%, #bcd2da 28%, #ddd5c1 50%, #f0e2c4 60%)", sunGlow: "radial-gradient(circle at 50% 88%, rgba(255,243,212,.95), rgba(255,243,212,0) 42%)", sea: "linear-gradient(180deg,#5e97a2 0%, #347683 32%, #1d5160 72%, #143f4c 100%)", reflection: "rgba(255,236,196,.5)", turbines: LAY_COAST, showSubstation: false, showFleet: true, pier: true },
  { id: "noon_azure", name: { zh: "正午 · 湛藍", en: "Noon · Azure" }, sky: "linear-gradient(180deg,#6fb6e8 0%, #9fd0ef 40%, #d3ecf7 60%)", sunGlow: "radial-gradient(circle at 50% 78%, rgba(255,255,255,.85), rgba(255,255,255,0) 38%)", sea: "linear-gradient(180deg,#2f9fc4 0%, #1f7fa8 34%, #145f86 72%, #0d4763 100%)", reflection: "rgba(220,245,255,.5)", turbines: LAY_DENSE, showSubstation: true, showFleet: true, pier: true },
  { id: "dusk_violet", name: { zh: "黃昏 · 霞彩", en: "Dusk · Glow" }, sky: "linear-gradient(180deg,#5b4b8a 0%, #9c5e9e 32%, #e08a8a 52%, #f3b27a 62%)", sunGlow: "radial-gradient(circle at 50% 86%, rgba(255,210,170,.9), rgba(255,170,150,0) 44%)", sea: "linear-gradient(180deg,#6a5b8f 0%, #3f5680 34%, #243f63 72%, #16263f 100%)", reflection: "rgba(255,200,160,.5)", turbines: LAY_SUNSET, showSubstation: true, showFleet: true, pier: true },
  { id: "deepsea_oss", name: { zh: "深海風場 · 安裝船", en: "Deep-sea · Jack-up" }, sky: "linear-gradient(180deg,#244b63 0%, #38708a 36%, #79b0c2 58%)", sunGlow: "radial-gradient(circle at 50% 80%, rgba(200,235,245,.7), rgba(200,235,245,0) 40%)", sea: "linear-gradient(180deg,#2a7d92 0%, #1c5d72 34%, #11455a 72%, #0a3040 100%)", reflection: "rgba(210,240,250,.45)", turbines: LAY_DEEP, showSubstation: true, showFleet: true, pier: false },
  { id: "storm_sea", name: { zh: "風暴海域 · 停航", en: "Storm Sea" }, sky: "linear-gradient(180deg,#2b3340 0%, #46505e 40%, #6b7480 62%)", sunGlow: "radial-gradient(circle at 60% 30%, rgba(180,190,200,.4), rgba(180,190,200,0) 45%)", sea: "linear-gradient(180deg,#37434e 0%, #28323b 38%, #1a2329 72%, #0f1519 100%)", reflection: "rgba(160,175,185,.3)", turbines: LAY_STORM, showSubstation: false, showFleet: false, pier: false },
];

export const sceneById = (id: string): SceneTheme => SCENES.find((s) => s.id === id) ?? SCENES[0];

// 圖片背景（實境 / 漫畫）— 檔案在 public/assets/scenes 下
export interface SceneImg {
  file: string;
  name: I18n;
}
export const REALISTIC: SceneImg[] = [
  { file: "real_day.jpg", name: { zh: "晴日藍海", en: "Clear day" } },
  { file: "real_sunset.jpg", name: { zh: "夕陽運維船", en: "Sunset CSV" } },
  { file: "real_floating.jpg", name: { zh: "浮式基礎", en: "Floating" } },
  { file: "real_fleet.jpg", name: { zh: "母船船隊", en: "Fleet" } },
  { file: "real_coast.jpg", name: { zh: "沿岸陰天", en: "Coast overcast" } },
  { file: "real_jackup.jpg", name: { zh: "安裝作業", en: "Installation" } },
  { file: "real_boarding.jpg", name: { zh: "登塔作業", en: "Boarding" } },
  { file: "real_storm.jpg", name: { zh: "風暴海象", en: "Storm" } },
  { file: "harbor.jpg", name: { zh: "母港清晨", en: "Home port" } },
];
export const COMIC: SceneImg[] = [
  { file: "comic_sunset.jpg", name: { zh: "夕陽帆船", en: "Sunset galleon" } },
  { file: "comic_night.jpg", name: { zh: "星空航道", en: "Starlit lane" } },
  { file: "comic_storm.jpg", name: { zh: "風暴搶修", en: "Storm repair" } },
  { file: "comic_platform.jpg", name: { zh: "雨中平台", en: "Rainy platform" } },
  { file: "comic_starry.jpg", name: { zh: "銀河風場", en: "Galaxy farm" } },
  { file: "comic_harbor.jpg", name: { zh: "母港清晨", en: "Home port" } },
];

export type SceneMode = "sim" | "real" | "comic";
export const MODE_LABEL: Record<SceneMode, I18n> = {
  sim: { zh: "模擬模式", en: "Simulation" },
  real: { zh: "實境模式", en: "Realistic" },
  comic: { zh: "漫畫模式", en: "Comic" },
};
export const MODE_ICON: Record<SceneMode, string> = { sim: "✏️", real: "📷", comic: "🖼" };
export const imagesFor = (m: SceneMode): SceneImg[] => (m === "real" ? REALISTIC : m === "comic" ? COMIC : []);

// ── 持久化 ──
const SCENE_KEY = "wfg-scene";
const MODE_KEY = "wfg-mode";
const IDX_KEY = "wfg-img-idx";
const get = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* 忽略 */ } };

export const getSceneId = () => get(SCENE_KEY, SCENES[0].id);
export const setSceneId = (id: string) => set(SCENE_KEY, id);
export const getMode = (): SceneMode => { const m = get(MODE_KEY, "sim"); return m === "real" || m === "comic" ? m : "sim"; };
export const setMode = (m: SceneMode) => set(MODE_KEY, m);
export const getImgIdx = () => { const n = parseInt(get(IDX_KEY, "0"), 10); return isNaN(n) ? 0 : n; };
export const setImgIdx = (n: number) => set(IDX_KEY, String(n));
