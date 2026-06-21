import type { I18n } from "../game/systems/types";
import type { Quest, Discipline } from "../state/game";

// 故障題庫（B1/B2）：每個故障 = SCADA 告警 + 診斷測驗 + SOP 步驟
export interface Fault {
  id: string;
  name: I18n; // 主告警名稱
  severityTemp: I18n; // 紅色嚴重告警文字
  warns: [I18n, I18n]; // 兩個琥珀警戒 chip
  quiz: { question: I18n; options: I18n[]; correct: number; ok: I18n; no: I18n };
  sop: I18n[]; // 5 步驟（前兩步預設完成）
  knowledge_point: string;
  part: string; // 完成維修所需的必備備品 id（對應 data.ts PARTS）
  discipline: Discipline; // 需對應科別的技師（#27）
}

export const FAULTS: Record<string, Fault> = {
  gearbox_overheat: {
    id: "gearbox_overheat",
    name: { zh: "齒輪箱油溫過高", en: "Gearbox oil overheat" },
    severityTemp: { zh: "齒輪箱油溫過高 78°C", en: "Gearbox oil temp 78°C" },
    warns: [
      { zh: "警戒 · 發電機振動", en: "Warn · Gen vibration" },
      { zh: "警戒 · 濾芯壓差", en: "Warn · Filter ΔP" },
    ],
    quiz: {
      question: { zh: "齒輪箱油溫持續升高，下列何者應「最先」排查？", en: "Gearbox oil temp keeps rising — what should you check FIRST?" },
      options: [
        { zh: "A. 變槳軸承潤滑脂量", en: "A. Pitch bearing grease level" },
        { zh: "B. 潤滑油油位與油質", en: "B. Lube oil level & condition" },
        { zh: "C. 塔筒地腳螺栓扭力", en: "C. Tower foundation bolt torque" },
        { zh: "D. 偏航煞車片間隙", en: "D. Yaw brake pad clearance" },
      ],
      correct: 1,
      ok: { zh: "✓ 正確！油位過低或油質劣化使潤滑與散熱下降，是首要排查項。", en: "✓ Correct! Low level / degraded oil reduces lubrication & cooling — check first." },
      no: { zh: "✗ 再想想：齒輪箱油溫異常，應先從潤滑與散熱系統著手。", en: "✗ Think again: for gearbox overheat, start with lubrication & cooling." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查潤滑油位與油質", en: "Check lube oil level & quality" },
      { zh: "更換濾芯並補充齒輪油", en: "Replace filter & top up gear oil" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "gearbox_thermal",
    part: "gearbox_oil",
    discipline: "mechanical",
  },
  yaw_misalign: {
    id: "yaw_misalign",
    name: { zh: "偏航失準告警", en: "Yaw misalignment" },
    severityTemp: { zh: "偏航位置偏差 +12°", en: "Yaw position error +12°" },
    warns: [
      { zh: "警戒 · 偏航電機電流高", en: "Warn · Yaw motor current" },
      { zh: "警戒 · 風向標跳動", en: "Warn · Vane jitter" },
    ],
    quiz: {
      question: { zh: "風機無法迎風、偏航回授偏差，最可能原因為？", en: "Turbine won't face wind, yaw feedback off — most likely cause?" },
      options: [
        { zh: "A. 偏航煞車未完全釋放", en: "A. Yaw brake not fully released" },
        { zh: "B. 葉片表面結冰", en: "B. Blade surface icing" },
        { zh: "C. 變流器過溫", en: "C. Converter overtemp" },
        { zh: "D. 塔筒螺栓鬆動", en: "D. Loose tower bolts" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！煞車未釋放使齒盤卡滯，回授與指令產生偏差。", en: "✓ Correct! An unreleased brake jams the ring gear, causing the deviation." },
      no: { zh: "✗ 偏航回授偏差，應先檢查偏航煞車與齒盤定位。", en: "✗ For yaw deviation, check the yaw brake & ring-gear alignment first." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "確認偏航煞車液壓完全洩除", en: "Confirm yaw brake hydraulic released" },
      { zh: "釋放卡滯煞車片並潤滑齒盤", en: "Free stuck pads & lube ring gear" },
      { zh: "複歸定位並回報 SCADA", en: "Re-home position & report to SCADA" },
    ],
    knowledge_point: "yaw_brake",
    part: "yaw_motor",
    discipline: "control",
  },
  gen_vibration: {
    id: "gen_vibration",
    name: { zh: "發電機振動異常", en: "Generator vibration" },
    severityTemp: { zh: "發電機振動 RMS 超標", en: "Generator vibration RMS high" },
    warns: [
      { zh: "警戒 · 軸承溫度上升", en: "Warn · Bearing temp rising" },
      { zh: "警戒 · 噪音增加", en: "Warn · Noise up" },
    ],
    quiz: {
      question: { zh: "發電機振動 FFT 在 BPFI 特徵頻率出現突波，指向？", en: "Vibration FFT spikes at BPFI frequency — indicates?" },
      options: [
        { zh: "A. 軸承內環故障", en: "A. Bearing inner-race fault" },
        { zh: "B. 葉片不平衡", en: "B. Blade imbalance" },
        { zh: "C. 電網諧波", en: "C. Grid harmonics" },
        { zh: "D. 偏航誤動作", en: "D. Yaw malfunction" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！BPFI 特徵頻率突波是軸承內環故障的典型指紋。", en: "✓ Correct! A BPFI spike is the classic signature of an inner-race fault." },
      no: { zh: "✗ BPFI = Ball Pass Frequency Inner，對應軸承內環。", en: "✗ BPFI = Ball Pass Frequency Inner — it maps to the bearing inner race." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "採集振動頻譜定位故障軸承", en: "Capture vibration spectrum to locate bearing" },
      { zh: "更換軸承並校正對心", en: "Replace bearing & re-align" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "vibration_bpfi",
    part: "pitch_bearing",
    discipline: "mechanical",
  },
  pitch_fault: {
    id: "pitch_fault",
    name: { zh: "變槳系統故障", en: "Pitch system fault" },
    severityTemp: { zh: "變槳無法作動", en: "Pitch inoperative" },
    warns: [
      { zh: "警戒 · 後備電池電壓低", en: "Warn · Backup battery low" },
      { zh: "警戒 · 轉速偏高", en: "Warn · Overspeed" },
    ],
    quiz: {
      question: { zh: "強風下變槳無法順槳停機，最該優先確認？", en: "Pitch can't feather to stop in high wind — check first?" },
      options: [
        { zh: "A. 變槳後備電池/超級電容", en: "A. Pitch backup battery / supercap" },
        { zh: "B. 海纜接頭", en: "B. Subsea cable joint" },
        { zh: "C. 齒輪箱油位", en: "C. Gearbox oil level" },
        { zh: "D. 偏航電機", en: "D. Yaw motor" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！失電時靠後備電源順槳，電池失效將無法安全停機。", en: "✓ Correct! Feathering relies on backup power; a dead battery prevents safe stop." },
      no: { zh: "✗ 變槳安全停機依賴後備電源，先查電池/超級電容。", en: "✗ Safe feathering depends on backup power — check the battery/supercap." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "量測變槳後備電池電壓", en: "Measure pitch backup battery voltage" },
      { zh: "更換電池模組並自檢", en: "Replace battery module & self-test" },
      { zh: "順槳測試並回報 SCADA", en: "Feather test & report to SCADA" },
    ],
    knowledge_point: "pitch_backup",
    part: "hydraulic_oil",
    discipline: "control",
  },
  converter_fault: {
    id: "converter_fault",
    name: { zh: "變流器過溫跳脫", en: "Converter overtemp trip" },
    severityTemp: { zh: "變流器 IGBT 過溫", en: "Converter IGBT overtemp" },
    warns: [
      { zh: "警戒 · 冷卻水流量低", en: "Warn · Coolant flow low" },
      { zh: "警戒 · 輸出功率受限", en: "Warn · Power curtailed" },
    ],
    quiz: {
      question: { zh: "變流器反覆過溫跳脫，最可能的根因？", en: "Converter repeatedly trips on overtemp — root cause?" },
      options: [
        { zh: "A. 冷卻系統流量不足/堵塞", en: "A. Cooling flow insufficient / blocked" },
        { zh: "B. 葉片裂紋", en: "B. Blade crack" },
        { zh: "C. 偏航齒盤磨損", en: "C. Yaw gear wear" },
        { zh: "D. 風速計故障", en: "D. Anemometer fault" },
      ],
      correct: 0,
      ok: { zh: "✓ 正確！IGBT 過溫多源於冷卻流量不足或散熱阻塞。", en: "✓ Correct! IGBT overtemp usually stems from low coolant flow or blocked cooling." },
      no: { zh: "✗ 變流器過溫先查冷卻系統流量與散熱。", en: "✗ For converter overtemp, check the cooling flow & heat path first." },
    },
    sop: [
      { zh: "確認天氣作業窗", en: "Confirm weather window" },
      { zh: "登塔前 LOTO 能量隔離上鎖", en: "LOTO energy isolation before climb" },
      { zh: "檢查冷卻泵與管路流量", en: "Check coolant pump & loop flow" },
      { zh: "清理散熱器/更換濾網", en: "Clean radiator / replace filter" },
      { zh: "復歸測試並回報 SCADA", en: "Reset test & report to SCADA" },
    ],
    knowledge_point: "converter_cooling",
    part: "converter",
    discipline: "electrical",
  },
};

// 作業地點（#33）：故障 → 維修場景。資料驅動，可擴充更多場景。
export type RepairLocation = "nacelle" | "hub" | "tower" | "deck";
export const LOCATION_LABEL: Record<RepairLocation, I18n> = {
  nacelle: { zh: "機艙內", en: "Nacelle" },
  hub: { zh: "輪轂/葉根", en: "Hub" },
  tower: { zh: "塔架內", en: "Tower" },
  deck: { zh: "甲板/基礎", en: "Deck" },
};
export const FAULT_LOCATION: Record<string, RepairLocation> = {
  gearbox_overheat: "nacelle",
  yaw_misalign: "nacelle",
  gen_vibration: "nacelle",
  pitch_fault: "hub",
  converter_fault: "tower",
};
export const locationOf = (faultId: string): RepairLocation => FAULT_LOCATION[faultId] ?? "nacelle";

// 工單池（#4）：每筆工單對應一種故障，完成後輪替到下一筆。
export const QUEST_POOL: Quest[] = [
  {
    id: "q_ch12",
    title: { zh: "齒輪箱搶修 · CH-12 號機組", en: "Gearbox repair · CH-12" },
    brief: { zh: "前往「彰化外海・CH-12」，於浪高 1.5m 內排除齒輪箱過熱告警並回報 SCADA。", en: "Sail to Changhua CH-12; clear the gearbox overheat alarm within 1.5m wave height." },
    unit: "CH-12", targetFault: "gearbox_overheat", rewardBudget: 180_000, rewardXp: 120,
  },
  {
    id: "q_ch07",
    title: { zh: "偏航校正 · CH-07 號機組", en: "Yaw service · CH-07" },
    brief: { zh: "CH-07 偏航失準、無法迎風，登塔排除並複歸定位。", en: "CH-07 yaw misaligned; restore homing and report." },
    unit: "CH-07", targetFault: "yaw_misalign", rewardBudget: 160_000, rewardXp: 110,
  },
  {
    id: "q_ch21",
    title: { zh: "發電機診斷 · CH-21 號機組", en: "Generator check · CH-21" },
    brief: { zh: "CH-21 發電機振動超標，採頻譜定位並更換軸承。", en: "CH-21 generator vibration high; locate via spectrum and replace bearing." },
    unit: "CH-21", targetFault: "gen_vibration", rewardBudget: 200_000, rewardXp: 140,
  },
  {
    id: "q_ch03",
    title: { zh: "變槳檢修 · CH-03 號機組", en: "Pitch service · CH-03" },
    brief: { zh: "CH-03 強風下無法順槳，檢查後備電源並排除。", en: "CH-03 can't feather in high wind; check backup power." },
    unit: "CH-03", targetFault: "pitch_fault", rewardBudget: 190_000, rewardXp: 130,
  },
  {
    id: "q_ch18",
    title: { zh: "變流器搶修 · CH-18 號機組", en: "Converter repair · CH-18" },
    brief: { zh: "CH-18 變流器反覆過溫跳脫，檢查冷卻系統。", en: "CH-18 converter trips on overtemp; inspect cooling." },
    unit: "CH-18", targetFault: "converter_fault", rewardBudget: 175_000, rewardXp: 125,
  },
];

export const questAt = (i: number): Quest => QUEST_POOL[i % QUEST_POOL.length];
