import type { I18n } from "../game/systems/types";
import type { Discipline } from "./game";

// 活體戰情層的故障型錄（Phase C）：有界的隨機事件池——每台機組隨機抽一種，
// 各帳號/各局面對的故障組合不同但難度相近（對應回饋 #3b 在即時營運層的落實）。
export interface IncidentType {
  id: string;
  name: I18n;
  discipline: Discipline; // 需對應科別技師才能派工
  repairDays: number; // 修復所需工日（決定停機時間 → 發電損失，回饋 #4）
  resettable?: boolean; // 軟性故障：可遠端重啟清除（免技師、較快），否則需派工
}

export const INCIDENTS: IncidentType[] = [
  { id: "gearbox", name: { zh: "齒輪箱過熱", en: "Gearbox overheat" }, discipline: "mechanical", repairDays: 2 },
  { id: "bearing", name: { zh: "主軸承振動", en: "Main-bearing vibration" }, discipline: "mechanical", repairDays: 3 },
  { id: "yaw", name: { zh: "偏航失準", en: "Yaw misalignment" }, discipline: "control", repairDays: 1, resettable: true },
  { id: "pitch", name: { zh: "變槳故障", en: "Pitch fault" }, discipline: "control", repairDays: 2 },
  { id: "converter", name: { zh: "變流器跳脫", en: "Converter trip" }, discipline: "electrical", repairDays: 1, resettable: true },
  { id: "sensor", name: { zh: "感測器誤報", en: "Sensor false alarm" }, discipline: "control", repairDays: 1, resettable: true },
  { id: "cable", name: { zh: "海纜絕緣告警", en: "Cable insulation alarm" }, discipline: "electrical", repairDays: 2 },
  { id: "blade", name: { zh: "葉片損傷", en: "Blade damage" }, discipline: "structural", repairDays: 2 },
];

export const incidentAt = (id: string | undefined): IncidentType | undefined => INCIDENTS.find((x) => x.id === id);
export const randomIncidentId = (): string => INCIDENTS[Math.floor(Math.random() * INCIDENTS.length)].id;
