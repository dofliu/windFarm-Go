import type { I18n } from "../game/systems/types";

// 多風場（#34）：初期只營運第一座，達門檻可拓展更多風場（不同海域/背景）。
// 每多一座運轉中的風場 → 每日額外發電（KPI 誘因）；資料驅動，新增風場加一筆即可。
export interface Farm {
  id: string;
  name: I18n;
  code: string; // 機組編號前綴（如 "CH-"），用於戰情室機組命名（Phase C）
  units: number; // 機組數量（Phase C 活體戰情層）
  sceneId: string; // 對應 ui/scenes.ts 的背景主題
  unlockCost: number; // ◎；第一座為 0（預設擁有）
  unlockDay: number; // 需達到的最少天數（資歷門檻）
  genPerDay: number; // 此風場每日基準發電 (MWh, 100% 可用率)
}

export const FARMS: Farm[] = [
  { id: "changhua", name: { zh: "彰化外海風場", en: "Changhua Offshore" }, code: "CH-", units: 24, sceneId: "changhua_dawn", unlockCost: 0, unlockDay: 0, genPerDay: 120 },
  { id: "yunlin", name: { zh: "雲林外海風場", en: "Yunlin Offshore" }, code: "YL-", units: 24, sceneId: "noon_azure", unlockCost: 60_000_000, unlockDay: 30, genPerDay: 150 },
  { id: "miaoli", name: { zh: "苗栗外海風場", en: "Miaoli Offshore" }, code: "ML-", units: 24, sceneId: "dusk_violet", unlockCost: 120_000_000, unlockDay: 45, genPerDay: 180 },
  { id: "penghu", name: { zh: "澎湖深海風場", en: "Penghu Deep-sea" }, code: "PH-", units: 24, sceneId: "deepsea_oss", unlockCost: 220_000_000, unlockDay: 60, genPerDay: 220 },
];

export const farmAt = (i: number): Farm => FARMS[Math.min(i, FARMS.length - 1)];
