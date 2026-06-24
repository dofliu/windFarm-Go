import type { I18n } from "../game/systems/types";

// 課程對照層（#6，選用）：把現有故障的 knowledge_point 分到週次。
// 不綁死主流程——老師可在「課程模式」一鍵把某週的故障指派為下一筆工單。
export interface CourseWeek {
  week: number;
  title: I18n;
  knowledgePoints: string[];
  faultId: string; // 對應 faults.ts
}

export const COURSE_WEEKS: CourseWeek[] = [
  { week: 7, title: { zh: "振動診斷與軸承故障", en: "Vibration Diagnostics & Bearings" }, knowledgePoints: ["vibration_bpfi"], faultId: "gen_vibration" },
  { week: 9, title: { zh: "齒輪箱熱管理與潤滑", en: "Gearbox Thermal & Lubrication" }, knowledgePoints: ["gearbox_thermal"], faultId: "gearbox_overheat" },
  { week: 11, title: { zh: "偏航系統與定位", en: "Yaw System & Alignment" }, knowledgePoints: ["yaw_brake"], faultId: "yaw_misalign" },
  { week: 13, title: { zh: "變槳控制與安全停機", en: "Pitch Control & Safe Shutdown" }, knowledgePoints: ["pitch_backup"], faultId: "pitch_fault" },
  { week: 15, title: { zh: "變流器與電力電子", en: "Converter & Power Electronics" }, knowledgePoints: ["converter_cooling"], faultId: "converter_fault" },
  // ── 擴充週次：對應新增故障型錄（同元件不同根因、跨五大科別）──
  { week: 8, title: { zh: "傳動鏈磨耗診斷", en: "Drivetrain Wear Diagnostics" }, knowledgePoints: ["gearbox_wear"], faultId: "gearbox_bearing_wear" },
  { week: 10, title: { zh: "偏航齒盤與機械磨損", en: "Yaw Gear & Mechanical Wear" }, knowledgePoints: ["yaw_gear"], faultId: "yaw_gear_wear" },
  { week: 12, title: { zh: "發電機碳刷與集電環", en: "Generator Brush & Slip-ring" }, knowledgePoints: ["generator_brush"], faultId: "gen_brush_wear" },
  { week: 14, title: { zh: "發電機冷卻與過溫", en: "Generator Cooling & Overtemp" }, knowledgePoints: ["generator_cooling"], faultId: "gen_overtemp" },
  { week: 16, title: { zh: "變槳液壓系統", en: "Pitch Hydraulics" }, knowledgePoints: ["pitch_hydraulic"], faultId: "pitch_hydraulic_leak" },
  { week: 17, title: { zh: "功率模組 IGBT 故障", en: "IGBT Power Module Faults" }, knowledgePoints: ["converter_igbt"], faultId: "converter_igbt" },
  { week: 18, title: { zh: "葉片結構與裂紋", en: "Blade Structure & Cracks" }, knowledgePoints: ["blade_structure"], faultId: "blade_crack" },
  { week: 19, title: { zh: "葉片前緣侵蝕與修補", en: "Leading-edge Erosion & Repair" }, knowledgePoints: ["blade_erosion"], faultId: "blade_erosion" },
  { week: 20, title: { zh: "海纜絕緣與局部放電", en: "Cable Insulation & PD" }, knowledgePoints: ["cable_insulation"], faultId: "cable_insulation" },
  { week: 21, title: { zh: "塔架結構與螺栓預拉力", en: "Tower Structure & Bolt Preload" }, knowledgePoints: ["tower_bolt"], faultId: "tower_bolt_loose" },
  { week: 22, title: { zh: "氣象量測與感測器", en: "Met Sensors & Measurement" }, knowledgePoints: ["met_sensor"], faultId: "anemometer_fault" },
  { week: 23, title: { zh: "控制器與通訊", en: "Controller & Communications" }, knowledgePoints: ["controller_comm"], faultId: "controller_comm" },
  { week: 24, title: { zh: "機組變壓器熱管理", en: "Turbine Transformer Thermal" }, knowledgePoints: ["transformer_thermal"], faultId: "transformer_overtemp" },
  { week: 25, title: { zh: "塔內升降機與 HSE", en: "Service Lift & HSE" }, knowledgePoints: ["service_lift_hse"], faultId: "lift_fault" },
];
