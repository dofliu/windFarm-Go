// 內容資料的 TypeScript 型別（對應 content/SCHEMA.md）
export interface I18n {
  zh: string;
  en: string;
}

export type Lang = "zh" | "en";

export type Category = "mechanical" | "electrical" | "structural" | "control";

export interface Fault {
  id: string;
  name: I18n;
  category: Category;
  severity: number; // = 修復所需總量（這裡以 100 為滿）
  alarm_code: string;
  scada_hint: I18n; // SCADA 趨勢工具揭露的線索
  root_cause: string;
  root_cause_label: I18n; // 真因的可讀名稱（維修報告顯示）
  weakness_tool: string; // 命中弱點、揭露真因的診斷工具
  correct_sop: string;
  distractors: string[];
  region: string;
  knowledge_point: string;
  knowledge_tip: I18n; // 維修報告「學到了」內容
  reward: { exp: number; budget: number; unlock?: string };
}

export type ToolType = "physical" | "diagnostic" | "ai_skill";

export interface Tool {
  id: string;
  name: I18n;
  type: ToolType;
  power: number;
  mp_cost?: number;
  reveals_category?: Category;
  uses_per_battle?: number;
  requires?: string[];
  desc: I18n;
}

export interface SOP {
  id: string;
  name: I18n;
  target_fault: string;
  steps: I18n[];
  damage: number;
}

export interface Quest {
  id: string;
  title: I18n;
  giver: string;
  brief: I18n;
  objectives: I18n[];
  target_fault: string;
  weather_window: number;
  reward: { exp: number; budget: number; unlock?: string };
}

export interface Dialogue {
  id: string;
  speaker: I18n;
  lines: I18n[];
  triggers?: string; // 觸發的 quest id
}

export interface Region {
  id: string;
  name: I18n;
  foundation: string;
  weather: string[];
  difficulty: number;
  act: number;
}

export interface PackManifest {
  id: string;
  name: I18n;
  version: string;
  act: number;
  requires: string[];
  provides: string[];
  entry_quest: string;
  files: string[];
}

export interface WorldNode {
  name: I18n;
  type: "port" | "region";
  target: string; // 抵達後進入的 Phaser 場景 key
  region?: string;
}

// 合併所有 pack 後的內容註冊表
export interface ContentRegistry {
  faults: Record<string, Fault>;
  tools: Record<string, Tool>;
  sops: Record<string, SOP>;
  quests: Record<string, Quest>;
  dialogues: Record<string, Dialogue>;
  regions: Record<string, Region>;
  world: Record<string, WorldNode>;
  packs: PackManifest[];
}
