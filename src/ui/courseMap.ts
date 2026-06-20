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
];
