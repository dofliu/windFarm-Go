import type { I18n } from "../game/systems/types";
import type { Discipline } from "./game";

// 活體戰情層的故障型錄（Phase C）：有界的隨機事件池——每台機組隨機抽一種，
// 各帳號/各局面對的故障組合不同但難度相近（對應回饋 #3b 在即時營運層的落實）。
export interface IncidentType {
  id: string;
  name: I18n;
  discipline: Discipline; // 需對應科別技師才能派工
  repairDays: number; // 修復所需工日（決定停機時間 → 發電損失，回饋 #4）
  resettable?: boolean; // 軟性故障：可遠端重啟清除（免技師、較快、免備品），否則需派工
  part: string; // 派工維修需消耗的備品 id（對應 data.ts；接上真實備品價格）
  weight: number; // 隨機抽樣權重：耗材級常見、大型組件罕見（真實 O&M 分布）
}

export const INCIDENTS: IncidentType[] = [
  { id: "gearbox", name: { zh: "齒輪箱過熱", en: "Gearbox overheat" }, discipline: "mechanical", repairDays: 2, part: "gearbox_oil", weight: 5 },
  { id: "sensor", name: { zh: "感測器誤報", en: "Sensor false alarm" }, discipline: "control", repairDays: 1, resettable: true, part: "gen_brush", weight: 5 },
  { id: "pitch", name: { zh: "變槳故障", en: "Pitch fault" }, discipline: "control", repairDays: 2, part: "hydraulic_oil", weight: 4 },
  { id: "yaw", name: { zh: "偏航失準", en: "Yaw misalignment" }, discipline: "control", repairDays: 1, resettable: true, part: "yaw_motor", weight: 4 },
  { id: "converter", name: { zh: "變流器跳脫", en: "Converter trip" }, discipline: "electrical", repairDays: 1, resettable: true, part: "converter", weight: 3 },
  { id: "bearing", name: { zh: "主軸承振動", en: "Main-bearing vibration" }, discipline: "mechanical", repairDays: 3, part: "pitch_bearing", weight: 2 },
  { id: "cable", name: { zh: "海纜絕緣告警", en: "Cable insulation alarm" }, discipline: "electrical", repairDays: 2, part: "cable_joint", weight: 2 },
  { id: "blade", name: { zh: "葉片損傷", en: "Blade damage" }, discipline: "structural", repairDays: 2, part: "gfrp_blade", weight: 1 },
];

const TOTAL_WEIGHT = INCIDENTS.reduce((a, x) => a + x.weight, 0);
export const incidentAt = (id: string | undefined): IncidentType | undefined => INCIDENTS.find((x) => x.id === id);
// 依權重隨機抽一種故障：耗材級常見、大型組件罕見
export const randomIncidentId = (): string => {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const x of INCIDENTS) { r -= x.weight; if (r <= 0) return x.id; }
  return INCIDENTS[0].id;
};
