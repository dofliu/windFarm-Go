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
  minTier?: number; // 解鎖層級（#76 Tier）：≤ 當前 tier 才會進入隨機池。預設 1（入門即有）
}

// 故障型錄依「運維層級 Tier」分層（#76）：入門只見耗材級/可重啟軟故障，規模擴大才解鎖中/大組件。
// Tier 1：軟性可重啟 + 耗材級小修（感測器/偏航/風速計/發電機過溫/碳刷/齒輪箱補油）
// Tier 2：中組件（變槳/變流器/偏航齒盤/液壓/控制器/變壓器/葉片侵蝕/塔栓/升降機）+ 結構/HSE 科別
// Tier 3：較大組件（主軸承振動/海纜/IGBT）
// Tier 4：最大組件更換（葉片/主軸承磨耗）
export const INCIDENTS: IncidentType[] = [
  { id: "gearbox", name: { zh: "齒輪箱過熱", en: "Gearbox overheat" }, discipline: "mechanical", repairDays: 2, part: "gearbox_oil", weight: 5, minTier: 1 },
  { id: "sensor", name: { zh: "感測器誤報", en: "Sensor false alarm" }, discipline: "control", repairDays: 1, resettable: true, part: "anemometer", weight: 5, minTier: 1 }, // 修:原誤用發電機碳刷,感測器工單應耗感測器備品
  { id: "pitch", name: { zh: "變槳故障", en: "Pitch fault" }, discipline: "control", repairDays: 2, part: "pitch_battery", weight: 4, minTier: 2 }, // 修:控制側變槳故障耗後備電池;液壓根因由 pitch_hyd(hydraulic_valve)負責
  { id: "yaw", name: { zh: "偏航失準", en: "Yaw misalignment" }, discipline: "control", repairDays: 1, resettable: true, part: "yaw_motor", weight: 4, minTier: 1 },
  { id: "converter", name: { zh: "變流器跳脫", en: "Converter trip" }, discipline: "electrical", repairDays: 1, resettable: true, part: "converter", weight: 3, minTier: 2 },
  { id: "bearing", name: { zh: "主軸承振動", en: "Main-bearing vibration" }, discipline: "mechanical", repairDays: 3, part: "pitch_bearing", weight: 2, minTier: 3 },
  { id: "cable", name: { zh: "海纜絕緣告警", en: "Cable insulation alarm" }, discipline: "electrical", repairDays: 2, part: "cable_joint", weight: 2, minTier: 3 },
  { id: "blade", name: { zh: "葉片損傷", en: "Blade damage" }, discipline: "structural", repairDays: 2, part: "gfrp_blade", weight: 1, minTier: 4 },
  // ── 擴充故障池（對應更多元的備品/科別；維持「耗材常見、大型罕見」的真實分布）──
  { id: "yaw_gear", name: { zh: "偏航齒盤磨損", en: "Yaw gear wear" }, discipline: "mechanical", repairDays: 2, part: "yaw_gear", weight: 3, minTier: 2 },
  { id: "pitch_hyd", name: { zh: "變槳液壓洩漏", en: "Pitch hydraulic leak" }, discipline: "mechanical", repairDays: 2, part: "hydraulic_valve", weight: 3, minTier: 2 },
  { id: "anemometer", name: { zh: "風速計故障", en: "Anemometer fault" }, discipline: "control", repairDays: 1, resettable: true, part: "anemometer", weight: 4, minTier: 1 },
  { id: "controller", name: { zh: "控制器通訊中斷", en: "Controller comms loss" }, discipline: "control", repairDays: 1, resettable: true, part: "main_controller", weight: 2, minTier: 2 },
  { id: "gen_overtemp", name: { zh: "發電機過溫", en: "Generator overtemp" }, discipline: "electrical", repairDays: 1, resettable: true, part: "coolant", weight: 3, minTier: 1 },
  { id: "brush", name: { zh: "碳刷/集電環異常", en: "Brush / slip-ring fault" }, discipline: "electrical", repairDays: 1, part: "gen_brush", weight: 4, minTier: 1 },
  { id: "igbt", name: { zh: "IGBT 模組故障", en: "IGBT module fault" }, discipline: "electrical", repairDays: 2, part: "igbt_module", weight: 2, minTier: 3 },
  { id: "transformer", name: { zh: "變壓器過溫", en: "Transformer overtemp" }, discipline: "electrical", repairDays: 2, part: "transformer_oil", weight: 2, minTier: 2 },
  { id: "blade_erosion", name: { zh: "葉片前緣侵蝕", en: "Blade leading-edge erosion" }, discipline: "structural", repairDays: 1, part: "leading_edge_tape", weight: 3, minTier: 2 },
  { id: "tower_bolt", name: { zh: "塔基螺栓鬆動", en: "Tower bolt loosening" }, discipline: "structural", repairDays: 2, part: "bolt_m36", weight: 2, minTier: 2 },
  { id: "lift", name: { zh: "升降機/安全系統", en: "Service lift fault" }, discipline: "hse", repairDays: 1, part: "lift_part", weight: 2, minTier: 2 },
  { id: "main_bearing", name: { zh: "主軸承磨耗", en: "Main-bearing wear" }, discipline: "mechanical", repairDays: 3, part: "main_bearing", weight: 1, minTier: 4 },
  // ── #82 分層擴充:基礎防蝕(結構/Tier2)、變壓器套管(電氣/Tier3)、海纜接頭過熱(電氣/Tier3) ──
  { id: "corrosion", name: { zh: "基礎/塔基防蝕劣化", en: "Foundation corrosion" }, discipline: "structural", repairDays: 2, part: "corrosion_anode", weight: 2, minTier: 2 },
  { id: "bushing", name: { zh: "變壓器套管劣化", en: "Transformer bushing fault" }, discipline: "electrical", repairDays: 2, part: "transformer_bushing", weight: 1, minTier: 3 },
  { id: "cable_joint_heat", name: { zh: "海纜接頭過熱", en: "Cable joint overheat" }, discipline: "electrical", repairDays: 2, part: "cable_joint", weight: 1, minTier: 3 },
  // ── #2 HSE 科別加厚:工安情境(LOTO/墜落防護/SIMOPS)。需 HSE 技師,屬程序處置(repairDays 短) ──
  { id: "loto", name: { zh: "能量隔離(LOTO)缺失", en: "LOTO isolation gap" }, discipline: "hse", repairDays: 1, part: "loto_kit", weight: 2, minTier: 2 },
  { id: "fall", name: { zh: "高處墜落防護失效", en: "Fall-protection failure" }, discipline: "hse", repairDays: 1, part: "fall_arrest_kit", weight: 2, minTier: 2 },
  { id: "simops", name: { zh: "SIMOPS 同時作業衝突", en: "SIMOPS conflict" }, discipline: "hse", repairDays: 1, part: "comms_radio", weight: 1, minTier: 2 },
];

export const incidentAt = (id: string | undefined): IncidentType | undefined => INCIDENTS.find((x) => x.id === id);
// 取 ≤ tier 的故障子池（#76）：入門池小而簡單，規模擴大才解鎖更多
export const incidentsForTier = (tier: number): IncidentType[] => INCIDENTS.filter((x) => (x.minTier ?? 1) <= tier);
// 依權重隨機抽一種故障：耗材級常見、大型組件罕見；限縮在 ≤ tier 的子池（預設全開，相容舊呼叫）
export const randomIncidentId = (tier = 99): string => {
  const pool = incidentsForTier(tier);
  const list = pool.length ? pool : INCIDENTS;
  const total = list.reduce((a, x) => a + x.weight, 0);
  let r = Math.random() * total;
  for (const x of list) { r -= x.weight; if (r <= 0) return x.id; }
  return list[0].id;
};
