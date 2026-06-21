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

// 可切換的海域背景主題（#32）：資料驅動。每個海域有「不同風機配置」與對應實景照片。
export interface SceneTheme {
  id: string;
  name: I18n;
  sky: string; // 模擬模式天空漸層
  sunGlow: string;
  sea: string;
  reflection: string;
  turbines: TurbineCfg[]; // 模擬模式風機配置（各海域不同）
  showSubstation: boolean;
  showFleet: boolean;
  pier: boolean;
  realImg: string; // 實境模式背景照片（public/assets/scenes 下檔名）
}

// ── 各海域「不同」的風機配置 ──
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
  {
    id: "changhua_dawn",
    name: { zh: "彰化外海 · 晨曦", en: "Changhua · Dawn" },
    sky: "linear-gradient(180deg,#9dc0d6 0%, #bcd2da 28%, #ddd5c1 50%, #f0e2c4 60%)",
    sunGlow: "radial-gradient(circle at 50% 88%, rgba(255,243,212,.95), rgba(255,243,212,0) 42%)",
    sea: "linear-gradient(180deg,#5e97a2 0%, #347683 32%, #1d5160 72%, #143f4c 100%)",
    reflection: "rgba(255,236,196,.5)",
    turbines: LAY_COAST, showSubstation: false, showFleet: true, pier: true, realImg: "coast_day.jpg",
  },
  {
    id: "noon_azure",
    name: { zh: "正午 · 湛藍", en: "Noon · Azure" },
    sky: "linear-gradient(180deg,#6fb6e8 0%, #9fd0ef 40%, #d3ecf7 60%)",
    sunGlow: "radial-gradient(circle at 50% 78%, rgba(255,255,255,.85), rgba(255,255,255,0) 38%)",
    sea: "linear-gradient(180deg,#2f9fc4 0%, #1f7fa8 34%, #145f86 72%, #0d4763 100%)",
    reflection: "rgba(220,245,255,.5)",
    turbines: LAY_DENSE, showSubstation: true, showFleet: true, pier: true, realImg: "blue_jacket.jpg",
  },
  {
    id: "dusk_violet",
    name: { zh: "黃昏 · 霞彩", en: "Dusk · Glow" },
    sky: "linear-gradient(180deg,#5b4b8a 0%, #9c5e9e 32%, #e08a8a 52%, #f3b27a 62%)",
    sunGlow: "radial-gradient(circle at 50% 86%, rgba(255,210,170,.9), rgba(255,170,150,0) 44%)",
    sea: "linear-gradient(180deg,#6a5b8f 0%, #3f5680 34%, #243f63 72%, #16263f 100%)",
    reflection: "rgba(255,200,160,.5)",
    turbines: LAY_SUNSET, showSubstation: true, showFleet: true, pier: true, realImg: "sunset.jpg",
  },
  {
    id: "deepsea_oss",
    name: { zh: "深海風場 · 安裝船", en: "Deep-sea · Jack-up" },
    sky: "linear-gradient(180deg,#244b63 0%, #38708a 36%, #79b0c2 58%)",
    sunGlow: "radial-gradient(circle at 50% 80%, rgba(200,235,245,.7), rgba(200,235,245,0) 40%)",
    sea: "linear-gradient(180deg,#2a7d92 0%, #1c5d72 34%, #11455a 72%, #0a3040 100%)",
    reflection: "rgba(210,240,250,.45)",
    turbines: LAY_DEEP, showSubstation: true, showFleet: true, pier: false, realImg: "jackup.jpg",
  },
  {
    id: "storm_sea",
    name: { zh: "風暴海域 · 停航", en: "Storm Sea" },
    sky: "linear-gradient(180deg,#2b3340 0%, #46505e 40%, #6b7480 62%)",
    sunGlow: "radial-gradient(circle at 60% 30%, rgba(180,190,200,.4), rgba(180,190,200,0) 45%)",
    sea: "linear-gradient(180deg,#37434e 0%, #28323b 38%, #1a2329 72%, #0f1519 100%)",
    reflection: "rgba(160,175,185,.3)",
    turbines: LAY_STORM, showSubstation: false, showFleet: false, pier: false, realImg: "storm.jpg",
  },
];

export const sceneById = (id: string): SceneTheme => SCENES.find((s) => s.id === id) ?? SCENES[0];

const KEY = "wfg-scene";
export function getSceneId(): string {
  try {
    return localStorage.getItem(KEY) || SCENES[0].id;
  } catch {
    return SCENES[0].id;
  }
}
export function setSceneId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // 忽略
  }
}

// 模擬/實境模式（#32）
const MODE_KEY = "wfg-realistic";
export function getRealistic(): boolean {
  try {
    return localStorage.getItem(MODE_KEY) === "1";
  } catch {
    return false;
  }
}
export function setRealistic(v: boolean): void {
  try {
    localStorage.setItem(MODE_KEY, v ? "1" : "0");
  } catch {
    // 忽略
  }
}
