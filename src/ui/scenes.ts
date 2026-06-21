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

// 可切換的海域背景主題（#32）：資料驅動，新增主題只要加一筆。
export interface SceneTheme {
  id: string;
  name: I18n;
  sky: string; // 天空漸層
  sunGlow: string; // 陽光/光暈 radial-gradient
  sea: string; // 海面漸層
  reflection: string; // 海面反光色
  turbines: TurbineCfg[]; // 風機配置
  showSubstation: boolean; // 海上變電站 OSS
  showFleet: boolean; // 遠方船隊
  pier: boolean; // 前景碼頭
}

const ROW_A: TurbineCfg[] = [
  { left: "16%", bottom: "45.5%", opacity: 0.32, scale: 0.75, spin: 13, base: 10 },
  { left: "33%", bottom: "46%", opacity: 0.45, scale: 0.95, spin: 11, base: 40 },
  { left: "51%", bottom: "45.2%", opacity: 0.5, scale: 1.1, spin: 9, base: 0 },
  { left: "67%", bottom: "46.3%", opacity: 0.4, scale: 0.85, spin: 12, base: 20 },
  { left: "80%", bottom: "45.6%", opacity: 0.3, scale: 0.7, spin: 14, base: 60 },
];

// 較密集的機群（不同風場配置）
const ROW_DENSE: TurbineCfg[] = [
  { left: "10%", bottom: "45.4%", opacity: 0.28, scale: 0.62, spin: 14, base: 10 },
  { left: "23%", bottom: "46.2%", opacity: 0.4, scale: 0.82, spin: 11, base: 35 },
  { left: "37%", bottom: "45.3%", opacity: 0.5, scale: 1.0, spin: 9, base: 0 },
  { left: "50%", bottom: "46.4%", opacity: 0.46, scale: 0.9, spin: 10, base: 50 },
  { left: "63%", bottom: "45.2%", opacity: 0.52, scale: 1.08, spin: 8.5, base: 20 },
  { left: "77%", bottom: "46%", opacity: 0.38, scale: 0.8, spin: 12, base: 60 },
  { left: "88%", bottom: "45.5%", opacity: 0.28, scale: 0.64, spin: 13.5, base: 90 },
];

export const SCENES: SceneTheme[] = [
  {
    id: "changhua_dawn",
    name: { zh: "彰化外海 · 晨曦", en: "Changhua · Dawn" },
    sky: "linear-gradient(180deg,#9dc0d6 0%, #bcd2da 28%, #ddd5c1 50%, #f0e2c4 60%)",
    sunGlow: "radial-gradient(circle at 50% 88%, rgba(255,243,212,.95), rgba(255,243,212,0) 42%)",
    sea: "linear-gradient(180deg,#5e97a2 0%, #347683 32%, #1d5160 72%, #143f4c 100%)",
    reflection: "rgba(255,236,196,.5)",
    turbines: ROW_A,
    showSubstation: false,
    showFleet: false,
    pier: true,
  },
  {
    id: "noon_azure",
    name: { zh: "正午 · 湛藍", en: "Noon · Azure" },
    sky: "linear-gradient(180deg,#6fb6e8 0%, #9fd0ef 40%, #d3ecf7 60%)",
    sunGlow: "radial-gradient(circle at 50% 78%, rgba(255,255,255,.85), rgba(255,255,255,0) 38%)",
    sea: "linear-gradient(180deg,#2f9fc4 0%, #1f7fa8 34%, #145f86 72%, #0d4763 100%)",
    reflection: "rgba(220,245,255,.5)",
    turbines: ROW_DENSE,
    showSubstation: true,
    showFleet: true,
    pier: true,
  },
  {
    id: "dusk_violet",
    name: { zh: "黃昏 · 霞紫", en: "Dusk · Violet" },
    sky: "linear-gradient(180deg,#5b4b8a 0%, #9c5e9e 32%, #e08a8a 52%, #f3b27a 62%)",
    sunGlow: "radial-gradient(circle at 50% 86%, rgba(255,210,170,.9), rgba(255,170,150,0) 44%)",
    sea: "linear-gradient(180deg,#6a5b8f 0%, #3f5680 34%, #243f63 72%, #16263f 100%)",
    reflection: "rgba(255,200,160,.5)",
    turbines: ROW_A,
    showSubstation: true,
    showFleet: true,
    pier: true,
  },
  {
    id: "deepsea_oss",
    name: { zh: "深海風場 · 變電站", en: "Deep-sea · OSS" },
    sky: "linear-gradient(180deg,#244b63 0%, #38708a 36%, #79b0c2 58%)",
    sunGlow: "radial-gradient(circle at 50% 80%, rgba(200,235,245,.7), rgba(200,235,245,0) 40%)",
    sea: "linear-gradient(180deg,#2a7d92 0%, #1c5d72 34%, #11455a 72%, #0a3040 100%)",
    reflection: "rgba(210,240,250,.45)",
    turbines: ROW_DENSE,
    showSubstation: true,
    showFleet: true,
    pier: false,
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
